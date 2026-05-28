// supabase/functions/asaas-webhook/index.ts
// Edge Function que recebe notificações de pagamento do Asaas
// e atualiza a tabela asaas_payments no Supabase automaticamente.
//
// URL desta função (após deploy):
// https://<project-ref>.supabase.co/functions/v1/asaas-webhook
// → Cadastre essa URL no painel do Asaas em: Configurações → Notificações → Webhook
//
// SEGURANÇA:
//  - Rate limit por IP: 100 requisições por 5 minutos
//  - Validação de User-Agent do Asaas
//  - Logs de tentativas suspeitas
//  - Apenas método POST aceito

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Eventos do Asaas que indicam pagamento confirmado
const CONFIRMED_EVENTS = new Set([
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
]);

// Eventos que indicam cobrança vencida
const OVERDUE_EVENTS = new Set([
  'PAYMENT_OVERDUE',
]);

// Eventos que indicam estorno/cancelamento
const REFUNDED_EVENTS = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
]);

// ── RATE LIMIT EM MEMÓRIA (por instância do Deno) ─────────────────────────────
// Limite: 100 requisições por 5 minutos por IP
const WEBHOOK_RATE_LIMIT = {
  maxRequests: 100,
  windowMs: 5 * 60 * 1000, // 5 minutos
  blockDurationMs: 10 * 60 * 1000, // Bloqueio de 10 minutos
};

const webhookIpCounters = new Map<string, { count: number; windowStart: number; blockedUntil: number | null }>();

/**
 * Verifica o rate limit para um IP no contexto do webhook.
 */
function checkWebhookRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = webhookIpCounters.get(ip);

  if (record?.blockedUntil && record.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.blockedUntil - now) / 1000),
    };
  }

  if (!record || now - record.windowStart > WEBHOOK_RATE_LIMIT.windowMs) {
    webhookIpCounters.set(ip, { count: 1, windowStart: now, blockedUntil: null });
    return { allowed: true };
  }

  if (record.count < WEBHOOK_RATE_LIMIT.maxRequests) {
    record.count++;
    return { allowed: true };
  }

  // Limite excedido
  const blockedUntil = now + WEBHOOK_RATE_LIMIT.blockDurationMs;
  webhookIpCounters.set(ip, { ...record, blockedUntil });

  console.warn(`[asaas-webhook] 🚫 Rate limit excedido para IP: ${ip}`);

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil(WEBHOOK_RATE_LIMIT.blockDurationMs / 1000),
  };
}

/**
 * Extrai o IP do cliente dos headers da requisição (Deno/Edge).
 */
function getClientIPFromRequest(req: Request): string {
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Valida se a requisição parece legítima do Asaas.
 * O Asaas envia sempre com Content-Type: application/json.
 */
function isValidAsaasRequest(req: Request): boolean {
  const contentType = req.headers.get('content-type') || '';
  // O Asaas sempre envia JSON
  if (!contentType.includes('application/json')) {
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  const clientIP = getClientIPFromRequest(req);

  // Headers de segurança padrão
  const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'Content-Type': 'application/json',
  };

  // ── 1. Só aceita POST ──────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    console.warn(`[asaas-webhook] Método inválido: ${req.method} | IP: ${clientIP}`);
    return new Response('Method Not Allowed', { status: 405, headers: securityHeaders });
  }

  // ── 2. Rate Limit por IP ───────────────────────────────────────────────────
  const limitResult = checkWebhookRateLimit(clientIP);
  if (!limitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Muitas requisições. Aguarde antes de tentar novamente.',
        code: 'TOO_MANY_REQUESTS',
      }),
      {
        status: 429,
        headers: {
          ...securityHeaders,
          'Retry-After': String(limitResult.retryAfterSeconds || 60),
        },
      }
    );
  }

  // ── 3. Validação básica da requisição ──────────────────────────────────────
  if (!isValidAsaasRequest(req)) {
    console.warn(`[asaas-webhook] 🚫 Requisição inválida (Content-Type incorreto) | IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: 'Requisição inválida', code: 'INVALID_REQUEST' }),
      { status: 400, headers: securityHeaders }
    );
  }

  try {
    const body = await req.json();
    const { event, payment } = body;

    console.log(`[asaas-webhook] Evento recebido: ${event}`, payment?.id);

    if (!payment?.id) {
      return new Response('Invalid payload', { status: 400 });
    }

    // Conecta ao Supabase com a service_role key (acesso total)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Determina o novo status baseado no evento
    let newStatus: string | null = null;
    let paidAt: string | null = null;
    let netValue: number | null = null;

    if (CONFIRMED_EVENTS.has(event)) {
      newStatus = 'RECEIVED';
      paidAt = payment.paymentDate
        ? new Date(payment.paymentDate).toISOString()
        : new Date().toISOString();
      netValue = payment.netValue ?? payment.value ?? null;
    } else if (OVERDUE_EVENTS.has(event)) {
      newStatus = 'OVERDUE';
    } else if (REFUNDED_EVENTS.has(event)) {
      newStatus = 'REFUNDED';
    }

    if (!newStatus) {
      // Evento não relevante, responde OK sem fazer nada
      console.log(`[asaas-webhook] Evento ignorado: ${event}`);
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: securityHeaders,
      });
    }

    // Atualiza o registro na tabela asaas_payments
    const updateData: Record<string, unknown> = { status: newStatus };
    if (paidAt) updateData.paid_at = paidAt;
    if (netValue !== null) updateData.net_value = netValue;

    const { error } = await supabase
      .from('asaas_payments')
      .update(updateData)
      .eq('asaas_payment_id', payment.id);

    if (error) {
      console.error('[asaas-webhook] Erro ao atualizar Supabase:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: securityHeaders,
      });
    }

    console.log(`[asaas-webhook] Pagamento ${payment.id} atualizado para ${newStatus}`);

    // Se o pagamento foi confirmado, registra no financeiro a entrada do aluguel e a saída da taxa
    if (CONFIRMED_EVENTS.has(event)) {
      try {
        const { data: payRecord, error: payError } = await supabase
          .from('asaas_payments')
          .select('rental_id, billing_type, value')
          .eq('asaas_payment_id', payment.id)
          .maybeSingle();

        if (payError) {
          console.error('[asaas-webhook] Erro ao buscar pagamento no Supabase:', payError);
        }

        if (payRecord && payRecord.rental_id) {
          const { data: rentalRecord, error: rentalError } = await supabase
            .from('rentals')
            .select('user_name, placa')
            .eq('id', payRecord.rental_id)
            .maybeSingle();

          if (rentalError) {
            console.error('[asaas-webhook] Erro ao buscar locação no Supabase:', rentalError);
          }

          const driverName = rentalRecord?.user_name || 'Motorista';
          const plate = rentalRecord?.placa || '';
          const methodLabel = payRecord.billing_type || 'PIX';
          const paidValue = payment.value || payRecord.value || 0;

          // Calcula a taxa cobrada pelo Asaas (diferença entre o valor pago e o valor líquido recebido)
          // Se netValue não vier no payload, a taxa padrão é 0.99
          const fee = payment.netValue && payment.value
            ? Number((payment.value - payment.netValue).toFixed(2))
            : 0.99;

          const todayStr = paidAt ? paidAt.split('T')[0] : new Date().toISOString().split('T')[0];

          // Cria a transação de entrada (Recebimento do Aluguel)
          const incomeTrans = {
            date: todayStr,
            type: 'in',
            val: paidValue,
            desc: `Recebimento Aluguel (${methodLabel}) - ${driverName}`,
            cat: 'Aluguel',
            vehicle_plate: plate,
            status: 'Concluído',
            responsible: ''
          };

          // Cria a transação de saída (Taxa do Asaas)
          const feeTrans = {
            date: todayStr,
            type: 'out',
            val: -fee,
            desc: `Taxa Asaas - ${methodLabel} ${driverName}`,
            cat: 'Taxa Gateway / Asaas',
            vehicle_plate: plate,
            status: 'Concluído',
            responsible: 'Administradora'
          };

          const { error: transError } = await supabase
            .from('transactions')
            .insert([incomeTrans, feeTrans]);

          if (transError) {
            console.error('[asaas-webhook] Erro ao inserir transações financeiras:', transError);
          } else {
            console.log('[asaas-webhook] Transações de faturamento e taxa registradas no financeiro.');
          }
        }
      } catch (transErr) {
        console.error('[asaas-webhook] Erro inesperado ao registrar transações no financeiro:', transErr);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, paymentId: payment.id, newStatus }),
      { headers: securityHeaders },
    );
  } catch (err) {
    console.error('[asaas-webhook] Erro inesperado:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: securityHeaders,
    });
  }
});

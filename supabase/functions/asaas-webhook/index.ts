// supabase/functions/asaas-webhook/index.ts
// Edge Function que recebe notificações de pagamento do Asaas
// e atualiza a tabela asaas_payments no Supabase automaticamente.
//
// URL desta função (após deploy):
// https://<project-ref>.supabase.co/functions/v1/asaas-webhook
// → Cadastre essa URL no painel do Asaas em: Configurações → Notificações → Webhook

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

Deno.serve(async (req: Request) => {
  // Só aceita POST
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[asaas-webhook] Pagamento ${payment.id} atualizado para ${newStatus}`);

    return new Response(
      JSON.stringify({ ok: true, paymentId: payment.id, newStatus }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[asaas-webhook] Erro inesperado:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

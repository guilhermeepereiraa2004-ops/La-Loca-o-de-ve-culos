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

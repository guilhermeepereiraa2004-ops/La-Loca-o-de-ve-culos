/**
 * investorPayouts.js
 * Utilitário para gerenciar repasses aos investidores no Supabase.
 */

import { supabase } from '../lib/supabase.js';

const TABLE = 'investor_payouts';

/**
 * Registra um repasse realizado a um investidor.
 */
export async function registerPayout({ investorId, investorName, amount, referenceMonth, pixKey, notes }) {
  const { data, error } = await supabase.from(TABLE).insert({
    investor_id: String(investorId),
    investor_name: investorName,
    amount: parseFloat(amount.toFixed(2)),
    reference_month: referenceMonth, // formato "YYYY-MM"
    pix_key: pixKey || null,
    notes: notes || null,
  }).select().single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Busca o histórico de repasses de um investidor específico.
 */
export async function getPayoutsForInvestor(investorId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('investor_id', String(investorId))
    .order('paid_at', { ascending: false });

  if (error) {
    console.warn('[investorPayouts] Erro ao buscar histórico:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Verifica se já existe um repasse registrado para o mês de referência.
 * Útil para alertar o admin antes de duplicar.
 */
export async function hasPayoutForMonth(investorId, referenceMonth) {
  const { data } = await supabase
    .from(TABLE)
    .select('id')
    .eq('investor_id', String(investorId))
    .eq('reference_month', referenceMonth)
    .limit(1);

  return (data || []).length > 0;
}

/**
 * Retorna o mês de referência atual no formato "YYYY-MM".
 */
export function getCurrentReferenceMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Formata o mês de referência para exibição (ex: "2026-05" → "Maio/2026").
 */
export function formatReferenceMonth(refMonth) {
  if (!refMonth) return '—';
  const [year, month] = refMonth.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month) - 1]}/${year}`;
}

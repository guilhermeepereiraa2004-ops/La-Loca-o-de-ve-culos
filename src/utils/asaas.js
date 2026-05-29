/**
 * asaas.js
 * Utilitário de integração com a API do Asaas (Sandbox).
 * Todas as chamadas passam pelo proxy /api/asaas → sandbox.asaas.com/api/v3
 *
 * Após gerar uma cobrança, o registro é salvo na tabela `asaas_payments`
 * do Supabase. O webhook (Edge Function) atualiza o status automaticamente
 * quando o pagamento é confirmado pelo banco.
 */

import { supabase } from '../lib/supabase.js';

const BASE_URL = '/api/asaas';

// O $ é concatenado em JS porque o dotenv interpreta "$variavel" como variável de shell.
// No .env guardamos apenas a parte após o $, e aqui recompomos a chave completa.
const ASAAS_KEY = '$' + (import.meta.env.VITE_ASAAS_KEY_PREFIX || '');

const headers = {
  'Content-Type': 'application/json',
  'access_token': ASAAS_KEY,
};

/** Faz uma chamada genérica à API do Asaas */
async function asaasRequest(endpoint, method = 'GET', body = null) {
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data?.errors?.[0]?.description || data?.message || `Erro ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Salva o registro de uma cobrança gerada no Supabase.
 * Permite rastrear o status e vincular ao webhook.
 */
async function savePaymentRecord({ rentalId, payment, billingType, pixData = null }) {
  const record = {
    rental_id: String(rentalId),
    asaas_payment_id: payment.id,
    billing_type: billingType,
    value: payment.value,
    due_date: payment.dueDate,
    status: payment.status || 'PENDING',
    description: payment.description || null,
    bank_slip_url: payment.bankSlipUrl || null,
    identification_field: payment.identificationField || null,
    pix_payload: pixData?.payload || null,
    pix_encoded_image: pixData?.encodedImage || null,
  };

  const { error } = await supabase.from('asaas_payments').insert(record);
  if (error) {
    // Não quebra o fluxo principal — apenas loga o erro
    console.warn('[asaas] Aviso: não foi possível salvar o pagamento no Supabase:', error.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca um cliente no Asaas pelo CPF/CNPJ.
 * Retorna o objeto do cliente ou null se não encontrado.
 */
export async function findCustomerByCpf(cpfCnpj) {
  const cleanCpf = cpfCnpj.replace(/\D/g, '');
  const data = await asaasRequest(`/customers?cpfCnpj=${cleanCpf}`);
  return data.data?.[0] || null;
}

/**
 * Cria um novo cliente no Asaas.
 * @param {{ name: string, cpfCnpj: string, email?: string, phone?: string }} customer
 */
export async function createCustomer({ name, cpfCnpj, email, phone }) {
  const cleanCpf = cpfCnpj.replace(/\D/g, '');
  return asaasRequest('/customers', 'POST', {
    name,
    cpfCnpj: cleanCpf,
    email: email || undefined,
    mobilePhone: phone ? phone.replace(/\D/g, '') : undefined,
    notificationDisabled: false,
  });
}

/**
 * Busca ou cria um cliente no Asaas.
 * Retorna o ID do cliente garantido.
 */
export async function getOrCreateCustomer(customerData) {
  if (!customerData.cpfCnpj) {
    const created = await createCustomer(customerData);
    return created.id;
  }

  const existing = await findCustomerByCpf(customerData.cpfCnpj);
  if (existing) return existing.id;

  const created = await createCustomer(customerData);
  return created.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// COBRANÇAS (PAGAMENTOS)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera um boleto bancário no Asaas e salva o registro no Supabase.
 * @param {{ rentalId: string, customerId: string, value: number, dueDate: string, description?: string }} params
 */
export async function createBoleto({ rentalId, customerId, value, dueDate, description }) {
  const payment = await asaasRequest('/payments', 'POST', {
    customer: customerId,
    billingType: 'BOLETO',
    value,
    dueDate,
    description: description || 'Locação de Veículo - L.A Locação',
    externalReference: `la-locacao-${Date.now()}`,
    fine: { value: 10.0, type: 'PERCENTAGE' },
    interest: { value: 1.0, type: 'PERCENTAGE' },
  });

  // Salva no Supabase para rastreamento
  await savePaymentRecord({ rentalId, payment, billingType: 'BOLETO' });

  return payment;
}

/**
 * Gera um Pix copia-e-cola no Asaas e salva o registro no Supabase.
 * @param {{ rentalId: string, customerId: string, value: number, dueDate: string, description?: string }} params
 */
export async function createPix({ rentalId, customerId, value, dueDate, description }) {
  const payment = await asaasRequest('/payments', 'POST', {
    customer: customerId,
    billingType: 'PIX',
    value,
    dueDate,
    description: description || 'Locação de Veículo - L.A Locação',
    externalReference: `la-locacao-pix-${Date.now()}`,
    fine: { value: 10.0, type: 'PERCENTAGE' },
    interest: { value: 1.0, type: 'PERCENTAGE' },
  });

  // Busca o QR Code e salva tudo junto no Supabase
  let pixData = null;
  try {
    pixData = await getPixQrCode(payment.id);
  } catch (e) {
    console.warn('[asaas] Não foi possível buscar QR Code Pix:', e.message);
  }

  await savePaymentRecord({ rentalId, payment, billingType: 'PIX', pixData });

  return { ...payment, ...(pixData || {}) };
}

/**
 * Busca o QR Code Pix de um pagamento já criado.
 * @param {string} paymentId
 */
export async function getPixQrCode(paymentId) {
  return asaasRequest(`/payments/${paymentId}/pixQrCode`);
}

/**
 * Busca todos os pagamentos de um contrato específico no Supabase.
 * @param {string} rentalId
 */
export async function getPaymentsForRental(rentalId) {
  const { data, error } = await supabase
    .from('asaas_payments')
    .select('*')
    .eq('rental_id', String(rentalId))
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[asaas] Erro ao buscar pagamentos:', error.message);
    return [];
  }
  return data || [];
}

/**
 * Calcula a próxima data de vencimento baseada no dia da semana do contrato.
 *
 * Exemplo: se o contrato começou numa Segunda-feira, pagamentos são sempre
 * às Segundas. Não importa quando o admin clicar — o boleto sempre vence
 * na próxima Segunda correta do ciclo.
 *
 * @param {string} startDate - Data de início do contrato (YYYY-MM-DD ou ISO)
 * @returns {string} Data de vencimento no formato YYYY-MM-DD
 */
export function getNextDueDate(startDate) {
  // Fallback: se não houver startDate, vence em 3 dias
  if (!startDate) {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 3);
    return fallback.toISOString().split('T')[0];
  }

  // Garante que a data seja lida sem distorção de fuso horário
  const rawDate = String(startDate).substring(0, 10);
  const start = new Date(rawDate + 'T12:00:00');
  const paymentDayOfWeek = start.getDay(); // 0=Dom, 1=Seg, 2=Ter, ..., 6=Sáb

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDayOfWeek = today.getDay();

  // Quantos dias faltam para o próximo dia de pagamento
  let daysUntil = paymentDayOfWeek - todayDayOfWeek;

  // Se já passou o dia de pagamento desta semana → vai para a próxima
  if (daysUntil < 0) daysUntil += 7;

  // Se hoje É o dia de pagamento → usa hoje (admin gerou no próprio dia)
  // Se quiser sempre pular para a semana seguinte, troque < 0 por <= 0

  const nextDue = new Date(today);
  nextDue.setDate(today.getDate() + daysUntil);

  return nextDue.toISOString().split('T')[0]; // YYYY-MM-DD
}

/** @deprecated Use getNextDueDate(startDate) para respeitar o ciclo do contrato */
export function formatDueDate(daysFromNow = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

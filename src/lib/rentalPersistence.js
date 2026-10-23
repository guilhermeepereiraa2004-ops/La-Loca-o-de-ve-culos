import { parseCurrency } from '../utils/currencyUtils.js';
import { normalizeDraftReference } from '../utils/indexedDbHelper.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const problem = (message, code = 'RENTAL_INPUT') => Object.assign(new Error(message), { code });
const fileLike = value => value && typeof value.arrayBuffer === 'function' && typeof value.size === 'number';
const optionalId = value => value == null || value === '' ? null : UUID.test(value) ? value : (() => { throw problem('Selecione um cadastro válido.'); })();
const number = value => {
  if (value != null && !['string','number'].includes(typeof value)) throw problem('Confira os valores da locação.');
  if (typeof value === 'string' && value.trim()) {
    const text = value.trim().replace(/^R\$\s*/, '');
    if (!(text.includes(',') ? /^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/ : /^\d+(?:\.\d{1,2})?$/).test(text)) throw problem('Confira os valores da locação.');
  }
  const parsed = parseCurrency(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw problem('Confira os valores da locação.');
  return parsed;
};
const date = value => {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value+'T12:00:00Z') : null;
  if (!parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) throw problem('Confira as datas da locação.');
  return value;
};

function reference(value, projectUrl) {
  if (value == null || value === '') return null;
  const stable = normalizeDraftReference(value, projectUrl);
  let decoded;
  try { decoded = decodeURIComponent(stable || ''); } catch { decoded = ''; }
  if (!stable?.startsWith('storage://La-locacao/') || /[?#\u0000-\u001f]/.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..')) throw problem('Um anexo não pôde ser preparado. Anexe novamente o arquivo.');
  return stable;
}

function normalizeDocumentTree(value, projectUrl, allowedFiles) {
  if (fileLike(value)) {
    if (allowedFiles?.has(value)) return value;
    throw problem('Um anexo não foi preparado. Tente anexá-lo novamente.');
  }
  if (Array.isArray(value)) return value.map(item => normalizeDocumentTree(item, projectUrl, allowedFiles));
  if (value && Object.getPrototypeOf(value) === Object.prototype) return Object.fromEntries(Object.entries(value).map(([key,item]) => [key, normalizeDocumentTree(item, projectUrl, allowedFiles)]));
  if (typeof value === 'string') {
    const stored = normalizeDraftReference(value, projectUrl);
    if (stored) return reference(stored, projectUrl);
    if (/^(?:https?:|storage:|blob:|data:|javascript:|file:)/i.test(value)) throw problem('Um anexo não foi preparado. Tente anexá-lo novamente.');
  }
  return value;
}

export function buildRentalCommand(rental, documents) {
  const name = String(rental.userName ?? rental.user ?? '').trim();
  if (!name) throw problem('Preencha o nome do condutor.');
  const weeks = String(rental.durationWeeks ?? '4');
  const installments = Number(rental.depositInstallments ?? 1);
  if (!/^\d{1,4}$/.test(weeks) || Number(weeks) < 1 || !Number.isInteger(installments) || installments < 0 || installments > 120) throw problem('Confira o prazo e as parcelas da locação.');
  const docs = { ...documents };
  for (const key of ['rg','nacionalidade','estadoCivil','cep','cidadeUf','address']) {
    if (rental[key] !== undefined) docs[key] = rental[key] || null;
  }
  const paymentDay = rental.paymentDay === undefined ? docs.payment_day : rental.paymentDay;
  const day = paymentDay == null || paymentDay === '' || Number(paymentDay) === -1 ? null : Number(paymentDay);
  if (day !== null && (!Number.isInteger(day) || day < 0 || day > 6)) throw problem('Confira o dia de pagamento.');
  docs.payment_day = day;
  const payload = {
    id_veiculo: optionalId(rental.vehicleId), id_cliente: optionalId(rental.clientId),
    start_date: date(rental.startDate), end_date: date(rental.endDate),
    value: number(rental.value), status: rental.status || 'Ativo',
    user_name: name, client_phone: rental.clientPhone ?? rental.phone ?? null,
    'e-mail': rental.email || null, cnh_number: rental.cnhNumber ?? rental.cnh ?? null,
    cnh_validity: date(rental.cnhValidity), data_de_nascimento: date(rental.birthDate),
    registro_cnh: rental.cnhRegisterNumber || null,
    'cnh_código_de_segurança': rental.cnhSecurityCode || null,
    modelo: rental.vehicleModel ?? rental.vehicle ?? null, placa: rental.vehiclePlate ?? rental.plate ?? null,
    tipo: rental.rentalType || 'weekly', semanas: weeks,
    'total do depósito': number(rental.depositTotal), 'caução_paga': number(rental.depositPaid),
    imposto_de_pneus: rental.rentalType === 'daily' ? 0 : number(rental.tireTax),
    deposit_installments: installments, multa_tardia: number(rental.lateFine),
    'juros_diários': number(rental.dailyInterest), 'observações': rental.observations || null,
    documentos: docs, contrato_assinado: docs.signedContract || null,
  };
  if (!payload.id_veiculo || !payload.start_date) throw problem('Selecione o veículo e a data de início.');
  return {
    rental: payload,
    client: {
      nome: name, telefone: payload.client_phone, 'e-mail': payload['e-mail'], cpf: rental.cpf || null,
      address: rental.address ?? docs.address ?? null, cnh_number: payload.cnh_number,
      cnh_validity: payload.cnh_validity, registro_cnh: payload.registro_cnh,
      data_de_nascimento: payload.data_de_nascimento, documentos: docs, status: 'Ativo',
    },
    paymentDay: day,
  };
}

// One instance belongs to the mounted application's verified identity. Cached
// upload receipts survive retries; a lost RPC response cannot duplicate files.
export function createRentalPersistence({ client, uploadFile, projectUrl, timeoutMs = 45000 }) {
  let uploaded = new WeakMap(), owner = null, generation = 0;
  const clear = () => { uploaded = new WeakMap(); owner = null; generation++; };
  const save = async (rental, { operation = 'create', ownerId } = {}) => {
    if (!UUID.test(ownerId || '') || !UUID.test(rental.requestId || '')) throw problem('Entre novamente e reabra o formulário da locação.');
    if (operation !== 'create' && operation !== 'update') throw problem('Operação de locação inválida.');
    if (operation === 'update' && !UUID.test(rental.id || '')) throw problem('Locação inválida.');
    if (owner !== ownerId) { clear(); owner = ownerId; }
    const current = generation;
    const isCurrent = () => current === generation && owner === ownerId;
    // Validate before sending any bytes; File attachments are prepared below.
    buildRentalCommand(rental, {});
    const attach = async (value, folder) => {
      if (!isCurrent()) throw problem('O acesso mudou durante o envio. Entre novamente.', 'SESSION_CHANGED');
      if (!fileLike(value)) return reference(value, projectUrl);
      let files = uploaded.get(value);
      if (!files) { files = new Map(); uploaded.set(value, files); }
      let receipt = files.get(folder);
      if (!receipt) {
        receipt = Promise.resolve().then(() => uploadFile(value, folder)).then(value => {
          const stable = reference(value, projectUrl);
          if (!stable) throw problem('Não foi possível enviar um anexo. Tente novamente.');
          return stable;
        });
        files.set(folder, receipt);
        receipt.catch(() => { if (files.get(folder) === receipt) files.delete(folder); });
      }
      const stable = await receipt;
      if (!isCurrent()) throw problem('O acesso mudou durante o envio. Entre novamente.', 'SESSION_CHANGED');
      return stable;
    };
    const documents = { ...(rental.docs || {}) };
    documents.signedContract ??= rental.signedContract ?? null;
    if (documents.appPrints != null && !Array.isArray(documents.appPrints)) throw problem('Confira os anexos do condutor.');
    const attachments = [documents.cnh, documents.residence, documents.signedContract, ...(documents.appPrints || [])];
    for (const item of attachments) if (!fileLike(item)) reference(item, projectUrl);
    normalizeDocumentTree(documents, projectUrl, new Set(attachments.filter(fileLike)));
    documents.cnh = await attach(documents.cnh, 'condutores/documentos');
    documents.residence = await attach(documents.residence, 'condutores/documentos');
    documents.signedContract = await attach(documents.signedContract ?? rental.signedContract, 'condutores/contratos');
    documents.appPrints = await Promise.all((documents.appPrints || []).map(value => attach(value, 'condutores/prints')));
    if (!isCurrent()) throw problem('O acesso mudou durante o envio. Entre novamente.', 'SESSION_CHANGED');
    const command = buildRentalCommand(rental, normalizeDocumentTree(documents, projectUrl));
    const parameters = { p_request_id: rental.requestId, p_rental: command.rental, p_client: command.client };
    if (operation === 'update') parameters.p_rental_id = rental.id;
    else parameters.p_payment_day = command.paymentDay;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    let result;
    try {
      let request = client.rpc(operation === 'update' ? 'update_rental_atomic' : 'create_rental_atomic', parameters);
      if (typeof request.abortSignal === 'function') request = request.abortSignal(controller.signal);
      result = await request;
    } finally { clearTimeout(timer); }
    if (!isCurrent()) throw problem('O acesso mudou durante o salvamento. Confira a lista antes de repetir.', 'SESSION_CHANGED');
    if (result.error) throw result.error;
    if (!UUID.test(result.data?.rental?.id || '') || result.data?.vehicle?.id !== command.rental.id_veiculo ||
      (result.data.rental.id_veiculo ?? result.data.rental['id_do_veículo']) !== command.rental.id_veiculo ||
      (operation === 'update' && result.data.rental.id !== rental.id) || !Array.isArray(result.data.transactions)) throw problem('O resultado não foi confirmado. Confira a lista antes de repetir.', 'UNCONFIRMED_RESULT');
    return result.data;
  };
  return { save, clear };
}

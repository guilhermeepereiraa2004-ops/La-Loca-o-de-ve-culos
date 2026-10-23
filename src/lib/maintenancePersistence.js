import { parseCurrency } from '../utils/currencyUtils.js';
import { normalizeDraftReference } from '../utils/indexedDbHelper.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const problem = (message, code = 'MAINTENANCE_INPUT') => Object.assign(new Error(message), { code });
const isFile = value => value && typeof value.arrayBuffer === 'function' && typeof value.size === 'number';
const reference = (value, projectUrl) => {
  const stable = normalizeDraftReference(value, projectUrl);
  let decoded;
  try { decoded = decodeURIComponent(stable || ''); } catch { decoded = ''; }
  if (!stable?.startsWith('storage://La-locacao/') || /[?#\u0000-\u001f]/.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..')) throw problem('Anexe novamente o comprovante que não pôde ser preparado.');
  return stable;
};

export function buildMaintenanceCommand(maintenance, receiptUrl) {
  const raw = maintenance.value ?? 0;
  if (!['number','string'].includes(typeof raw)) throw problem('Confira o valor da manutenção.');
  const text = String(raw).trim().replace(/^R\$\s*/, '');
  if (text && !(text.includes(',') ? /^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/ : /^\d+(?:\.\d{1,2})?$/).test(text)) throw problem('Confira o valor da manutenção.');
  const value = parseCurrency(raw);
  const date = maintenance.date;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? new Date(date+'T12:00:00Z') : null;
  const kmText = String(maintenance.currentKm ?? '').trim();
  const currentKm = kmText === '' ? null : /^\d+$/.test(kmText) ? Number(kmText) : NaN;
  if (!Number.isFinite(value) || value < 0 || !parsed || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date || (currentKm !== null && !Number.isSafeInteger(currentKm))) throw problem('Confira a data, o valor e a quilometragem da manutenção.');
  const plate = String(maintenance.vehiclePlate || '').trim();
  const service = String(maintenance.serviceType || '').trim();
  if (!plate || !service) throw problem('Selecione o veículo e informe o serviço da manutenção.');
  return {
    vehicle_plate: plate, vehicle_model: maintenance.vehicleModel || null, date,
    service_type: service, value, provider: maintenance.provider || null,
    current_km: currentKm, responsible: maintenance.responsible || 'Administradora',
    observations: maintenance.observations || null, receipt_url: receiptUrl,
  };
}

export function createMaintenancePersistence({ client, uploadFile, projectUrl, timeoutMs = 45000 }) {
  let uploaded = new WeakMap(), owner = null, generation = 0;
  const clear = () => { uploaded = new WeakMap(); owner = null; generation++; };
  const save = async (maintenance, { ownerId, operation = 'create' } = {}) => {
    if (!UUID.test(ownerId || '') || !UUID.test(maintenance.requestId || '')) throw problem('Entre novamente e reabra o formulário da manutenção.');
    if (!['create','update'].includes(operation) || (operation === 'update' && !UUID.test(maintenance.id || ''))) throw problem('Manutenção inválida.');
    if (owner !== ownerId) { clear(); owner = ownerId; }
    const current = generation;
    const checkOwner = () => { if (current !== generation || owner !== ownerId) throw problem('O acesso mudou durante o envio. Confira a lista antes de repetir.', 'SESSION_CHANGED'); };
    buildMaintenanceCommand(maintenance, null);
    const existing = maintenance.clearReceipts ? [] : String(maintenance.receiptUrl || '').split(',').filter(Boolean).map(value => reference(value, projectUrl));
    if (maintenance.receiptFiles != null && !Array.isArray(maintenance.receiptFiles)) throw problem('Confira os comprovantes da manutenção.');
    const files = maintenance.receiptFiles?.length ? maintenance.receiptFiles : maintenance.receiptFile ? [maintenance.receiptFile] : [];
    for (const file of files) if (!isFile(file)) throw problem('Anexe novamente o comprovante da manutenção.');
    const added = [];
    for (const file of files) {
      checkOwner();
      let receipt = uploaded.get(file);
      if (!receipt) {
        receipt = Promise.resolve().then(() => uploadFile(file, 'manutencoes')).then(url => reference(url, projectUrl));
        uploaded.set(file, receipt);
        receipt.catch(() => { if (uploaded.get(file) === receipt) uploaded.delete(file); });
      }
      added.push(await receipt);
      checkOwner();
    }
    checkOwner();
    const payload = buildMaintenanceCommand(maintenance, [...new Set([...existing,...added])].join(',') || null);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    let result;
    try {
      let request = client.rpc('save_maintenance_atomic', { p_request_id: maintenance.requestId, p_maintenance_id: operation === 'update' ? maintenance.id : null, p_maintenance: payload });
      if (typeof request.abortSignal === 'function') request = request.abortSignal(controller.signal);
      result = await request;
    } finally { clearTimeout(timer); }
    checkOwner();
    if (result.error) throw result.error;
    if (!UUID.test(result.data?.maintenance?.id || '') || !UUID.test(result.data?.transaction?.id || '') || (operation === 'update' && result.data.maintenance.id !== maintenance.id) || result.data.maintenance.vehicle_plate !== payload.vehicle_plate || result.data.transaction.vehicle_plate !== payload.vehicle_plate || result.data.transaction.operation_key !== `maintenance:${result.data.maintenance.id}`) throw problem('O resultado não foi confirmado. Confira a lista antes de repetir.', 'UNCONFIRMED_RESULT');
    return result.data;
  };
  return { save, clear };
}

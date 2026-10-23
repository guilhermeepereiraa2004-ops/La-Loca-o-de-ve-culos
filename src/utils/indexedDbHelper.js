const DB_NAME = 'InspectionDraftsDB';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const keyFor = ownerId => typeof ownerId === 'string' && UUID.test(ownerId) ? 'inspection:v2:' + ownerId : null;
const text = (value, max = 1000) => typeof value === 'string' ? value.slice(0, max) : typeof value === 'number' && Number.isFinite(value) ? value : '';

export function normalizeDraftReference(value, projectUrl = import.meta.env?.VITE_SUPABASE_URL) {
  if (typeof value !== 'string') return null;
  if (/^storage:\/\/(?:La-locacao|vehicle-public-images)\/[^?#]+$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!projectUrl || url.origin !== new URL(projectUrl).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:sign|public|authenticated)\/(La-locacao|vehicle-public-images)\/(.+)$/);
    return match ? 'storage://' + match[1] + '/' + decodeURIComponent(match[2]) : null;
  } catch { return null; }
}

export function sanitizeInspectionDraft(draft, projectUrl) {
  const value = draft && typeof draft === 'object' ? draft : {};
  const photo = candidate => { const preview = normalizeDraftReference(candidate?.preview, projectUrl); return preview ? { preview } : null; };
  const output = {};
  for (const field of ['type','vehiclePlate','date','time','km','fuelLevel','tireCondition','externalCleanliness','internalCleanliness','lastOilChangeDate','lastOilChangeKm','nextOilChangeKm']) output[field] = text(value[field]);
  output.observations = text(value.observations, 10000);
  output.hasDamages = value.hasDamages === true;
  output.photos = Object.fromEntries(Object.entries(value.photos || {}).slice(0, 200).map(([slot, item]) => [slot, photo(item)]).filter(([, item]) => item));
  output.additionalPhotos = (Array.isArray(value.additionalPhotos) ? value.additionalPhotos : []).slice(0, 200).filter(item => !item?.uploading).map(item => ({ id: text(item?.id), ...photo(item) })).filter(item => item.preview);
  output.damages = (Array.isArray(value.damages) ? value.damages : []).slice(0, 100).map(item => ({ id: text(item?.id), description: text(item?.description, 4000), photo: photo(item?.photo) }));
  output.deductions = (Array.isArray(value.deductions) ? value.deductions : []).slice(0, 100).map(item => ({ category: text(item?.category), description: text(item?.description, 4000), value: text(item?.value), isProportional: item?.isProportional === true }));
  output.video = photo(value.video);
  return output;
}

export const openDb = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = event => { const db = event.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME); };
  request.onsuccess = event => { const db = event.target.result; db.onversionchange = () => db.close(); resolve(db); };
  request.onerror = request.onblocked = () => reject(new Error('Não foi possível acessar o rascunho neste navegador.'));
});

async function transaction(mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    let result;
    const tx = db.transaction(STORE_NAME, mode);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Não foi possível concluir a gravação do rascunho.')); };
    try { const request = operation(tx.objectStore(STORE_NAME)); request.onsuccess = () => { result = request.result; }; }
    catch { tx.abort(); }
  });
}

// The authenticated UI passes the verified Auth user ID. Never read or delete
// legacy unowned keys or another owner's draft; those remain untouched on disk.
export async function saveDraft(draft, ownerId) {
  const key = keyFor(ownerId); if (!key) return false;
  await transaction('readwrite', store => store.put({ schema: 2, ownerId, updatedAt: Date.now(), data: sanitizeInspectionDraft(draft) }, key));
  return true;
}
export async function getDraft(ownerId) {
  const key = keyFor(ownerId); if (!key) return null;
  const saved = await transaction('readonly', store => store.get(key));
  return saved?.schema === 2 && saved.ownerId === ownerId ? sanitizeInspectionDraft(saved.data) : null;
}
export async function clearDraft(ownerId) {
  const key = keyFor(ownerId); if (!key) return false;
  await transaction('readwrite', store => store.delete(key));
  return true;
}

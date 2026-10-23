import { supabase } from '../lib/supabase.js';
import { validateUploadBytes, MAX_UPLOAD_BYTES } from '../../supabase/functions/_shared/fileValidation.js';

const PRIVATE_BUCKET = 'La-locacao';
const PUBLIC_BUCKET = 'vehicle-public-images';
const SIGNED_SECONDS = 1800;
const sanitizeFolder = (folder) => String(folder || '').split('/').map(segment => segment.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_')).filter(Boolean).join('/');

// One resolver per authenticated SDK: cache/single-flight and a global request
// limit are shared by every resource loader, rather than multiplied per table.
export function createStorageUrlResolver({ client, projectUrl, batchSize = 100, concurrency = 3, clock = Date.now } = {}) {
  const signedUrls = new Map(), pending = new Map(), queue = [], activeTasks = new Set();
  let generation = 0, active = 0;
  const stable = ref => 'storage://' + ref.bucket + '/' + ref.path;
  const cached = key => {
    const entry = signedUrls.get(key);
    if (entry?.expiresAt > clock()) return entry.url;
    if (entry) signedUrls.delete(key);
    return null;
  };
  const reference = value => {
    if (typeof value !== 'string') return null;
    const direct = value.match(/^storage:\/\/(La-locacao|vehicle-public-images)\/(.+)$/);
    if (direct) return { bucket: direct[1], path: direct[2] };
    try {
      const url = new URL(value);
      if (!projectUrl || url.origin !== new URL(projectUrl).origin) return null;
      const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/(La-locacao|vehicle-public-images)\/(.+)$/);
      return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
    } catch { return null; }
  };
  const getPublicUrl = value => {
    if (value && typeof value === 'object') return getPublicUrl(value.preview || value.url);
    if (typeof value !== 'string' || !value || value === '[object Object]') return null;
    const ref = reference(value);
    if (ref) {
      if (ref.bucket === PUBLIC_BUCKET) return client.storage.from(PUBLIC_BUCKET).getPublicUrl(ref.path).data.publicUrl;
      return cached(ref.bucket + '/' + ref.path);
    }
    if (/^https:\/\//i.test(value) || value.startsWith('blob:') || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) || (value.startsWith('/') && !value.startsWith('//'))) return value;
    return null;
  };
  const drain = () => {
    while (active < concurrency && queue.length) {
      const task = queue.shift();
      if (task.cancelled || task.generation !== generation || clock() >= task.deadline) { task.finish(null); continue; }
      clearTimeout(task.timer);
      active++; activeTasks.add(task);
      task.timer = setTimeout(() => task.finish(null), Math.max(1, Math.min(task.timeoutMs, task.deadline - clock())));
      // A timed-out SDK request retains its concurrency slot until it actually
      // settles: an unavailable Storage service must not cause a request storm.
      Promise.resolve().then(() => client.storage.from(PRIVATE_BUCKET).createSignedUrls(task.paths, SIGNED_SECONDS))
        .then(result => task.finish(result), () => task.finish(null))
        .finally(() => { active--; activeTasks.delete(task); drain(); });
    }
  };
  const request = (paths, deadline, requestGeneration, timeoutMs) => new Promise(resolve => {
    const task = { paths, deadline, timeoutMs, generation: requestGeneration, cancelled: false, timer: null,
      finish(result) {
        if (task.cancelled) return;
        task.cancelled = true; clearTimeout(task.timer);
        const position = queue.indexOf(task); if (position >= 0) queue.splice(position, 1);
        resolve(result);
      },
    };
    task.timer = setTimeout(() => task.finish(null), Math.max(1, deadline - clock()));
    queue.push(task); drain();
  });
  const bounded = (promise, milliseconds) => new Promise(resolve => {
    const timer = setTimeout(() => resolve(null), Math.max(1, milliseconds));
    Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(null); });
  });
  const signBatch = async (paths, deadline, requestGeneration, timeoutMs) => {
    const owned = [], waits = [];
    for (const path of paths) {
      const key = PRIVATE_BUCKET + '/' + path;
      if (cached(key)) continue;
      let entry = pending.get(key);
      if (!entry) {
        let finish;
        entry = { promise: new Promise(resolve => { finish = resolve; }), finish: value => finish(value) };
        pending.set(key, entry); owned.push({ path, key, entry });
      }
      waits.push(entry.promise);
    }
    if (owned.length) {
      try {
        const result = await request(owned.map(item => item.path), deadline, requestGeneration, timeoutMs);
        if (requestGeneration === generation && !result?.error && Array.isArray(result?.data)) {
          const allowed = new Set(owned.map(item => item.path));
          for (const item of result.data) {
            if (!item?.error && allowed.has(item?.path) && typeof item.signedUrl === 'string' && item.signedUrl) {
              signedUrls.set(PRIVATE_BUCKET + '/' + item.path, { url: item.signedUrl, expiresAt: clock() + (SIGNED_SECONDS - 60) * 1000 });
            }
          }
        }
      } finally {
        for (const { key, entry } of owned) {
          entry.finish(requestGeneration === generation ? cached(key) : null);
          if (pending.get(key) === entry) pending.delete(key);
        }
      }
    }
    if (waits.length) await bounded(Promise.all(waits), deadline - clock());
  };
  const clearCache = () => {
    generation++; signedUrls.clear();
    for (const entry of pending.values()) entry.finish(null);
    pending.clear();
    for (const task of [...queue, ...activeTasks]) task.finish(null);
  };
  const hydrate = async (value, { timeoutMs = 4000, totalTimeoutMs = 8000 } = {}) => {
    const paths = new Set();
    const collect = item => {
      if (typeof item === 'string') { const ref = reference(item); if (ref?.bucket === PRIVATE_BUCKET && !cached(ref.bucket + '/' + ref.path)) paths.add(ref.path); }
      else if (Array.isArray(item)) item.forEach(collect);
      else if (item && Object.getPrototypeOf(item) === Object.prototype) Object.values(item).forEach(collect);
    };
    collect(value);
    const list = [...paths], deadline = clock() + Math.max(1, totalTimeoutMs), requestGeneration = generation;
    let index = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.ceil(list.length / batchSize)) }, async () => {
      while (index < list.length && requestGeneration === generation && clock() < deadline) {
        const batch = list.slice(index, index + batchSize); index += batchSize;
        await signBatch(batch, deadline, requestGeneration, timeoutMs);
      }
    }));
    const replace = item => {
      if (typeof item === 'string') {
        const ref = reference(item);
        // Missing files, denied rows, timeouts and late replies must NEVER erase
        // attachments when a user later saves a form containing this record.
        return ref ? (getPublicUrl(item) || stable(ref)) : item;
      }
      if (Array.isArray(item)) return item.map(replace);
      if (item && Object.getPrototypeOf(item) === Object.prototype) return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, replace(child)]));
      return item;
    };
    return replace(value);
  };
  return { hydrate, clearCache, getPublicUrl, resolve: value => hydrate(value) };
}

const storageUrls = createStorageUrlResolver({ client: supabase, projectUrl: import.meta.env?.VITE_SUPABASE_URL });
export const clearStorageUrlCache = storageUrls.clearCache;
export const hydrateStorageReferences = storageUrls.hydrate;
export const getPublicUrl = storageUrls.getPublicUrl;
const resolveReference = storageUrls.resolve;

async function upload(file, folder, isPublic) {
  if (!file) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Arquivo maior que 50 MB.');
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error('Entre novamente para enviar arquivos.');
  const { contentType } = await validateUploadBytes(new Uint8Array(await file.arrayBuffer()), file.type, file.name);
  if (isPublic && !contentType.startsWith('image/')) throw new Error('Somente fotos podem ser públicas.');
  const { data, error } = await supabase.functions.invoke('secure-upload', {
    body: file,
    headers: { 'Content-Type': contentType, 'x-upload-folder': sanitizeFolder(folder), 'x-upload-name': encodeURIComponent(file.name || 'arquivo'), 'x-upload-public': String(isPublic) },
  });
  if (error || !data?.bucket || !data?.path) throw new Error('Não foi possível enviar o arquivo com segurança.');
  const reference = `storage://${data.bucket}/${data.path}`;
  // Preserve the uploaded reference even when preview signing is unavailable.
  return resolveReference(reference);
}

export const uploadFile = (file, folder) => upload(file, folder, false);
export const uploadPublicVehicleImage = (file) => upload(file, 'veiculos', true);

export function openSafeUrl(value) {
  const url = getPublicUrl(value);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

import { supabase } from '../lib/supabase.js';
import { validateUploadBytes, MAX_UPLOAD_BYTES } from '../../supabase/functions/_shared/fileValidation.js';

const PRIVATE_BUCKET = 'La-locacao';
const PUBLIC_BUCKET = 'vehicle-public-images';
const SIGNED_SECONDS = 1800;
const signedUrls = new Map();
let cacheGeneration = 0;
const sanitizeFolder = (folder) => String(folder || '').split('/').map(segment => segment.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_')).filter(Boolean).join('/');

function storageReference(value) {
  if (typeof value !== 'string') return null;
  const stable = value.match(/^storage:\/\/(La-locacao|vehicle-public-images)\/(.+)$/);
  if (stable) return { bucket: stable[1], path: stable[2] };
  try {
    const url = new URL(value);
    if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) return null;
    const match = url.pathname.match(/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/(La-locacao|vehicle-public-images)\/(.+)$/);
    return match ? { bucket: match[1], path: decodeURIComponent(match[2]) } : null;
  } catch { return null; }
}

export function clearStorageUrlCache() { cacheGeneration++; signedUrls.clear(); }

async function resolveReference(value) {
  const ref = storageReference(value);
  if (!ref) return getPublicUrl(value);
  if (ref.bucket === PUBLIC_BUCKET) return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(ref.path).data.publicUrl;
  const key = `${ref.bucket}/${ref.path}`, cached = signedUrls.get(key);
  if (cached?.expiresAt > Date.now()) return cached.url;
  const generation = cacheGeneration;
  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(ref.path, SIGNED_SECONDS);
  if (error || generation !== cacheGeneration) return null;
  signedUrls.set(key, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_SECONDS - 60) * 1000 });
  return data.signedUrl;
}

export async function hydrateStorageReferences(value) {
  const strings = new Set();
  const collect = (v) => {
    if (typeof v === 'string' && storageReference(v)) strings.add(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && Object.getPrototypeOf(v) === Object.prototype) Object.values(v).forEach(collect);
  };
  collect(value);
  const resolved = new Map(), list = [...strings];
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(6, list.length) }, async () => {
    while (index < list.length) { const source = list[index++]; resolved.set(source, await resolveReference(source)); }
  }));
  const replace = (v) => {
    if (typeof v === 'string') return resolved.has(v) ? resolved.get(v) : v;
    if (Array.isArray(v)) return v.map(replace);
    if (v && Object.getPrototypeOf(v) === Object.prototype) return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, replace(val)]));
    return v;
  };
  return replace(value);
}

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
  await resolveReference(reference);
  // Forms render uploaded previews directly, so return the signed URL. The
  // loader recognizes it and re-signs on future reads, including old DB URLs.
  return getPublicUrl(reference);
}

export const uploadFile = (file, folder) => upload(file, folder, false);
export const uploadPublicVehicleImage = (file) => upload(file, 'veiculos', true);

export function openSafeUrl(value) {
  const url = getPublicUrl(value);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

export function getPublicUrl(value) {
  if (value && typeof value === 'object') return getPublicUrl(value.preview || value.url);
  if (typeof value !== 'string' || !value || value === '[object Object]') return null;
  const ref = storageReference(value);
  if (ref) {
    if (ref.bucket === PUBLIC_BUCKET) return supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(ref.path).data.publicUrl;
    const cached = signedUrls.get(`${ref.bucket}/${ref.path}`);
    return cached?.expiresAt > Date.now() ? cached.url : null;
  }
  if (/^https:\/\//i.test(value) || value.startsWith('blob:') || /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) || (value.startsWith('/') && !value.startsWith('//'))) return value;
  return null;
}

import { createClient } from '@supabase/supabase-js';
import { MAX_UPLOAD_BYTES, validateUploadBytes } from '../_shared/fileValidation.js';
import { requireVerifiedMfa } from '../_shared/requireMfa.js';
import { canUploadToFolder } from '../_shared/canOperate.js';
const origins = new Set([
  'https://www.lalocacao.com.br', 'https://lalocacao.com.br', 'https://oficina.lalocacao.com.br',
  'https://la-loca-o-de-ve-culos.vercel.app', 'http://localhost:5173', 'http://127.0.0.1:5173',
]);

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin',
    ...(origins.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upload-folder, x-upload-name, x-upload-public', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}) };
  const reply = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers });
  if (origin && !origins.has(origin)) return reply(403, 'Origem não autorizada.');
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return reply(405, 'Método não permitido.');
  const authorization = req.headers.get('authorization') || '';
  if (!/^Bearer \S+$/.test(authorization)) return reply(401, 'Autenticação necessária.');
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return reply(503, 'Upload temporariamente indisponível.');
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  let user;
  try { ({ user } = await requireVerifiedMfa(admin, authorization.slice(7))); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'MFA_REQUIRED') {
      return new Response(JSON.stringify({ error: 'Confirme o autenticador para continuar.', code: 'MFA_REQUIRED' }), { status: 403, headers });
    }
    return reply(401, 'Sessão inválida.');
  }
  const { data: profile, error: profileError } = await admin.from('system_users').select('role, modules').eq('auth_user_id', user.id).maybeSingle();
  if (profileError || !profile) return reply(403, 'Acesso não autorizado.');
  const folder = req.headers.get('x-upload-folder') || '';
  if (folder.length > 200 || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(folder)) return reply(400, 'Pasta inválida.');
  const isPublic = req.headers.get('x-upload-public') === 'true';
  if (isPublic && folder !== 'veiculos') return reply(400, 'Pasta de fotos públicas inválida.');
  // The verified database profile must own this operation's module. Related
  // read permissions never authorize privileged Storage writes.
  if (!canUploadToFolder(profile, folder, isPublic)) return reply(403, 'Acesso não autorizado.');
  // An atomic database counter is shared by every function instance.
  const { data: allowed, error: rateError } = await admin.rpc('consume_security_rate_limit', { p_key: `upload:${user.id}`, p_limit: 150, p_window_seconds: 300 });
  if (rateError) return reply(503, 'Upload temporariamente indisponível.');
  if (!allowed) return new Response(JSON.stringify({ error: 'Limite de uploads atingido.' }), { status: 429, headers: { ...headers, 'Retry-After': '300' } });
  const maximumBytes = isPublic ? 5 * 1024 * 1024 : MAX_UPLOAD_BYTES;
  if (Number(req.headers.get('content-length') || 0) > maximumBytes) return reply(413, 'Arquivo maior que o limite permitido.');
  try {
    const reader = req.body?.getReader();
    if (!reader) return reply(400, 'Arquivo ausente.');
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > maximumBytes) { await reader.cancel(); return reply(413, 'Arquivo maior que o limite permitido.'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const { contentType, extension } = await validateUploadBytes(bytes, req.headers.get('content-type'), req.headers.get('x-upload-name') || '');
    if (isPublic && !contentType.startsWith('image/')) return reply(400, 'Somente fotos podem ser públicas.');
    const bucket = isPublic ? 'vehicle-public-images' : 'La-locacao';
    const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType, upsert: false, cacheControl: isPublic ? '3600' : '0' });
    if (error) return reply(500, 'Não foi possível salvar o arquivo.');
    return new Response(JSON.stringify({ bucket, path }), { status: 201, headers });
  } catch { return reply(400, 'Arquivo inválido ou não permitido.'); }
});

import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { safeFetch } from '../lib/server/safeFetch.js';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class PublicError extends Error { constructor(status, message) { super(message); this.status = status; } }
function deny(status, message) { throw new PublicError(status, message); }
function string(value, max, min = 0) {
  if (typeof value !== 'string' || value.length > max || value.trim().length < min || /[\u0000-\u0008]/.test(value)) deny(400, 'Dados inválidos.');
  return value.trim();
}
export function validateInterest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['name','contact','email','message','vehicleId','type','website','captchaToken'].includes(key))) deny(400, 'Dados inválidos.');
  if (body.website) deny(400, 'Envio não permitido.');
  const name = string(body.name, 160, 2);
  const contact = string(body.contact, 32, 10).replace(/[^0-9+]/g, '');
  if (!/^\+?\d{10,15}$/.test(contact)) deny(400, 'Telefone inválido.');
  const email = string(body.email, 254, 3).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) deny(400, 'E-mail inválido.');
  const message = string(body.message ?? '', 1000);
  if ((message.match(/https?:\/\//gi) || []).length > 2) deny(400, 'Envio não permitido.');
  if (body.type !== 'locacao' || (body.vehicleId != null && (typeof body.vehicleId !== 'string' || !UUID.test(body.vehicleId)))) deny(400, 'Dados inválidos.');
  const captchaToken = string(body.captchaToken ?? '', 2048);
  return { name, contact, email, message, type: 'locacao', vehicleId: body.vehicleId ?? null, captchaToken };
}
export function createPublicInterestHandler({ clientFactory = createClient, environment = process.env, fetchImpl = safeFetch } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); deny(405, 'Método não permitido.'); }
      if (req.headers['sec-fetch-site'] === 'cross-site') deny(403, 'Origem não permitida.');
      let origin;
      try { origin = new URL(req.headers.origin); } catch { deny(403, 'Origem não permitida.'); }
      if (origin.host !== req.headers.host || !['https:','http:'].includes(origin.protocol)) deny(403, 'Origem não permitida.');
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) deny(415, 'Envie JSON.');
      if (Number(req.headers['content-length']) > 8192 || JSON.stringify(req.body ?? '').length > 8192) deny(413, 'Requisição muito grande.');
      const input = validateInterest(typeof req.body === 'string' ? JSON.parse(req.body) : req.body);
      if (!environment.SUPABASE_URL || !environment.SUPABASE_SERVICE_ROLE_KEY) deny(503, 'Formulário temporariamente indisponível.');
      // Only trust this header on Vercel, whose edge overwrites it. Never trust arbitrary X-Forwarded-For locally.
      const ip = environment.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : req.socket?.remoteAddress;
      if (typeof ip !== 'string' || !isIP(ip)) deny(503, 'Não foi possível validar o envio.');
      const key = createHmac('sha256', environment.SUPABASE_SERVICE_ROLE_KEY).update('public-interest:' + ip).digest('hex');
      const database = clientFactory(environment.SUPABASE_URL, environment.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: safeFetch } });
      const { data: allowed, error: rateError } = await database.rpc('consume_security_rate_limit', { p_key: 'public-interest:' + key, p_limit: 3, p_window_seconds: 300 });
      if (rateError) deny(503, 'Verificação de segurança indisponível.');
      if (!allowed) deny(429, 'Muitos envios recentes. Aguarde cinco minutos.');
      const captchaSecret = environment.TURNSTILE_SECRET_KEY;
      if (Boolean(captchaSecret) !== Boolean(environment.VITE_TURNSTILE_SITE_KEY)) deny(503, 'Verificação de segurança indisponível.');
      if (captchaSecret) {
        if (!input.captchaToken) deny(400, 'Complete a verificação de segurança.');
        const verification = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST', body: new URLSearchParams({ secret: captchaSecret, response: input.captchaToken, remoteip: ip }), signal: AbortSignal.timeout(5000),
        });
        if (!verification.ok) deny(503, 'Verificação de segurança indisponível.');
        const challenge = await verification.json();
        if (!challenge.success || challenge.hostname !== origin.hostname || challenge.action !== 'public_interest') deny(400, 'Verificação de segurança inválida ou expirada.');
      }
      let vehicleModel = null;
      if (input.vehicleId) {
        if (!environment.SUPABASE_ANON_KEY) deny(503, 'Não foi possível verificar o veículo.');
        // The public projection grants EXECUTE only to its public consumers.
        // Do not broaden service-role grants to read a public catalogue.
        const publicCatalog = clientFactory(environment.SUPABASE_URL, environment.SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: safeFetch } });
        const { data: fleet, error } = await publicCatalog.rpc('get_public_fleet');
        if (error) deny(503, 'Não foi possível verificar o veículo.');
        const vehicle = fleet?.find(item => item.id === input.vehicleId);
        if (!vehicle) deny(400, 'Veículo indisponível.');
        vehicleModel = vehicle.model;
      }
      // The caller controls only these contact fields. Never accept status, plate, owner, role, or arbitrary columns.
      const { error } = await database.from('leads').insert({ name: input.name, contact: input.contact, email: input.email, message: input.message, type: 'locacao', status: 'Novo', vehicle_model: vehicleModel, date: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' }) });
      if (error) deny(503, 'Não foi possível salvar seu interesse. Tente novamente.');
      return res.status(201).json({ success: true });
    } catch (error) {
      const status = error instanceof PublicError ? error.status : error instanceof SyntaxError ? 400 : 503;
      return res.status(status).json({ error: error instanceof PublicError ? error.message : status === 400 ? 'JSON inválido.' : 'Formulário temporariamente indisponível.' });
    }
  };
}
export default createPublicInterestHandler();

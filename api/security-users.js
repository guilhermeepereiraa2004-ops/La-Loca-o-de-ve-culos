import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireVerifiedMfa } from '../lib/server/requireMfa.js';
import { safeFetch } from '../lib/server/safeFetch.js';

let runtimeReported = false;

const MODULES = new Set(['bi','faturamento','frota','leads','locacao','clientes','investidores','financeiro','caucao','manutencaoAdmin','vistoria','multas','oficina','logs','avisos']);
const SYSTEM_FIELDS = 'id,auth_user_id,name,email,role,modules,created_at';
const INVESTOR_FIELDS = 'id,auth_user_id,name,email,phone,cpf,address,status,bank,pix,created_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class RequestError extends Error { constructor(status, message) { super(message); this.status = status; } }
function reject(status, message) { throw new RequestError(status, message); }
function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function matchProfileSnapshot(query, snapshot) {
  for (const [field, value] of Object.entries(snapshot)) {
    query = value === null ? query.is(field, null) : query.eq(field, Array.isArray(value) ? `{${value.join(',')}}` : value);
  }
  return query;
}
function text(value, max, required = false) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim()) || /[\u0000-\u0008]/.test(value)) reject(400, 'Dados inválidos.');
  return value.trim();
}
export function validateAccountInput(body, { investorBusinessOnly = false } = {}) {
  if (!plainObject(body) || Object.keys(body).some(key => !['kind','action','profile','currentPassword'].includes(key))) reject(400, 'Dados inválidos.');
  const { kind, action, profile, currentPassword } = body;
  if (!['system','investor'].includes(kind) || !['create','update','delete','activation-link'].includes(action) || !plainObject(profile)) reject(400, 'Dados inválidos.');
  // This option is derived from the actor's protected DB profile by the handler,
  // never from a request property or browser role/module flags.
  if (investorBusinessOnly && (kind !== 'investor' || !['create', 'update'].includes(action))) reject(403, 'Somente administradores podem gerenciar contas e acessos.');
  if (investorBusinessOnly && profile.password !== undefined && profile.password !== null && profile.password !== '') reject(403, 'Somente administradores podem definir senhas de acesso.');
  if (typeof currentPassword !== 'string' || !currentPassword || currentPassword.length > 128) reject(400, 'Confirme sua senha atual.');
  const allowed = kind === 'system' ? ['id','name','email','password','role','modules'] : ['id','name','email','password','phone','cpf','address','status','bank','pix'];
  if (Object.keys(profile).some(key => !allowed.includes(key))) reject(400, 'Campo não permitido.');
  if (action !== 'create' && !(typeof profile.id === 'string' && UUID.test(profile.id)) && !Number.isSafeInteger(profile.id)) reject(400, 'Identificador inválido.');
  if (action === 'delete' || action === 'activation-link') {
    if (Object.keys(profile).some(key => key !== 'id')) reject(400, 'Campo não permitido.');
    return { kind, action, profile: { id: profile.id }, currentPassword };
  }
  const output = { name: text(profile.name, 160, true), email: text(profile.email, 254, true).toLowerCase() };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) reject(400, 'E-mail inválido.');
  if (action === 'update') output.id = profile.id;
  if (profile.password) {
    if (typeof profile.password !== 'string' || profile.password.length < 12 || profile.password.length > 128) reject(400, 'A nova senha deve ter de 12 a 128 caracteres.');
    output.password = profile.password;
  }
  if (action === 'create' && !output.password && !investorBusinessOnly) reject(400, 'Defina uma senha nova de pelo menos 12 caracteres.');
  if (kind === 'system') {
    if (!['administrador','gerente','funcionario'].includes(profile.role)) reject(400, 'Papel inválido.');
    if (!Array.isArray(profile.modules) || profile.modules.length > MODULES.size || profile.modules.some(value => !MODULES.has(value))) reject(400, 'Permissões inválidas.');
    output.role = profile.role;
    output.modules = [...new Set(profile.modules)];
  } else {
    for (const key of ['phone','cpf','address','bank','pix']) output[key] = text(profile[key] ?? '', key === 'address' ? 500 : 200);
    if (!['Ativo','Inativo'].includes(profile.status)) reject(400, 'Status inválido.');
    output.status = profile.status;
  }
  return { kind, action, profile: output, currentPassword };
}

export function createSecurityUsersHandler({ clientFactory = createClient, environment = process.env } = {}) {
  return async function handler(req, res) {
    if (!runtimeReported && environment.VERCEL === '1') {
      console.info('[security-runtime]', process.version);
      runtimeReported = true;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); reject(405, 'Método não permitido.'); }
      if (req.headers['sec-fetch-site'] === 'cross-site') reject(403, 'Origem não permitida.');
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) reject(403, 'Origem não permitida.');
      if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) reject(415, 'Envie JSON.');
      if (Number(req.headers['content-length']) > 16384 || JSON.stringify(req.body ?? '').length > 16384) reject(413, 'Requisição muito grande.');
      const url = environment.SUPABASE_URL;
      const anonKey = environment.SUPABASE_ANON_KEY;
      const serviceKey = environment.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !anonKey || !serviceKey) reject(503, 'Gestão de acesso indisponível.');
      const authorization = req.headers.authorization || '';
      if (!/^Bearer [A-Za-z0-9._-]+$/.test(authorization)) reject(401, 'Autenticação necessária.');
      const token = authorization.slice(7);
      const config = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: safeFetch } };
      const authClient = clientFactory(url, anonKey, config);
      let verified;
      try { verified = await requireVerifiedMfa(authClient, token); }
      catch (error) {
        if (error.code === 'MFA_REQUIRED') reject(403, 'Confirme o autenticador para continuar.');
        reject(401, 'Sessão inválida.');
      }
      const { user } = verified;
      if (!user.email) reject(401, 'Sessão inválida.');
      const admin = clientFactory(url, serviceKey, config);
      const { data: actor, error: actorError } = await admin.from('system_users').select('id,role,modules,auth_user_id').eq('auth_user_id', user.id).maybeSingle();
      const isAdmin = actor?.role === 'administrador';
      const canEditInvestorBusiness = ['funcionario', 'gerente'].includes(actor?.role) && Array.isArray(actor.modules) && actor.modules.includes('investidores');
      if (actorError || (!isAdmin && !canEditInvestorBusiness)) reject(403, 'Acesso não autorizado.');
      const { data: actorInvestor, error: actorIdentityError } = await admin.from('investors').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (actorIdentityError || actorInvestor) reject(409, 'Identidade com vínculos conflitantes. Revise os perfis.');
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const input = validateAccountInput(body, { investorBusinessOnly: !isAdmin });
      const { data: allowed, error: rateError } = await admin.rpc('consume_security_rate_limit', {
        p_key: 'manage-account:' + user.id, p_limit: 10, p_window_seconds: 60,
      });
      if (rateError) reject(503, 'Verificação de segurança indisponível.');
      if (!allowed) reject(429, 'Muitas tentativas. Aguarde um minuto.');
      // Supabase Auth enforces password checks and rate limiting server-side.
      const { data: reauth, error: reauthError } = await authClient.auth.signInWithPassword({ email: user.email, password: input.currentPassword });
      if (reauthError || reauth?.user?.id !== user.id) reject(403, 'Senha atual inválida.');
      // Revoke the temporary step-up session without touching the browser session.
      await authClient.auth.signOut({ scope: 'local' });
      const table = input.kind === 'system' ? 'system_users' : 'investors';
      const fields = input.kind === 'system' ? SYSTEM_FIELDS : INVESTOR_FIELDS;
      const { password, id, ...safeProfile } = input.profile;
      let existing = null;
      if (input.action !== 'create') {
        const { data, error } = await admin.from(table).select(fields).eq('id', id).maybeSingle();
        if (error || !data) reject(404, 'Conta não encontrada.');
        existing = data;
        if (existing.auth_user_id === user.id) reject(409, 'Não altere a própria conta pela gestão de usuários.');
        if (existing.auth_user_id) {
          const otherTable = table === 'system_users' ? 'investors' : 'system_users';
          const { data: conflictingProfile, error: identityError } = await admin.from(otherTable).select('id').eq('auth_user_id', existing.auth_user_id).maybeSingle();
          if (identityError || conflictingProfile) reject(409, 'Identidade com vínculos conflitantes. Revise os perfis.');
        }
      }
      if (!isAdmin) {
        // Staff can maintain commercial records only. Never create, change,
        // activate or delete an Auth identity from this path.
        const businessPayload = { ...safeProfile };
        if (existing?.auth_user_id) {
          if (safeProfile.email !== existing.email?.trim().toLowerCase()) reject(409, 'Este investidor já possui acesso. Solicite a um administrador a alteração do e-mail.');
          if (safeProfile.status !== existing.status) reject(409, 'Este investidor já possui acesso. Solicite a um administrador a alteração do status.');
          delete businessPayload.email;
          delete businessPayload.status;
        }
        let businessQuery;
        if (input.action === 'create') {
          businessQuery = admin.from('investors').insert({ ...businessPayload, auth_user_id: null });
        } else {
          businessQuery = admin.from('investors').update(businessPayload).eq('id', id);
          // A concurrent administrator may bind or change access while this
          // request runs. Do not overwrite that new binding/email/status.
          businessQuery = existing.auth_user_id ? businessQuery.eq('auth_user_id', existing.auth_user_id) : businessQuery.is('auth_user_id', null);
          for (const field of ['email', 'status']) businessQuery = existing[field] == null ? businessQuery.is(field, null) : businessQuery.eq(field, existing[field]);
        }
        const { data: savedBusiness, error: businessError } = await businessQuery.select(INVESTOR_FIELDS).single();
        if (businessError || !savedBusiness) reject(409, 'Não foi possível salvar o cadastro comercial. Ele pode ter sido alterado; atualize a lista e tente novamente.');
        return res.status(200).json({ success: true, profile: savedBusiness });
      }
      if (input.action === 'activation-link') {
        let redirect;
        try { redirect = new URL(environment.AUTH_REDIRECT_URL); } catch { reject(503, 'Ativação indisponível. Configure o endereço de retorno.'); }
        if (redirect.protocol !== 'https:' || redirect.pathname !== '/auth/callback' || redirect.search || redirect.hash) reject(503, 'Endereço de retorno inválido.');
        let targetAuthId = existing.auth_user_id;
        let savedProfile = existing;
        if (!targetAuthId) {
          const { data, error } = await admin.auth.admin.createUser({ email: existing.email, password: randomBytes(48).toString('base64url'), email_confirm: false });
          if (error || !data?.user) reject(409, 'Não foi possível ativar a conta. Revise possíveis identidades já existentes.');
          targetAuthId = data.user.id;
          const { data: linked, error: linkError } = await admin.from(table).update({ auth_user_id: targetAuthId }).eq('id', id).is('auth_user_id', null).select(fields).single();
          // Never delete existing profiles or overwrite a concurrent identity binding.
          if (linkError || !linked) reject(409, 'Identidade criada sem conclusão do vínculo. Revise a conta antes de repetir.');
          savedProfile = linked;
        } else {
          const { data, error } = await admin.auth.admin.getUserById(targetAuthId);
          if (error || !data?.user || data.user.id !== targetAuthId || data.user.email?.trim().toLowerCase() !== existing.email?.trim().toLowerCase()) reject(409, 'Identidade divergente. Revise a conta antes de gerar o link.');
        }
        // Recovery is exempt from the provider's current-password requirement, including legacy accounts with an unknown random password.
        const type = 'recovery';
        const { data: generated, error: linkError } = await admin.auth.admin.generateLink({ type, email: existing.email, options: { redirectTo: redirect.href } });
        if (linkError || generated?.user?.id !== targetAuthId || typeof generated?.properties?.hashed_token !== 'string' || !generated.properties.hashed_token) reject(503, 'Não foi possível gerar o link. O perfil foi preservado.');
        const activationUrl = new URL(redirect.href);
        activationUrl.searchParams.set('token_hash', generated.properties.hashed_token);
        activationUrl.searchParams.set('type', 'recovery');
        // This credential is intentionally returned only to a reauthenticated administrator.
        // It is never written to a profile, logs, analytics, localStorage or email by this endpoint.
        return res.status(200).json({ success: true, profile: savedProfile, activationLink: activationUrl.href });
      }
      if (input.action === 'delete') {
        // Remove the authorization profile first: existing JWTs immediately lose RLS access.
        const { error } = await admin.from(table).delete().eq('id', id);
        if (error) reject(409, 'Conta possui vínculos ou não pode ser removida.');
        if (existing.auth_user_id) {
          const { error: deleteError } = await admin.auth.admin.deleteUser(existing.auth_user_id);
          if (deleteError) reject(503, 'Acesso removido. A exclusão da identidade precisa de revisão administrativa.');
        }
        return res.status(200).json({ success: true });
      }
      let authUserId = existing?.auth_user_id;
      let createdAuthUser = false;
      if (!authUserId) {
        if (!password) reject(400, 'Esta conta precisa de uma senha nova para ativação.');
        const { data, error } = await admin.auth.admin.createUser({ email: safeProfile.email, password, email_confirm: true });
        if (error || !data?.user) reject(409, 'Não foi possível criar a identidade. Verifique se já existe uma conta para este e-mail.');
        authUserId = data.user.id;
        createdAuthUser = true;
      }
      const payload = { ...safeProfile, auth_user_id: authUserId };
      let query = input.action === 'create' ? admin.from(table).insert(payload) : admin.from(table).update(payload).eq('id', id);
      if (input.action !== 'create') query = existing.auth_user_id === null ? query.is('auth_user_id', null) : query.eq('auth_user_id', existing.auth_user_id);
      const { data: saved, error: saveError } = await query.select(fields).single();
      if (saveError) {
        if (createdAuthUser) await admin.auth.admin.deleteUser(authUserId);
        reject(409, 'Não foi possível salvar o perfil. Revise a conta antes de tentar novamente.');
      }
      // Persist first: a database failure must never silently change an existing
      // account's email/password. The Auth operation is skipped for profile-only edits.
      if (!createdAuthUser && (safeProfile.email !== existing.email || password)) {
        const authChanges = { email: safeProfile.email, email_confirm: true };
        if (password) authChanges.password = password;
        const { error: identitySaveError } = await admin.auth.admin.updateUserById(authUserId, authChanges);
        if (identitySaveError) {
          const original = Object.fromEntries(fields.split(',').filter(field => !['id', 'auth_user_id', 'created_at'].includes(field)).map(field => [field, existing[field] ?? null]));
          // Compare every written field before compensation; never overwrite a
          // newer concurrent edit while restoring the original profile.
          let restore = admin.from(table).update(original).eq('id', id);
          restore = matchProfileSnapshot(restore, payload);
          const { data: restored, error: restoreError } = await restore.select('id').maybeSingle();
          if (restoreError || !restored) reject(503, 'A atualização da identidade falhou e o perfil precisa de revisão administrativa. Não repita a operação sem conferir a conta.');
          reject(409, 'Não foi possível atualizar a identidade. O perfil anterior foi restaurado.');
        }
      }
      return res.status(200).json({ success: true, profile: saved });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : error instanceof SyntaxError ? 400 : 500;
      // Never return Supabase errors, tokens, database details or passwords.
      return res.status(status).json({ error: error instanceof RequestError ? error.message : status === 400 ? 'JSON inválido.' : 'Não foi possível concluir a operação.' });
    }
  };
}
export default createSecurityUsersHandler();

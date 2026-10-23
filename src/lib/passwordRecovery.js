import { supabase } from './supabase';
import { getVerifiedProfile } from './auth';

const INVALID_LINK = 'Este link é inválido ou expirou. Solicite um novo link de acesso.';
const MAX_AGE = 15 * 60 * 1000;
export function parsePasswordLink(href) {
  const url = new URL(href);
  if (url.pathname !== '/auth/callback' || href.length > 20000) throw new Error(INVALID_LINK);
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.slice(1));
  if (query.has('error') || fragment.has('error') || query.has('error_code') || fragment.has('error_code')) throw new Error(INVALID_LINK);
  const tokenHash = query.get('token_hash');
  const code = query.get('code');
  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  const mechanisms = Number(Boolean(tokenHash)) + Number(Boolean(code)) + Number(Boolean(accessToken || refreshToken));
  if (mechanisms !== 1) throw new Error(INVALID_LINK);
  if (tokenHash) {
    const type = query.get('type');
    if (!['invite','recovery'].includes(type) || tokenHash.length > 2048 || /\s/.test(tokenHash)) throw new Error(INVALID_LINK);
    return { method: 'otp', tokenHash, type };
  }
  if (code) {
    if (code.length > 2048 || /\s/.test(code)) throw new Error(INVALID_LINK);
    return { method: 'pkce', code };
  }
  if (!accessToken || !refreshToken || !['invite','recovery'].includes(fragment.get('type'))) throw new Error(INVALID_LINK);
  return { method: 'implicit', accessToken, refreshToken };
}

export function createPasswordRecoveryController({ client, getProfile, clock = Date.now }) {
  let grant = null;
  let pendingCallback = null;
  let saving = false;
  const validateSession = async (session, allowVerifiedOtp = false) => {
    if (!session?.access_token) throw new Error(INVALID_LINK);
    const { data: { user }, error: userError } = await client.auth.getUser(session.access_token);
    if (userError || !user?.id || user.is_anonymous || !user.email_confirmed_at) throw new Error(INVALID_LINK);
    const { data, error: claimsError } = await client.auth.getClaims(session.access_token);
    const claims = data?.claims;
    if (claimsError || claims?.sub !== user.id || typeof claims?.session_id !== 'string') throw new Error(INVALID_LINK);
    // These are cryptographically validated claims, never the untrusted URL type or user_metadata.
    const method = (claims.amr || []).find(entry => {
      const name = typeof entry === 'string' ? entry : entry.method;
      const timestamp = typeof entry === 'string' ? claims.iat : entry.timestamp;
      const age = clock() - Number(timestamp) * 1000;
      return (['invite','recovery'].includes(name) || (allowVerifiedOtp && name === 'otp')) && Number.isFinite(age) && age >= -120000 && age <= MAX_AGE;
    });
    if (!method) throw new Error(INVALID_LINK);
    return { userId: user.id, sessionId: claims.session_id, method: typeof method === 'string' ? method : method.method };
  };
  return {
    begin(href, clearUrl = () => {}) {
      if (pendingCallback) return pendingCallback;
      pendingCallback = (async () => {
        try {
          // Strip callback credentials before any network request or error display.
          let link;
          try { link = parsePasswordLink(href); } finally { clearUrl(); }
          let response;
          if (link.method === 'otp') response = await client.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type });
          else if (link.method === 'pkce') response = await client.auth.exchangeCodeForSession(link.code);
          else response = await client.auth.setSession({ access_token: link.accessToken, refresh_token: link.refreshToken });
          if (response.error) throw new Error(INVALID_LINK);
          // Some hosted Auth versions issue the generic signed AMR 'otp' after verifyOtp.
          // Only the successful server-side verification of the specific invite/recovery token can authorize that case.
          const otpVerified = link.method === 'otp';
          const verified = await validateSession(response.data?.session, otpVerified);
          const profile = await getProfile();
          if (!profile || profile.authUserId !== verified.userId) throw new Error('Este acesso ainda não está liberado. Entre em contato com a administração.');
          grant = { ...verified, otpVerified, verifiedAt: clock() };
          return { method: grant.method, requiresMfa: Boolean(profile.mfaRequired) };
        } catch (error) {
          grant = null;
          await client.auth.signOut({ scope: 'local' }).catch(() => {});
          throw new Error(error.message === 'Este acesso ainda não está liberado. Entre em contato com a administração.' ? error.message : INVALID_LINK);
        }
      })();
      return pendingCallback;
    },
    async finish(password, confirmation) {
      if (saving) throw new Error('Aguarde a conclusão da alteração.');
      if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('Use uma senha de 12 a 128 caracteres.');
      if (password !== confirmation) throw new Error('As senhas não coincidem.');
      if (!grant || clock() - grant.verifiedAt > MAX_AGE) throw new Error(INVALID_LINK);
      saving = true;
      try {
        const { data: { session } } = await client.auth.getSession();
        const current = await validateSession(session, grant.otpVerified);
        if (current.userId !== grant.userId || current.sessionId !== grant.sessionId) throw new Error(INVALID_LINK);
        const profile = await getProfile();
        if (!profile || profile.authUserId !== grant.userId) throw new Error(INVALID_LINK);
        if (profile.mfaRequired) throw Object.assign(new Error('Confirme o autenticador antes de definir a senha.'), { code: 'MFA_REQUIRED' });
        const { error } = await client.auth.updateUser({ password });
        if (error) throw new Error('Não foi possível definir a senha. Escolha uma senha forte diferente das anteriores ou solicite um novo link.');
        grant = null;
        await client.auth.signOut({ scope: 'global' });
        return { success: true };
      } finally { saving = false; }
    },
    async cancel() {
      grant = null;
      await client.auth.signOut({ scope: 'local' });
    },
  };
}
export const passwordRecovery = createPasswordRecoveryController({ client: supabase, getProfile: getVerifiedProfile });

export async function requestPasswordRecovery(email, { origin = window.location.origin, captchaToken } = {}) {
  const normalized = String(email || '').trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Informe um e-mail válido.');
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('A recuperação requer uma conexão segura.');
  const { error } = await supabase.auth.resetPasswordForEmail(normalized, { redirectTo: new URL('/auth/callback', url.origin).href, ...(captchaToken ? { captchaToken } : {}) });
  // Never disclose whether an account exists or include provider errors in the UI.
  if (error && ['over_request_rate_limit','over_email_send_rate_limit','captcha_failed'].includes(error.code)) throw new Error('Não foi possível enviar agora. Aguarde alguns minutos e repita a verificação de segurança.');
  if (error && !['user_not_found','email_not_confirmed'].includes(error.code)) throw new Error('Não foi possível solicitar o link agora. Tente novamente em alguns minutos.');
  return 'Se este e-mail tiver acesso autorizado, você receberá as instruções para definir uma nova senha.';
}

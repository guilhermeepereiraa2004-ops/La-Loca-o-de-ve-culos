// Server-only: validate the original bearer, never trust a browser-supplied AAL or an unsigned JWT.
export async function requireVerifiedMfa(authClient, token) {
  const fail = (status, code) => { throw Object.assign(new Error(code === 'MFA_REQUIRED' ? 'Confirme o autenticador para continuar.' : 'Sessão inválida.'), { status, code }); };
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user?.id || user.is_anonymous) fail(401, 'AUTH_REQUIRED');
  const { data, error } = await authClient.auth.getClaims(token);
  if (error || data?.claims?.sub !== user.id) fail(401, 'AUTH_REQUIRED');
  const enabled = (user.factors || []).some(factor => factor.status === 'verified');
  if (enabled && data.claims.aal !== 'aal2') fail(403, 'MFA_REQUIRED');
  return { user, claims: data.claims, mfaEnabled: enabled };
}

import { verifyPasswordWithoutReplacingSession } from './passwordVerifier.js';
import { supabase, createPasswordVerifier, prepareMainSignIn, completeMainSignIn, signOutMainSession } from './supabase';

export const SYSTEM_PROFILE_FIELDS = 'id,auth_user_id,name,email,role,modules,created_at';
export const INVESTOR_PROFILE_FIELDS = 'id,auth_user_id,name,email,phone,cpf,address,status,bank,pix,created_at';

export function clearLegacySession() {
  for (const kind of ['localStorage', 'sessionStorage']) {
    try {
      const storage = window[kind];
      for (let index = storage.length - 1; index >= 0; index--) {
        const key = storage.key(index);
        if (key?.startsWith('la_')) storage.removeItem(key);
      }
    } catch { /* Storage can be blocked. Do not fail login or erase the sb- Auth session. */ }
  }
}

// UI state is derived from a verified identity and an RLS-protected profile.
// Authorization of data remains enforced by PostgreSQL RLS and server endpoints.
export async function getVerifiedProfile(client = supabase) {
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user || user.is_anonymous) return null;
  const { data: staff, error: staffError } = await client.from('system_users')
    .select(SYSTEM_PROFILE_FIELDS).eq('auth_user_id', user.id).maybeSingle();
  if (staffError) throw new Error('Não foi possível validar o acesso.');
  if (staff) return { ...staff, authUserId: user.id };
  const { data: investor, error: investorError } = await client.from('investors')
    .select(INVESTOR_PROFILE_FIELDS).eq('auth_user_id', user.id).maybeSingle();
  if (investorError) throw new Error('Não foi possível validar o acesso.');
  if (investor?.status === 'Ativo') return { ...investor, role: 'investidor', authUserId: user.id };
  return null;
}

export async function signIn(email, password, portal) {
  await prepareMainSignIn();
  try {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) throw new Error('Credenciais inválidas ou acesso indisponível.');
    const profile = await getVerifiedProfile();
    const permitted = profile && (portal === 'investor' ? profile.role === 'investidor' :
      portal === 'workshop' ? profile.role === 'administrador' || profile.modules?.includes('oficina') :
      ['administrador', 'gerente', 'funcionario'].includes(profile.role));
    if (!permitted) throw new Error('Credenciais inválidas ou acesso indisponível.');
    completeMainSignIn();
    return profile;
  } catch {
    await signOutMainSession();
    throw new Error('Credenciais inválidas ou acesso indisponível.');
  }
}

export async function verifyCurrentPassword(password) {
  return verifyPasswordWithoutReplacingSession(supabase, createPasswordVerifier, password);
}

export async function changeOwnPassword(currentPassword, password) {
  if (password.length < 12 || password.length > 128) return { success: false, error: 'Use uma senha de 12 a 128 caracteres.' };
  if (!await verifyCurrentPassword(currentPassword)) return { success: false, error: 'Senha atual inválida.' };
  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  return error ? { success: false, error: 'Não foi possível atualizar a senha.' } : { success: true };
}

export async function manageAccount(kind, action, profile, currentPassword) {
  const password = currentPassword ?? await new Promise(resolve => {
    window.dispatchEvent(new CustomEvent('la:confirm-admin-password', { detail: { resolve } }));
  });
  if (!password) throw new Error('Operação cancelada.');
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Sessão expirada. Entre novamente.');
  // getSession only transports the token; the endpoint revalidates it with getUser.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
  const allowed = kind === 'system' ? ['id','name','email','password','role','modules'] : ['id','name','email','password','phone','cpf','address','status','bank','pix'];
  const safeProfile = Object.fromEntries(allowed.filter(key => profile[key] !== undefined).map(key => [key, profile[key]]));
  if (kind === 'system' && ['create', 'update'].includes(action)) safeProfile.modules ??= [];
  const response = await fetch('/api/security-users', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ kind, action, profile: safeProfile, currentPassword: password }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível concluir a operação.');
  return action === 'activation-link' ? { profile: result.profile, activationLink: result.activationLink } : result.profile;
}

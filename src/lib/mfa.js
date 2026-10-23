import { supabase, createPasswordVerifier } from './supabase';

export function verifiedFactors(user) {
  return (user?.factors || []).filter(factor => factor.status === 'verified');
}
export async function getMfaStatusForUser(client, user) {
  const factors = verifiedFactors(user);
  if (!factors.length) return { enabled: false, required: false, currentLevel: 'aal1', factors: [] };
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) throw new Error('Sessão expirada. Entre novamente.');
  const { data, error } = await client.auth.getClaims(session.access_token);
  if (error || data?.claims?.sub !== user.id) throw new Error('Não foi possível validar a segunda etapa.');
  return { enabled: true, required: data.claims.aal !== 'aal2', currentLevel: data.claims.aal,
    factors: factors.filter(factor => factor.factor_type === 'totp').map(factor => ({ id: factor.id, name: factor.friendly_name || 'Autenticador' })),
  };
}
export async function verifyPasswordWithoutReplacingSession(client, verifierFactory, password) {
  if (typeof password !== 'string' || !password || password.length > 128) return false;
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email) return false;
  const verifier = verifierFactory();
  try {
    const { data, error: signInError } = await verifier.auth.signInWithPassword({ email: user.email, password });
    return !signInError && data?.user?.id === user.id;
  } finally { await verifier.auth.signOut({ scope: 'local' }).catch(() => {}); }
}
export function createMfaController({ client, verifierFactory }) {
  let pendingFactorId = null;
  let pendingOwnerId = null;
  const status = async () => {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) throw new Error('Sessão expirada. Entre novamente.');
    return { ...await getMfaStatusForUser(client, user), userId: user.id };
  };
  const codeValue = code => {
    if (typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('Informe o código de seis dígitos do autenticador.');
    return code;
  };
  return {
    status,
    async enroll(password) {
      const current = await status();
      if (pendingOwnerId !== current.userId) pendingFactorId = null;
      if (current.required) throw new Error('Confirme o autenticador atual antes de cadastrar outro.');
      if (!await verifyPasswordWithoutReplacingSession(client, verifierFactory, password)) throw new Error('Senha atual inválida.');
      if (pendingFactorId) throw new Error('Conclua ou cancele o cadastro em andamento.');
      const { data, error } = await client.auth.mfa.enroll({ factorType: 'totp', issuer: 'LA Locação', friendlyName: 'Autenticador ' + crypto.randomUUID().slice(0, 8) });
      if (error || !data?.id || !data?.totp?.qr_code) throw new Error('Não foi possível preparar o autenticador.');
      pendingFactorId = data.id;
      pendingOwnerId = current.userId;
      return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
    },
    async confirmEnrollment(code) {
      if (!pendingFactorId) throw new Error('Inicie o cadastro do autenticador novamente.');
      if ((await status()).userId !== pendingOwnerId) throw new Error('A conta mudou. Inicie o cadastro novamente.');
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId: pendingFactorId, code: codeValue(code) });
      if (error) throw new Error('Código inválido ou expirado. Aguarde o próximo código e tente novamente.');
      const current = await status();
      if (current.required || !current.factors.some(factor => factor.id === pendingFactorId)) throw new Error('Não foi possível confirmar a ativação da segunda etapa.');
      pendingFactorId = null;
      pendingOwnerId = null;
      return current;
    },
    async cancelEnrollment() {
      if (!pendingFactorId) return;
      const { data: { user } } = await client.auth.getUser();
      const factorId = pendingFactorId;
      const ownerId = pendingOwnerId;
      pendingFactorId = null;
      pendingOwnerId = null;
      // Never undo an enrollment that was already verified, even if the UI lost a response.
      if (!user || user.id !== ownerId || verifiedFactors(user).some(factor => factor.id === factorId)) return;
      await client.auth.mfa.unenroll({ factorId });
    },
    async verify(factorId, code) {
      const current = await status();
      if (!current.factors.some(factor => factor.id === factorId)) throw new Error('Autenticador não disponível nesta conta.');
      const { error } = await client.auth.mfa.challengeAndVerify({ factorId, code: codeValue(code) });
      if (error) throw new Error('Código inválido ou expirado. Aguarde o próximo código e tente novamente.');
      const confirmed = await status();
      if (confirmed.required || confirmed.currentLevel !== 'aal2') throw new Error('Não foi possível validar a segunda etapa.');
      return confirmed;
    },
    async removeBackupFactor(factorId, password) {
      const current = await status();
      if (current.required || current.factors.length < 2 || !current.factors.some(factor => factor.id === factorId)) throw new Error('Mantenha um autenticador ativo. Cadastre e teste outro antes de remover este.');
      if (!await verifyPasswordWithoutReplacingSession(client, verifierFactory, password)) throw new Error('Senha atual inválida.');
      const { error } = await client.auth.mfa.unenroll({ factorId });
      if (error) throw new Error('Não foi possível remover este autenticador.');
      return status();
    },
  };
}
export const mfaController = createMfaController({ client: supabase, verifierFactory: createPasswordVerifier });
export async function ensureMfa() {
  const current = await mfaController.status();
  if (!current.required) return true;
  const confirmed = await new Promise(resolve => window.dispatchEvent(new CustomEvent('la:confirm-mfa', { detail: { resolve } })));
  if (!confirmed || (await mfaController.status()).required) throw new Error('Confirme a segunda etapa para continuar.');
  return true;
}

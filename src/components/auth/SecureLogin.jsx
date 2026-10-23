import React, { useState } from 'react';
import { signIn, getVerifiedProfile } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { requestPasswordRecovery } from '../../lib/passwordRecovery';
import TurnstileChallenge from './TurnstileChallenge';
import MfaChallenge from './MfaChallenge';

export default function SecureLogin({ portal = 'admin', onBack, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [pendingMfa, setPendingMfa] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const emailRecoveryEnabled = import.meta.env.VITE_AUTH_EMAIL_RECOVERY_ENABLED === 'true';
  const title = portal === 'investor' ? 'Portal do Investidor' : portal === 'workshop' ? 'Oficina' : 'Administração';
  const handleSubmit = async event => {
    event.preventDefault();
    if (loading) return;
    setLoading(true); setError(''); setNotice('');
    try {
      if (recovering && !emailRecoveryEnabled) {
        setNotice('Solicite à administração um link individual para definir uma nova senha.');
      } else if (recovering) {
        setNotice(await requestPasswordRecovery(email, { captchaToken }));
      } else {
        const profile = await signIn(email, password, portal);
        setPassword('');
        if (profile.mfaRequired) setPendingMfa(true);
        else onLoginSuccess(profile);
      }
    } catch (err) { setPassword(''); setError(err.message); }
    finally {
      setLoading(false); setCaptchaToken(''); setCaptchaAttempt(previous => previous + 1);
    }
  };
  const toggleRecovery = () => { setRecovering(previous => !previous); setError(''); setNotice(''); setPassword(''); setCaptchaToken(''); };
  if (pendingMfa) return <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6"><MfaChallenge onVerified={async () => {
    const profile = await getVerifiedProfile();
    if (!profile || profile.mfaRequired) throw new Error('Não foi possível validar o acesso. Entre novamente.');
    onLoginSuccess(profile);
  }} onCancel={async () => { await supabase.auth.signOut({ scope: 'local' }); setPendingMfa(false); }} /></main>;
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
        <button type="button" onClick={onBack} className="text-sm text-neutral-400 mb-8">← Voltar ao site</button>
        <h1 className="text-3xl font-black mb-3">{recovering ? 'Recuperar acesso' : title}</h1>
        <p className="text-sm text-neutral-400 mb-8">{recovering ? emailRecoveryEnabled ? 'Receba um link seguro no e-mail da sua conta para definir uma nova senha.' : 'O acesso é recuperado por um link individual liberado pela administração.' : 'Entre com sua conta individual autorizada.'}</p>
        {recovering && !emailRecoveryEnabled ? <p role="status" className="text-sm text-neutral-200">Solicite à administração um link individual para definir uma nova senha.</p> : <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {notice && <p role="status" className="text-sm text-green-300">{notice}</p>}
          <label className="block text-sm">E-mail<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>
          {!recovering && <label className="block text-sm">Senha<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>}
          {recovering && <TurnstileChallenge action="password_recovery" resetKey={captchaAttempt} onToken={setCaptchaToken} />}
          <button type="submit" disabled={loading || (recovering && Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && !captchaToken)} className="w-full p-4 rounded-xl bg-[#C5A059] text-black font-bold disabled:opacity-50">{loading ? 'Aguarde…' : recovering ? 'Enviar link de recuperação' : 'Entrar'}</button>
        </form>}
        <button type="button" onClick={toggleRecovery} disabled={loading} className="text-sm text-neutral-400 mt-6">{recovering ? 'Voltar para entrar com senha' : 'Esqueceu a senha ou precisa definir uma nova?'}</button>
      </section>
    </main>
  );
}

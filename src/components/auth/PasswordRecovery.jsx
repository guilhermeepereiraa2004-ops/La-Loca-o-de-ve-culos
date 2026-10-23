import React, { useEffect, useState } from 'react';
import { passwordRecovery } from '../../lib/passwordRecovery';
import MfaChallenge from './MfaChallenge';

export default function PasswordRecovery() {
  const [status, setStatus] = useState('validating');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    passwordRecovery.begin(window.location.href, () => window.history.replaceState(null, '', '/auth/callback'))
      .then(result => { if (active) setStatus(result.requiresMfa ? 'mfa' : 'ready'); })
      .catch(err => { if (active) { setError(err.message); setStatus('invalid'); } });
    return () => { active = false; };
  }, []);
  const submit = async event => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      await passwordRecovery.finish(password, confirmation);
      setPassword(''); setConfirmation(''); setStatus('done');
    } catch (err) { setError(err.message); if (err.code === 'MFA_REQUIRED') setStatus('mfa'); }
    finally { setSaving(false); }
  };
  const leave = async () => { await passwordRecovery.cancel().catch(() => {}); window.location.replace('/'); };
  if (status === 'mfa') return <main className="min-h-screen bg-neutral-950 flex items-center justify-center p-6"><MfaChallenge onVerified={() => { setError(''); setStatus('ready'); }} onCancel={leave} /></main>;
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 space-y-6">
        <h1 className="text-3xl font-black">Definir nova senha</h1>
        {status === 'validating' && <p role="status">Validando seu link de acesso…</p>}
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        {status === 'ready' && <form onSubmit={submit} className="space-y-6">
          <p className="text-sm text-neutral-400">Escolha uma senha exclusiva, com pelo menos 12 caracteres.</p>
          <label className="block text-sm">Nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>
          <label className="block text-sm">Confirme a nova senha<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>
          <button disabled={saving} type="submit" className="w-full p-4 rounded-xl bg-[#C5A059] text-black font-bold disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>}
        {status === 'done' && <p role="status" className="text-sm text-green-300">Senha definida com sucesso. Entre novamente com sua nova senha.</p>}
        {status !== 'validating' && <button type="button" onClick={leave} className="text-sm text-neutral-400">{status === 'done' ? 'Ir para o site e entrar' : 'Voltar ao site'}</button>}
      </section>
    </main>
  );
}

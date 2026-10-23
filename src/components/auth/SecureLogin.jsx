import React, { useState } from 'react';
import { signIn } from '../../lib/auth';

// Authentication and throttling are performed by Supabase Auth, never by a list of passwords.
export default function SecureLogin({ portal = 'admin', onBack, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const title = portal === 'investor' ? 'Portal do Investidor' : portal === 'workshop' ? 'Oficina' : 'Administração';
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const profile = await signIn(email, password, portal);
      setPassword('');
      onLoginSuccess(profile);
    } catch (err) {
      setPassword('');
      setError(err.message);
    } finally { setLoading(false); }
  };
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8">
        <button type="button" onClick={onBack} className="text-sm text-neutral-400 mb-8">← Voltar ao site</button>
        <h1 className="text-3xl font-black mb-3">{title}</h1>
        <p className="text-sm text-neutral-400 mb-8">Entre com sua conta individual autorizada.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <label className="block text-sm">E-mail<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>
          <label className="block text-sm">Senha<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="block w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700" /></label>
          <button type="submit" disabled={loading} className="w-full p-4 rounded-xl bg-[#C5A059] text-black font-bold disabled:opacity-50">{loading ? 'Validando acesso…' : 'Entrar'}</button>
        </form>
      </section>
    </main>
  );
}

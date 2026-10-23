import React, { useEffect, useState } from 'react';
import { mfaController } from '../../lib/mfa';

export default function MfaChallenge({ onVerified, onCancel }) {
  const [factors, setFactors] = useState([]);
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    mfaController.status().then(status => {
      if (!active) return;
      setFactors(status.factors); setFactorId(status.factors[0]?.id || '');
      if (!status.factors.length) setError('Nenhum autenticador disponível. Solicite revisão do acesso ao responsável pelo sistema.');
    }).catch(() => { if (active) setError('Não foi possível verificar o autenticador. Entre novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const submit = async event => {
    event.preventDefault(); if (loading) return;
    setLoading(true); setError('');
    try { await mfaController.verify(factorId, code); setCode(''); await onVerified(); }
    catch (err) { setError(err.message); setCode(''); }
    finally { setLoading(false); }
  };
  return <section className="w-full max-w-md rounded-3xl border border-neutral-700 bg-neutral-900 p-8 text-white space-y-6">
    <h1 className="text-2xl font-black">Confirme a segunda etapa</h1>
    <p className="text-sm text-neutral-300">Digite o código do aplicativo autenticador. Seu acesso continua protegido até a confirmação.</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <form onSubmit={submit} className="space-y-5">
      {factors.length > 1 && <label className="block text-sm">Autenticador<select value={factorId} onChange={event => setFactorId(event.target.value)} className="w-full mt-2 p-3 rounded-lg bg-neutral-950">{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></label>}
      <label className="block text-sm">Código de seis dígitos<input autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="w-full mt-2 p-4 rounded-xl bg-neutral-950 border border-neutral-700 tracking-[0.4em]" /></label>
      <button type="submit" disabled={loading || !factorId} className="w-full rounded-xl bg-[#C5A059] p-4 font-bold text-black disabled:opacity-50">{loading ? 'Validando…' : 'Confirmar código'}</button>
    </form>
    <p className="text-xs text-neutral-400">Sem o aparelho? Use seu autenticador de reserva. A recuperação do acesso exige conferência de identidade pelo responsável do sistema.</p>
    <button type="button" onClick={onCancel} className="text-sm text-neutral-300">Cancelar</button>
  </section>;
}

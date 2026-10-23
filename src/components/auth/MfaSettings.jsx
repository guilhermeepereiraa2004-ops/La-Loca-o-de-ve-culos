import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { mfaController } from '../../lib/mfa';
import MfaChallenge from './MfaChallenge';

export default function MfaSettings() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [backedUp, setBackedUp] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const refresh = async () => { const next = await mfaController.status(); setStatus(next); window.dispatchEvent(new Event('la:mfa-state-changed')); return next; };
  const show = async () => { setOpen(true); setStatus(null); setBusy(true); setError(''); setNotice(''); try { await refresh(); } catch (err) { setError(err.message); } finally { setBusy(false); } };
  const close = async () => {
    if (busy) return;
    await mfaController.cancelEnrollment().catch(() => {});
    setEnrollment(null); setPassword(''); setCode(''); setBackedUp(false); setShowSecret(false); setOpen(false);
  };
  const enroll = async event => {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { setEnrollment(await mfaController.enroll(password)); setPassword(''); }
    catch (err) { setError(err.message); setPassword(''); }
    finally { setBusy(false); }
  };
  const confirm = async event => {
    event.preventDefault(); if (busy || !backedUp) return;
    setBusy(true); setError('');
    try {
      await mfaController.confirmEnrollment(code);
      setEnrollment(null); setCode(''); setShowSecret(false); setBackedUp(false);
      await refresh(); setNotice('Autenticador confirmado. A segunda etapa está ativa para sua conta.');
    } catch (err) { setError(err.message); setCode(''); }
    finally { setBusy(false); }
  };
  const remove = async factorId => {
    if (busy) return; setBusy(true); setError('');
    try { await mfaController.removeBackupFactor(factorId, password); setPassword(''); await refresh(); setNotice('Autenticador removido. O autenticador restante continua ativo.'); }
    catch (err) { setError(err.message); setPassword(''); }
    finally { setBusy(false); }
  };
  const qr = enrollment?.qrCode?.startsWith('data:image/') ? enrollment.qrCode : enrollment ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(enrollment.qrCode) : '';
  return <>
    <button type="button" onClick={show} className="rounded-lg border border-neutral-200 px-3 py-2 text-xs font-bold text-neutral-700">Segurança 2FA</button>
    {open && createPortal(<div role="dialog" aria-modal="true" aria-label="Segurança da conta" className="fixed inset-0 z-[1250] overflow-y-auto bg-black/80 p-6 grid place-items-center">
      {status?.required ? <MfaChallenge onVerified={refresh} onCancel={close} /> : <section className="max-w-lg w-full rounded-3xl bg-white text-neutral-900 p-8 space-y-5 shadow-xl">
        <h2 id="mfa-settings-title" className="text-2xl font-black">Segurança da conta</h2>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
        {!enrollment && <>
          <p className="text-sm text-neutral-600">{status?.enabled ? 'Sua segunda etapa está ativa. Mantenha um autenticador de reserva antes de trocar de aparelho.' : 'Ative um aplicativo autenticador. Seu acesso atual permanece disponível até confirmar o primeiro código.'}</p>
          {status?.factors.map(factor => <div key={factor.id} className="rounded-xl border border-neutral-200 p-3 flex gap-3 items-center justify-between"><span className="text-sm">{factor.name}</span>{status.factors.length > 1 && <button disabled={busy} type="button" onClick={() => remove(factor.id)} className="text-xs font-bold text-red-700">Remover com senha atual</button>}</div>)}
          <form onSubmit={enroll} className="space-y-4">
            <label className="block text-sm font-bold">Sua senha atual<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="block w-full mt-2 rounded-xl border border-neutral-300 p-3" /></label>
            <button disabled={busy || !status} className="rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Aguarde…' : status?.enabled ? 'Adicionar autenticador de reserva' : 'Preparar autenticador'}</button>
          </form>
        </>}
        {enrollment && <form onSubmit={confirm} className="space-y-4">
          <p className="text-sm text-neutral-600">Escaneie este QR no seu aplicativo autenticador. Guarde uma cópia segura em outro aparelho ou gerenciador antes de confirmar.</p>
          <img src={qr} alt="QR privado para configurar seu autenticador" className="w-52 h-52 mx-auto bg-white" />
          <button type="button" onClick={() => setShowSecret(previous => !previous)} className="text-xs font-bold">{showSecret ? 'Ocultar chave de configuração' : 'Configurar manualmente'}</button>
          {showSecret && <p className="break-all rounded-lg bg-neutral-100 p-3 font-mono text-xs select-all">{enrollment.secret}</p>}
          <p className="text-xs text-neutral-500">O QR e a chave são privados. Não envie em conversas ou capturas de tela.</p>
          <label className="flex gap-2 items-start text-sm"><input type="checkbox" checked={backedUp} onChange={event => setBackedUp(event.target.checked)} />Preparei uma cópia segura do autenticador para recuperar meu acesso sem e-mail.</label>
          <label className="block text-sm font-bold">Código de seis dígitos<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} className="w-full mt-2 rounded-xl border border-neutral-300 p-3 tracking-[0.4em]" /></label>
          <button disabled={busy || !backedUp} className="w-full rounded-xl bg-[#C5A059] p-3 font-bold disabled:opacity-50">{busy ? 'Validando…' : 'Confirmar e ativar segunda etapa'}</button>
        </form>}
        <button type="button" disabled={busy} onClick={close} className="text-sm font-bold text-neutral-500 disabled:opacity-50">{enrollment ? 'Cancelar cadastro sem ativar' : 'Fechar'}</button>
      </section>}
    </div>, document.body)}
  </>;
}

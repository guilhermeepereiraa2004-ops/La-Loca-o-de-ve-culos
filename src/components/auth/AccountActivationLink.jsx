import React, { useState } from 'react';
import { manageAccount } from '../../lib/auth';

// Links are bearer credentials: keep them only in this temporary, authenticated modal.
export default function AccountActivationLink({ kind, profileId }) {
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const generate = async () => {
    if (busy) return;
    setBusy(true); setError(''); setLink(''); setCopied(false);
    try {
      const result = await manageAccount(kind, 'activation-link', { id: profileId });
      if (!result.activationLink) throw new Error('Não foi possível gerar o link.');
      setLink(result.activationLink);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <>
    <button type="button" disabled={busy || !profileId} onClick={generate} className="px-4 py-3 rounded-xl bg-neutral-100 text-neutral-900 text-xs font-bold disabled:opacity-50">{busy ? 'Gerando…' : 'Gerar link de nova senha'}</button>
    {error && <p role="alert" className="text-xs text-red-600 mt-2">{error}</p>}
    {link && <div role="dialog" aria-modal="true" aria-labelledby="activation-link-title" className="fixed inset-0 z-[1100] bg-black/70 grid place-items-center p-6">
      <section className="bg-white text-neutral-900 w-full max-w-lg p-8 rounded-2xl space-y-5">
        <h2 id="activation-link-title" className="text-lg font-black">Link privado de definição de senha</h2>
        <p className="text-sm text-neutral-600">Entregue somente ao titular após confirmar sua identidade. O link é de uso único e expira conforme o prazo configurado no acesso.</p>
        <input aria-label="Link privado de ativação" readOnly value={link} className="w-full p-3 border border-neutral-300 rounded-lg text-sm" onFocus={event => event.target.select()} />
        <p className="text-xs text-neutral-500">Nenhum e-mail foi enviado. Ao fechar, o link deixa de aparecer no painel.</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => { setLink(''); setCopied(false); }} className="px-4 py-3">Fechar</button>
          <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError('Selecione o link e copie manualmente.'); } }} className="px-4 py-3 bg-neutral-900 text-white rounded-lg">{copied ? 'Copiado' : 'Copiar link'}</button>
        </div>
      </section>
    </div>}
  </>;
}

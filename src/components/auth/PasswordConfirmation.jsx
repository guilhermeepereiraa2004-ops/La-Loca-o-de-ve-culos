import React, { useEffect, useRef, useState } from 'react';

// Passwords remain only in this transient form and the authenticated HTTPS request.
export default function PasswordConfirmation() {
  const pending = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  useEffect(() => {
    const handle = event => {
      pending.current?.(null);
      pending.current = event.detail.resolve;
      setPassword('');
      setIsOpen(true);
    };
    window.addEventListener('la:confirm-admin-password', handle);
    return () => { window.removeEventListener('la:confirm-admin-password', handle); pending.current?.(null); };
  }, []);
  const finish = value => {
    pending.current?.(value);
    pending.current = null;
    setPassword('');
    setIsOpen(false);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-labelledby="confirm-password-title" onKeyDown={event => { if (event.key === 'Escape') finish(null); }}>
      <form className="bg-white text-neutral-900 w-full max-w-md rounded-2xl p-8 space-y-6" onSubmit={event => { event.preventDefault(); finish(password); }}>
        <h2 id="confirm-password-title" className="text-lg font-black">Confirme sua identidade</h2>
        <p className="text-sm text-neutral-600">Informe sua senha atual de administrador para autorizar esta alteração.</p>
        <label className="block text-sm font-bold">Sua senha atual<input autoFocus type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} className="block border border-neutral-300 w-full p-4 mt-2 rounded-lg" /></label>
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => finish(null)} className="px-4 py-3">Cancelar</button>
          <button type="submit" className="bg-neutral-900 text-white px-5 py-3 rounded-lg">Confirmar</button>
        </div>
      </form>
    </div>
  );
}

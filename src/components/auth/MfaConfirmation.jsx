import React, { useEffect, useRef, useState } from 'react';
import MfaChallenge from './MfaChallenge';
export default function MfaConfirmation() {
  const pending = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handle = event => { pending.current?.(false); pending.current = event.detail.resolve; setOpen(true); };
    window.addEventListener('la:confirm-mfa', handle);
    return () => { window.removeEventListener('la:confirm-mfa', handle); pending.current?.(false); };
  }, []);
  const finish = result => { pending.current?.(result); pending.current = null; setOpen(false); };
  if (!open) return null;
  return <div role="dialog" aria-modal="true" aria-label="Confirmação em duas etapas" className="fixed inset-0 z-[1300] grid place-items-center bg-black/80 p-6"><MfaChallenge onVerified={() => finish(true)} onCancel={() => finish(false)} /></div>;
}

import React, { useEffect, useRef, useState } from 'react';
let loader;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!loader) loader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
  return loader;
}
export default function TurnstileChallenge({ onToken, resetKey, action = 'public_interest' }) {
  const container = useRef(null);
  const callback = useRef(onToken);
  callback.current = onToken;
  const [error, setError] = useState(false);
  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (!sitekey) return;
    let active = true;
    let id;
    loadTurnstile().then(() => window.turnstile.ready(() => {
      if (!active || !container.current) return;
      id = window.turnstile.render(container.current, { sitekey, action, callback: token => callback.current(token), 'expired-callback': () => callback.current(''), 'error-callback': () => { callback.current(''); setError(true); } });
    })).catch(() => { if (active) setError(true); });
    return () => { active = false; if (id !== undefined) window.turnstile?.remove(id); };
  }, [sitekey, resetKey, action]);
  if (!sitekey) return null;
  return <div><div ref={container} />{error && <p role="alert" className="text-xs text-red-600">A verificação não carregou. Reabra o formulário para tentar novamente.</p>}</div>;
}

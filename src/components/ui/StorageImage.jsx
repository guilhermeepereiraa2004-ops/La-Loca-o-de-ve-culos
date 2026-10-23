import React, { useEffect, useRef, useState } from 'react';
import { getPublicUrl, hydrateStorageReferences } from '../../utils/supabaseStorage';

// A long inspection history must not sign every photo before the list can render.
export default function StorageImage({ src, alt = 'Foto da vistoria', ...props }) {
  const element = useRef(null);
  const [visible, setVisible] = useState(false);
  const [resolved, setResolved] = useState(null);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    if (visible && src) {
      hydrateStorageReferences(src)
        .then(value => { if (active) setResolved({ source: src, url: getPublicUrl(value) }); })
        .catch(() => { if (active) setResolved({ source: src, url: null }); });
    }
    return () => { active = false; };
  }, [src, visible]);
  const url = resolved?.source === src ? resolved.url : getPublicUrl(src);
  return <img {...props} ref={element} src={url || undefined} alt={alt} loading="lazy" aria-busy={visible && resolved?.source !== src} />;
}

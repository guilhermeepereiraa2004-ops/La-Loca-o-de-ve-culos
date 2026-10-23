import { useEffect, useState } from 'react';
import { hydrateStorageReferences } from '../utils/supabaseStorage';

// Resolve only the record currently being viewed; never rewrite persisted data.
export function useStorageValue(source) {
  const [resolved, setResolved] = useState(null);
  useEffect(() => {
    let active = true;
    if (source) {
      hydrateStorageReferences(source)
        .then(value => { if (active) setResolved({ source, value }); })
        .catch(() => { if (active) setResolved({ source, value: source }); });
    }
    return () => { active = false; };
  }, [source]);
  return {
    value: resolved?.source === source ? resolved.value : source,
    loading: Boolean(source) && resolved?.source !== source,
  };
}

// Only Auth transport data is retained. Profiles, roles and permissions are fetched again.
export function createTabSessionStorage({ storageKey, stableKey, getStorage = () => window.sessionStorage }) {
  const memory = new Map();
  let unavailable = false;
  let blocked = false;
  let revision = 0;
  const keyFor = key => key.startsWith(storageKey) ? stableKey + key.slice(storageKey.length) : key;
  const backing = operation => {
    if (unavailable) return;
    try { return operation(getStorage()); } catch { unavailable = true; }
  };
  const adapter = {
    getItem(key) {
      if (blocked) return null;
      const mapped = keyFor(key);
      const result = backing(storage => storage.getItem(mapped));
      if (!unavailable) {
        if (result == null) memory.delete(mapped); else memory.set(mapped, result);
        return result ?? null;
      }
      return memory.get(mapped) ?? null;
    },
    setItem(key, value) {
      if (blocked) return;
      const mapped = keyFor(key);
      memory.set(mapped, value);
      backing(storage => storage.setItem(mapped, value));
    },
    removeItem(key) {
      const mapped = keyFor(key);
      memory.delete(mapped);
      // A quota error may block writes while removal remains available.
      try { getStorage().removeItem(mapped); } catch { unavailable = true; }
    },
    beginLogout() {
      let token = null;
      try { token = JSON.parse(adapter.getItem(storageKey))?.access_token || null; } catch { /* Untrusted/corrupt transport is discarded. */ }
      blocked = true;
      const operation = ++revision;
      for (const suffix of ['', '-user', '-code-verifier']) adapter.removeItem(storageKey + suffix);
      memory.clear();
      return { token, operation };
    },
    finishLogout(operation) {
      if (operation !== revision) return;
      for (const suffix of ['', '-user', '-code-verifier']) adapter.removeItem(storageKey + suffix);
      memory.clear();
    },
    allowSignIn() { revision++; blocked = false; },
  };
  return adapter;
}

export function createSessionRestorer({ getProfile, onProfile, onReady, onRestore, onAnonymous }) {
  let active = true;
  let revision = 0;
  let signingOut = false;
  let initial = true;
  let queued;
  const current = ticket => active && !signingOut && revision === ticket;
  const validate = async () => {
    if (!active || signingOut) return;
    const ticket = ++revision;
    let profile = null;
    try { profile = await getProfile(); } catch { /* Do not render private data on a failed verification. */ }
    if (!current(ticket)) return;
    onProfile(profile);
    if (initial && profile) onRestore(profile);
    if (!profile) onAnonymous();
    initial = false;
    onReady();
  };
  return {
    validate,
    event(event) {
      if (!active || signingOut || !['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event)) return;
      // Events may come from another client. Re-read this client's session and verify remotely.
      const ticket = ++revision;
      clearTimeout(queued);
      queued = setTimeout(() => { if (current(ticket)) void validate(); }, 0);
    },
    beginLogout() {
      signingOut = true; revision++; initial = false; clearTimeout(queued);
      onProfile(null); onAnonymous(); onReady();
    },
    allowSignIn() { if (active) signingOut = false; },
    dispose() { active = false; revision++; clearTimeout(queued); },
  };
}

export async function prepareSessionSignIn(client, storage) {
  storage.beginLogout();
  await client.auth.stopAutoRefresh();
  // SDK getSession uses the same lock as token refresh. Drain a previous refresh
  // while writes remain blocked before allowing a new identity to sign in.
  await client.auth.getSession();
  storage.allowSignIn();
}

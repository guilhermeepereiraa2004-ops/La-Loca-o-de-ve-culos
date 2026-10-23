import { createClient } from '@supabase/supabase-js'
import { createTabSessionStorage, prepareSessionSignIn } from './browserSession.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing. Persistence will not work.')
}

const projectId = (supabaseUrl || 'https://placeholder.supabase.co').split('://')[1].split('.')[0];
// Unique runtime key isolates Auth BroadcastChannel/locks even when a tab is duplicated.
const storageKey = 'sb-' + projectId + '-runtime-' + crypto.randomUUID();
export const browserSessionStorage = createTabSessionStorage({ storageKey, stableKey: 'sb-' + projectId + '-auth-token' });
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  { auth: { persistSession: true, storage: browserSessionStorage, storageKey, autoRefreshToken: true, detectSessionInUrl: false } }
)

export const prepareMainSignIn = () => prepareSessionSignIn(supabase, browserSessionStorage);
export function completeMainSignIn() { void supabase.auth.startAutoRefresh().catch(() => {}); }
export async function signOutMainSession() {
  const { token, operation } = browserSessionStorage.beginLogout();
  // Auth's own signOut delegates to admin.signOut with the current bearer. Capture it
  // before clearing locally so an offline/failed request cannot restore the session.
  void supabase.auth.stopAutoRefresh().catch(() => {});
  try {
    // With the adapter blocked there is no stored bearer: this only clears SDK
    // state and notifies subscribers, before another login may acquire its lock.
    await supabase.auth.signOut({ scope: 'local' });
    if (token) await supabase.auth.admin.signOut(token, 'local');
  }
  catch { /* Local logout is already complete; never retain credentials on network failure. */ }
  finally { browserSessionStorage.finishLogout(operation); }
}

// Password confirmation uses a short-lived client and preserves the active panel session.
export const createPasswordVerifier = () => createClient(
  supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder',
  { auth: { persistSession: false, storageKey: 'sb-' + projectId + '-ephemeral-' + crypto.randomUUID(), autoRefreshToken: false, detectSessionInUrl: false } }
);

// Recovery grants remain in memory and cannot replace or restore the panel session.
export const recoverySupabase = createPasswordVerifier();

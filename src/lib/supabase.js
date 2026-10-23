import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key missing. Persistence will not work.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } }
)

// Password step-up uses a separate short-lived session and never downgrades the active AAL2 session.
export const createPasswordVerifier = () => createClient(
  supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder',
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);

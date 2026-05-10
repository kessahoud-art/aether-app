import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL  = 'https://wspyxasruurcowhwkbyk.supabase.co'
const SUPABASE_ANON = 'REMPLACE_PAR_TA_CLE_ANON'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storageKey:         'aether-auth',
  }
})

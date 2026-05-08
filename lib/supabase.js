import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

export const supabase = createClient(
  'REMPLACE_PAR_TON_URL_SUPABASE',
  'REMPLACE_PAR_TA_CLE_ANON'
)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL  = 'https://wspyxasruurcowhwkbyk.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcHl4YXNydXVyY293aHdrYnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMjk1MTgsImV4cCI6MjA5MzgwNTUxOH0.z1YKLMoSXqPqtQ5hqDpNOSVIsCtQqsDh75CAhtGx1n8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storageKey:         'aether-auth',
  }
})

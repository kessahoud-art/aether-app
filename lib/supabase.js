import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL  = 'REMPLACE_PAR_TON_URL'
const SUPABASE_ANON = 'REMPLACE_PAR_TA_CLE_ANON'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
    storageKey:         'aether-auth',
  }
})

// Attendre que la session soit prête
// Résout le race condition principal
export async function waitForSession() {
  return new Promise((resolve) => {
    // Essayer d'abord depuis le cache local (instantané)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        resolve(session)
        return
      }
      // Sinon écouter le changement d'état
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          subscription.unsubscribe()
          resolve(session)
        }
      )
      // Timeout de sécurité après 3 secondes
      setTimeout(() => {
        subscription.unsubscribe()
        resolve(null)
      }, 3000)
    })
  })
}

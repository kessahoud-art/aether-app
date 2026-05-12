import { supabase } from './supabase.js'

export async function getUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      console.error('[auth] getSession error:', error)
      return null
    }
    if (!session?.user) {
      console.warn('[auth] getSession: aucune session')
      return null
    }
    console.log('[auth] Session OK:', session.user.email, '|', session.user.id)
    return session.user
  } catch(e) {
    console.error('[auth] getUser exception:', e.message)
    return null
  }
}

export async function getEntity(userId) {
  if (!userId) {
    console.warn('[auth] getEntity: userId manquant')
    return null
  }
  try {
    console.log('[auth] getEntity query pour:', userId)
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[auth] getEntity error:', error.code, error.message)
      return null
    }
    if (!data) {
      console.warn('[auth] getEntity: aucune ligne pour', userId)
      return null
    }
    console.log('[auth] getEntity OK:', data.username, '| karma:', data.karma_score)
    return data
  } catch(e) {
    console.error('[auth] getEntity exception:', e.message)
    return null
  }
}

export async function getOrCreateEntity(userId, email) {
  if (!userId) {
    console.warn('[auth] getOrCreateEntity: userId manquant')
    return null
  }

  console.log('[auth] getOrCreateEntity pour:', userId)

  // 1. Chercher l'entity existante
  let entity = await getEntity(userId)
  if (entity) {
    console.log('[auth] Entity trouvée:', entity.username)
    return entity
  }

  // 2. Créer si absente (trigger SQL raté)
  console.warn('[auth] Entity absente → création manuelle')
  try {
    const base = (email || 'user')
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 20)

    const username = base + '_' + Math.floor(Math.random() * 9000 + 1000)

    console.log('[auth] Tentative INSERT entity:', username)

    const { data, error } = await supabase
      .from('entities')
      .insert({
        id:           userId,
        username:     username,
        display_name: base,
        aura_color:   'terre',
        wisdom_level: 1,
        karma_score:  0,
        onboarding_completed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[auth] INSERT entity error:', error.code, error.message)
      // Conflit unique → entity existe déjà, réessayer GET
      if (error.code === '23505') {
        console.log('[auth] Conflit → retry getEntity')
        return await getEntity(userId)
      }
      return null
    }

    console.log('[auth] Entity créée:', data.username)

    // Créer le wallet
    const { error: walletErr } = await supabase
      .from('wallets')
      .insert({ entity_id: userId, balance: 0, total_in: 0, total_out: 0 })
    if (walletErr) console.warn('[auth] Wallet creation warning:', walletErr.message)

    return data
  } catch(e) {
    console.error('[auth] createEntity exception:', e.message)
    return null
  }
}

export async function requireAuth(redirect = '/login') {
  try {
    const user = await getUser()
    if (!user) {
      console.warn('[auth] requireAuth: pas de user → redirect', redirect)
      window.location.href = redirect
      return null
    }
    return user
  } catch(e) {
    console.error('[auth] requireAuth exception:', e.message)
    window.location.href = redirect
    return null
  }
}

export async function logout() {
  try { await supabase.auth.signOut() } catch(e) {}
  window.location.href = '/login'
}

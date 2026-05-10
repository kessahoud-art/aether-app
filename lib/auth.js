import { supabase } from './supabase.js'

// Attendre que la session soit restaurée
async function waitSession(maxWait = 2000) {
  const step = 200
  let waited = 0
  while (waited < maxWait) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session
    await new Promise(r => setTimeout(r, step))
    waited += step
  }
  return null
}

export async function getUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user || null
  } catch(e) {
    console.error('[auth] getUser:', e)
    return null
  }
}

export async function getEntity(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) { console.error('[auth] getEntity:', error); return null }
    return data
  } catch(e) {
    console.error('[auth] getEntity exception:', e)
    return null
  }
}

export async function getOrCreateEntity(userId, email) {
  if (!userId) return null

  let entity = await getEntity(userId)
  if (entity) return entity

  console.warn('[auth] Entity absente → création manuelle')
  try {
    const base = (email || 'user').split('@')[0]
      .toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const username = base + '_' + Math.floor(Math.random() * 9000 + 1000)

    const { data, error } = await supabase
      .from('entities')
      .insert({
        id: userId, username,
        display_name: base,
        aura_color: 'terre',
        wisdom_level: 1, karma_score: 0,
        onboarding_completed: false,
      })
      .select().single()

    if (error) {
      console.error('[auth] createEntity:', error)
      return await getEntity(userId)
    }

    await supabase.from('wallets')
      .insert({ entity_id: userId, balance: 0, total_in: 0, total_out: 0 })

    return data
  } catch(e) {
    console.error('[auth] getOrCreateEntity exception:', e)
    return null
  }
}

export async function requireAuth(redirect = '/login') {
  try {
    // Attendre que la session soit prête (critique sur mobile)
    const session = await waitSession(2000)

    if (!session?.user) {
      console.warn('[auth] Pas de session après attente → redirect', redirect)
      window.location.href = redirect
      return null
    }

    console.log('[auth] Session OK:', session.user.email, session.user.id)
    return session.user
  } catch(e) {
    console.error('[auth] requireAuth exception:', e)
    window.location.href = redirect
    return null
  }
}

export async function logout() {
  try { await supabase.auth.signOut() } catch(e) {}
  window.location.href = '/login'
}

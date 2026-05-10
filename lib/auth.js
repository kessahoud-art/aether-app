import { supabase, waitForSession } from './supabase.js'

export async function getUser() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    return session.user
  } catch (err) {
    console.error('[auth] getUser error:', err)
    return null
  }
}

export async function getEntity(userId) {
  if (!userId) {
    console.warn('[auth] getEntity appelé sans userId')
    return null
  }
  try {
    const { data, error } = await supabase
      .from('entities')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[auth] getEntity error:', error)
      return null
    }
    return data
  } catch (err) {
    console.error('[auth] getEntity exception:', err)
    return null
  }
}

export async function getOrCreateEntity(userId, email) {
  // Tenter de récupérer l'entity
  let entity = await getEntity(userId)

  // Si pas trouvé → créer manuellement (fallback trigger)
  if (!entity) {
    console.warn('[auth] Entity manquante → création manuelle pour', userId)
    const base = email ? email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'_') : 'user'
    const username = base + '_' + Math.floor(Math.random() * 9000 + 1000)

    const { data, error } = await supabase
      .from('entities')
      .insert({
        id:           userId,
        username:     username,
        display_name: email ? email.split('@')[0] : 'Utilisateur',
        aura_color:   'terre',
        wisdom_level: 1,
        karma_score:  0,
        onboarding_completed: false,
      })
      .select()
      .single()

    if (error) {
      console.error('[auth] Création entity échouée:', error)
      // Peut-être qu'elle existe déjà (conflit) → réessayer
      entity = await getEntity(userId)
    } else {
      entity = data
      // Créer le wallet aussi
      await supabase.from('wallets')
        .insert({ entity_id: userId, balance: 0, total_in: 0, total_out: 0 })
        .single()
    }
  }

  return entity
}

export async function requireAuth(redirectTo = '/login') {
  try {
    const session = await waitForSession()

    if (!session) {
      console.warn('[auth] Pas de session → redirection vers', redirectTo)
      window.location.href = redirectTo
      return null
    }

    return session.user
  } catch (err) {
    console.error('[auth] requireAuth error:', err)
    window.location.href = redirectTo
    return null
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    console.error('[auth] logout error:', err)
  }
  window.location.href = '/login'
}

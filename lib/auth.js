import { supabase } from './supabase.js'
import { apiGetEntity } from './api.js'

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user || null
}

export async function requireAuth(redirect = '/login') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    window.location.href = redirect
    return null
  }
  return session.user
}

export async function getOrCreateEntity() {
  // Délégué à l'API qui gère tout côté serveur
  const { data, error } = await apiGetEntity()
  if (error) { console.error('[auth] getOrCreateEntity:', error); return null }
  return data
}

export async function getEntity(userId) {
  // Lecture directe Supabase (SELECT est public)
  const { data } = await supabase
    .from('entities').select('*').eq('id', userId).single()
  return data || null
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}

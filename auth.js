import { supabase } from './supabase.js'

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getEntity(userId) {
  const { data } = await supabase
    .from('entities')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function requireAuth() {
  const user = await getUser()
  if (!user) { window.location.href = '/login'; return null }
  return user
}

export async function logout() {
  await supabase.auth.signOut()
  window.location.href = '/login'
}
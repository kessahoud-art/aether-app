import { supabase } from './supabase.js'

const BASE = ''

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function call(method, path, body = null) {
  const token = await getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  try {
    const res  = await fetch(`${BASE}${path}`, opts)
    const json = await res.json()
    if (!res.ok || !json.success) {
      return { data: null, error: json.error || 'Erreur serveur' }
    }
    return { data: json.data, error: null }
  } catch(e) {
    return { data: null, error: e.message }
  }
}

export async function apiGetEntity() {
  return call('GET', '/api/entities/me')
}

export async function apiUpdateEntity(updates) {
  return call('PUT', '/api/entities/update', updates)
}

export async function apiCreateSouffle({ content, emotion, type, concile_id }) {
  return call('POST', '/api/souffles/create', { content, emotion, type, concile_id })
}

export async function apiGetFeed(page = 0) {
  const token = await getToken()
  try {
    const res  = await fetch(`/api/souffles/feed?page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const json = await res.json()
    return { data: json.data || [], error: json.error || null }
  } catch(e) {
    return { data: [], error: e.message }
  }
}

export async function apiToggleResonance(souffle_id, emotion) {
  return call('POST', '/api/resonances/toggle', { souffle_id, emotion })
}

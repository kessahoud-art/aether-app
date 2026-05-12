import { supabase } from './supabase.js'

const BASE    = ''
const TIMEOUT = 8000  // 8 secondes max

async function getToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch(e) { return null }
}

async function fetchWithTimeout(url, opts, ms = TIMEOUT) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    clearTimeout(timer)
    return res
  } catch(e) {
    clearTimeout(timer)
    if (e.name === 'AbortError') throw new Error(`Timeout ${url}`)
    throw e
  }
}

async function call(method, path, body = null) {
  console.log('[api]', method, path)
  const token   = await getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const opts = { method, headers }
  if (body)  opts.body = JSON.stringify(body)

  try {
    const res  = await fetchWithTimeout(`${BASE}${path}`, opts)
    const json = await res.json()
    if (!res.ok || !json.success) {
      console.error('[api] error:', path, json.error)
      return { data: null, error: json.error || `HTTP ${res.status}` }
    }
    console.log('[api] OK:', path)
    return { data: json.data, error: null }
  } catch(e) {
    console.error('[api] exception:', path, e.message)
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
    const res  = await fetchWithTimeout(`/api/souffles/feed?page=${page}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const json = await res.json()
    return { data: json.data || [], error: json.error || null }
  } catch(e) {
    console.error('[api] getFeed exception:', e.message)
    return { data: [], error: e.message }
  }
}

export async function apiToggleResonance(souffle_id, emotion) {
  return call('POST', '/api/resonances/toggle', { souffle_id, emotion })
}

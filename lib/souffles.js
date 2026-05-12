import { supabase } from './supabase.js'

const LIMITE = 7

export async function countSoufflesToday(userId) {
  try {
    const debut = new Date(); debut.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('souffles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', userId)
      .gte('created_at', debut.toISOString())
    return count || 0
  } catch(e) { return 0 }
}

export async function publierSouffle({ userId, content, emotion, type }) {
  if (!userId || !content?.trim()) {
    return { error: 'Données manquantes.' }
  }

  console.log('[souffles] publication...', { userId, emotion, type })

  // Vérif limite
  const count = await countSoufflesToday(userId)
  if (count >= LIMITE) {
    return { error: `Limite de ${LIMITE} Souffles atteinte aujourd'hui.` }
  }

  // Essai 1 : via API route (service role, bypass RLS)
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (token) {
      console.log('[souffles] tentative via /api/souffles/create')
      const res = await fetch('/api/souffles/create', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim(), emotion, type }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          console.log('[souffles] API INSERT OK:', json.data.id)
          return { data: json.data, error: null }
        }
        console.warn('[souffles] API non succès:', json.error)
      } else {
        console.warn('[souffles] API HTTP', res.status)
      }
    }
  } catch(e) {
    console.warn('[souffles] API route indisponible:', e.message)
  }

  // Essai 2 : direct Supabase
  console.log('[souffles] fallback direct Supabase INSERT')
  try {
    const { data, error } = await supabase
      .from('souffles')
      .insert({
        entity_id:    userId,
        content:      content.trim(),
        emotion:      emotion || 'terre',
        type:         type    || 'simple',
        karma_score:  10,
        is_veiled:    false,
        is_ascending: false,
      })
      .select(`*, entities(display_name, username, aura_color, wisdom_level)`)
      .single()

    if (error) {
      console.error('[souffles] direct INSERT error:', error.code, error.message)
      if (error.code === '42501') {
        return { error: 'Permission refusée (RLS). Vérifie les policies Supabase.' }
      }
      return { error: error.message }
    }

    console.log('[souffles] direct INSERT OK:', data.id)
    supabase.rpc('increment_karma', { uid: userId, delta: 10 })
    return { data, error: null }
  } catch(e) {
    console.error('[souffles] direct INSERT exception:', e.message)
    return { error: e.message }
  }
}

export async function getFeed(page = 0) {
  const limit = 15
  console.log('[souffles] getFeed page', page)

  try {
    const { data, error } = await supabase
      .from('souffles')
      .select(`
        *,
        entities ( display_name, username, aura_color, wisdom_level ),
        resonances ( id, emotion, entity_id )
      `)
      .eq('is_veiled', false)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1)

    if (error) {
      console.error('[souffles] getFeed error:', error.code, error.message)
      return { data: [], error: error.message }
    }

    console.log('[souffles] getFeed OK:', data?.length, 'souffles')

    // Echos séparément
    if (data?.length) {
      try {
        const ids = data.map(s => s.id)
        const { data: echos } = await supabase
          .from('echos')
          .select('id, entity_id, souffle_id')
          .in('souffle_id', ids)
        data.forEach(s => {
          s.echos = echos?.filter(e => e.souffle_id === s.id) || []
        })
      } catch(e) {
        data.forEach(s => { s.echos = [] })
      }
    }

    return { data: data || [], error: null }
  } catch(e) {
    console.error('[souffles] getFeed exception:', e.message)
    return { data: [], error: e.message }
  }
}

export async function resonner(userId, souffleId, emotion) {
  if (!userId || !souffleId) return { action: 'error' }
  try {
    const { data: exist } = await supabase
      .from('resonances').select('id')
      .eq('entity_id', userId).eq('souffle_id', souffleId)
      .maybeSingle()

    if (exist) {
      await supabase.from('resonances')
        .delete().eq('entity_id', userId).eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    await supabase.from('resonances')
      .insert({ entity_id: userId, souffle_id: souffleId, emotion })
    return { action: 'added' }
  } catch(e) { return { action: 'error' } }
}

export async function echoSouffle(userId, souffleId) {
  if (!userId || !souffleId) return { action: 'error' }
  try {
    const { data: exist } = await supabase
      .from('echos').select('id')
      .eq('entity_id', userId).eq('souffle_id', souffleId)
      .maybeSingle()

    if (exist) {
      await supabase.from('echos')
        .delete().eq('entity_id', userId).eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    await supabase.from('echos')
      .insert({ entity_id: userId, souffle_id: souffleId })
    supabase.rpc('increment_karma', { uid: userId, delta: 3 })
    return { action: 'added' }
  } catch(e) { return { action: 'error' } }
}

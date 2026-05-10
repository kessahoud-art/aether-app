import { supabase } from './supabase.js'

const LIMITE_JOUR = 7

export async function countSoufflesToday(userId) {
  try {
    const debut = new Date()
    debut.setHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('souffles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', userId)
      .gte('created_at', debut.toISOString())
    return count || 0
  } catch(e) { return 0 }
}

export async function publierSouffle({ userId, content, emotion, type }) {
  if (!userId || !content?.trim()) return { error: 'Données manquantes.' }

  try {
    const count = await countSoufflesToday(userId)
    if (count >= LIMITE_JOUR) {
      return { error: `Limite de ${LIMITE_JOUR} Souffles atteinte aujourd'hui.` }
    }

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
      .select()
      .single()

    if (error) {
      console.error('[souffles] INSERT error:', error)
      return { error }
    }

    // Karma en arrière-plan
    supabase.rpc('increment_karma', { uid: userId, delta: 10 })
      .then(({ error: e }) => { if (e) console.warn('[karma]', e) })

    return { data, error: null }
  } catch(e) {
    console.error('[souffles] publierSouffle exception:', e)
    return { error: { message: e.message } }
  }
}

export async function getFeed(page = 0) {
  const limit = 15
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
      console.error('[souffles] getFeed error:', error)
      return { data: [], error }
    }

    // Charger echos séparément (évite erreur si table absente)
    if (data?.length) {
      try {
        const ids = data.map(s => s.id)
        const { data: echos } = await supabase
          .from('echos')
          .select('id, entity_id, souffle_id')
          .in('souffle_id', ids)
        if (echos) {
          data.forEach(s => {
            s.echos = echos.filter(e => e.souffle_id === s.id)
          })
        }
      } catch(e) {
        // echos optionnels — pas bloquant
        data.forEach(s => { s.echos = [] })
      }
    }

    return { data: data || [], error: null }
  } catch(e) {
    console.error('[souffles] getFeed exception:', e)
    return { data: [], error: { message: e.message } }
  }
}

export async function resonner(userId, souffleId, emotion) {
  if (!userId || !souffleId) return { action: 'error' }
  try {
    const { data: exist } = await supabase
      .from('resonances')
      .select('id')
      .eq('entity_id', userId)
      .eq('souffle_id', souffleId)
      .maybeSingle()

    if (exist) {
      await supabase.from('resonances')
        .delete().eq('entity_id', userId).eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    const { error } = await supabase.from('resonances')
      .insert({ entity_id: userId, souffle_id: souffleId, emotion })
    if (error) { console.error('[souffles] resonner:', error); return { action: 'error' } }
    return { action: 'added' }
  } catch(e) { return { action: 'error' } }
}

export async function echoSouffle(userId, souffleId) {
  if (!userId || !souffleId) return { action: 'error' }
  try {
    const { data: exist } = await supabase
      .from('echos')
      .select('id')
      .eq('entity_id', userId)
      .eq('souffle_id', souffleId)
      .maybeSingle()

    if (exist) {
      await supabase.from('echos')
        .delete().eq('entity_id', userId).eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    const { error } = await supabase.from('echos')
      .insert({ entity_id: userId, souffle_id: souffleId })
    if (error) { console.error('[souffles] echoSouffle:', error); return { action: 'error' } }
    supabase.rpc('increment_karma', { uid: userId, delta: 3 })
    return { action: 'added' }
  } catch(e) { return { action: 'error' } }
}

import { supabase } from './supabase.js'

const LIMITE_JOUR = 7

export async function countSoufflesToday(userId) {
  const debut = new Date()
  debut.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('souffles')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', userId)
    .gte('created_at', debut.toISOString())
  return count || 0
}

export async function publierSouffle({ userId, content, emotion, type }) {
  const count = await countSoufflesToday(userId)
  if (count >= LIMITE_JOUR) {
    return { error: `Tu as atteint ta limite de ${LIMITE_JOUR} Souffles aujourd'hui.` }
  }
  const { data, error } = await supabase
    .from('souffles')
    .insert({ entity_id: userId, content, emotion, type })
    .select()
    .single()
  if (!error) {
    await supabase.rpc('increment_karma', { uid: userId, delta: 10 })
  }
  return { data, error }
}

export async function getFeed(page = 0) {
  const limit = 15
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
  return { data, error }
}

export async function resonner(userId, souffleId, emotion) {
  const { data: exist } = await supabase
    .from('resonances')
    .select('id')
    .eq('entity_id', userId)
    .eq('souffle_id', souffleId)
    .single()

  if (exist) {
    await supabase.from('resonances')
      .delete()
      .eq('entity_id', userId)
      .eq('souffle_id', souffleId)
    return { action: 'removed' }
  }

  await supabase.from('resonances')
    .insert({ entity_id: userId, souffle_id: souffleId, emotion })
  return { action: 'added' }
}

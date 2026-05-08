import { supabase } from './supabase.js'

export async function getConciles(limit = 20) {
  const { data } = await supabase
    .from('conciles')
    .select('*, entities(display_name, username, aura_color)')
    .eq('is_active', true)
    .neq('type', 'sacre')
    .order('member_count', { ascending: false })
    .limit(limit)
  return data || []
}

export async function getConcile(id) {
  const { data } = await supabase
    .from('conciles')
    .select('*, entities(display_name, username, aura_color, wisdom_level)')
    .eq('id', id)
    .single()
  return data
}

export async function getMembership(concileId, userId) {
  const { data } = await supabase
    .from('concile_members')
    .select('*')
    .eq('concile_id', concileId)
    .eq('entity_id', userId)
    .single()
  return data
}

export async function getConcileFeed(concileId, page = 0) {
  const limit = 15
  const { data } = await supabase
    .from('souffles')
    .select(`
      *,
      entities(display_name, username, aura_color, wisdom_level),
      resonances(id, emotion, entity_id)
    `)
    .eq('concile_id', concileId)
    .eq('is_veiled', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)
  return data || []
}

export async function getMembers(concileId) {
  const { data } = await supabase
    .from('concile_members')
    .select('*, entities(display_name, username, aura_color, karma_score, wisdom_level)')
    .eq('concile_id', concileId)
    .eq('status', 'approved')
    .order('joined_at', { ascending: true })
    .limit(12)
  return data || []
}

export async function getPendingMembers(concileId) {
  const { data } = await supabase
    .from('concile_members')
    .select('*, entities(display_name, username, aura_color)')
    .eq('concile_id', concileId)
    .eq('status', 'pending')
    .order('joined_at', { ascending: true })
  return data || []
}

export async function rejoindre(concileId, userId, type, answer = '') {
  const status = type === 'ouvert' ? 'approved' : 'pending'
  const { error } = await supabase
    .from('concile_members')
    .insert({
      concile_id: concileId,
      entity_id: userId,
      status,
      intention_answer: answer
    })
  if (!error && type === 'ouvert') {
    await supabase.from('conciles')
      .update({ member_count: supabase.rpc('increment', { x: 1 }) })
      .eq('id', concileId)
  }
  return { error, status }
}

export async function quitter(concileId, userId) {
  await supabase.from('concile_members')
    .delete()
    .eq('concile_id', concileId)
    .eq('entity_id', userId)
}

export async function validerMembre(memberId, concileId) {
  await supabase.from('concile_members')
    .update({ status: 'approved' })
    .eq('id', memberId)
  await supabase.rpc('increment_karma', {
    uid: (await supabase.from('concile_members').select('entity_id').eq('id', memberId).single()).data?.entity_id,
    delta: 5
  })
}

export async function exclureMembre(memberId) {
  await supabase.from('concile_members')
    .update({ status: 'banned' })
    .eq('id', memberId)
}
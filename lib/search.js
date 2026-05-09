import { supabase } from './supabase.js'

export async function searchAll(query) {
  if (!query || query.length < 2) return { entities: [], souffles: [], conciles: [] }

  const q = query.trim()

  const [
    { data: entities },
    { data: souffles },
    { data: conciles },
  ] = await Promise.all([
    supabase
      .from('entities')
      .select('id, display_name, username, aura_color, wisdom_level, karma_score')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .limit(8),

    supabase
      .from('souffles')
      .select('id, content, emotion, created_at, entities(display_name, username)')
      .ilike('content', `%${q}%`)
      .eq('is_veiled', false)
      .order('karma_score', { ascending: false })
      .limit(8),

    supabase
      .from('conciles')
      .select('id, name, description, emotion, type, member_count')
      .or(`name.ilike.%${q}%,description.ilike.%${q}%`)
      .eq('is_active', true)
      .limit(6),
  ])

  return {
    entities: entities || [],
    souffles: souffles || [],
    conciles: conciles || [],
  }
}
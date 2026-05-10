import { supabase } from './supabase.js'

const LIMITE_JOUR = 7

export async function countSoufflesToday(userId) {
  try {
    const debut = new Date()
    debut.setHours(0, 0, 0, 0)
    const { count, error } = await supabase
      .from('souffles')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', userId)
      .gte('created_at', debut.toISOString())

    if (error) {
      console.error('[souffles] countSoufflesToday error:', error)
      return 0
    }
    return count || 0
  } catch (err) {
    console.error('[souffles] countSoufflesToday exception:', err)
    return 0
  }
}

export async function publierSouffle({ userId, content, emotion, type }) {
  console.log('[souffles] Tentative publication:', { userId, content, emotion, type })

  if (!userId) return { error: 'Utilisateur non connecté.' }
  if (!content?.trim()) return { error: 'Contenu vide.' }

  try {
    // Vérif limite journalière
    const count = await countSoufflesToday(userId)
    console.log('[souffles] Souffles aujourd\'hui:', count)

    if (count >= LIMITE_JOUR) {
      return { error: `Limite de ${LIMITE_JOUR} Souffles atteinte aujourd'hui.` }
    }

    const { data, error } = await supabase
      .from('souffles')
      .insert({
        entity_id: userId,
        content:   content.trim(),
        emotion:   emotion || 'terre',
        type:      type    || 'simple',
        karma_score: 10,
        is_veiled:   false,
        is_ascending: false,
      })
      .select()
      .single()

    console.log('[souffles] Résultat insert:', { data, error })

    if (error) {
      console.error('[souffles] Insert error:', error)
      return { error }
    }

    // Karma en arrière-plan (ne pas bloquer si ça échoue)
    supabase.rpc('increment_karma', { uid: userId, delta: 10 })
      .then(({ error: kErr }) => {
        if (kErr) console.warn('[souffles] Karma update failed:', kErr)
      })

    return { data, error: null }

  } catch (err) {
    console.error('[souffles] publierSouffle exception:', err)
    return { error: { message: err.message || 'Erreur inconnue' } }
  }
}

export async function getFeed(page = 0) {
  const limit = 15
  try {
    // Query sans echos d'abord (plus robuste)
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

    // Charger les echos séparément (évite l'erreur si table manquante)
    if (data?.length) {
      const ids = data.map(s => s.id)
      const { data: echos } = await supabase
        .from('echos')
        .select('id, entity_id, souffle_id')
        .in('souffle_id', ids)

      // Attacher les echos à chaque souffle
      if (echos) {
        data.forEach(s => {
          s.echos = echos.filter(e => e.souffle_id === s.id)
        })
      }
    }

    return { data: data || [], error: null }

  } catch (err) {
    console.error('[souffles] getFeed exception:', err)
    return { data: [], error: { message: err.message } }
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
        .delete()
        .eq('entity_id', userId)
        .eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    const { error } = await supabase.from('resonances')
      .insert({ entity_id: userId, souffle_id: souffleId, emotion })

    if (error) {
      console.error('[souffles] resonner error:', error)
      return { action: 'error' }
    }

    return { action: 'added' }
  } catch (err) {
    console.error('[souffles] resonner exception:', err)
    return { action: 'error' }
  }
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
        .delete()
        .eq('entity_id', userId)
        .eq('souffle_id', souffleId)
      return { action: 'removed' }
    }

    const { error } = await supabase.from('echos')
      .insert({ entity_id: userId, souffle_id: souffleId })

    if (error) {
      console.error('[souffles] echoSouffle error:', error)
      return { action: 'error' }
    }

    supabase.rpc('increment_karma', { uid: userId, delta: 3 })
    return { action: 'added' }
  } catch (err) {
    console.error('[souffles] echoSouffle exception:', err)
    return { action: 'error' }
  }
}

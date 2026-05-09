import { supabase } from './supabase.js'

export async function getNotifications(userId, limit = 30) {
  const { data } = await supabase
    .from('notifications')
    .select('*, from_entity:from_entity_id(display_name, username, aura_color)')
    .eq('to_entity_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data || []
}

export async function countUnread(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('to_entity_id', userId)
    .eq('is_read', false)
  return count || 0
}

export async function markAllRead(userId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('to_entity_id', userId)
    .eq('is_read', false)
}

export async function markOneRead(notifId) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notifId)
}

export async function deleteAll(userId) {
  await supabase
    .from('notifications')
    .delete()
    .eq('to_entity_id', userId)
}

export async function notifier({ to, from, type, title, body, link }) {
  await supabase.rpc('notifier', {
    p_to:    to,
    p_from:  from,
    p_type:  type,
    p_title: title,
    p_body:  body  || null,
    p_link:  link  || null,
  })
}

// Types d'icônes
export const NOTIF_ICONS = {
  resonance:           '✨',
  echo:                '🌊',
  lien:                '🔗',
  offrande_recue:      '💎',
  offrande_confirmee:  '✅',
  retrait_confirme:    '💸',
  retrait_rejete:      '❌',
  concile_approuve:    '🔮',
  concile_rejete:      '🚫',
  concile_demande:     '⏳',
  souffle_ascendant:   '⚡',
}
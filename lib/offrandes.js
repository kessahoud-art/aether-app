import { supabase } from './supabase.js'

// Liens Maketou par montant — REMPLACE PAR TES VRAIS LIENS
export const MAKETOU_LINKS = {
  500:   'LIEN_MAKETOU_500',
  1000:  'LIEN_MAKETOU_1000',
  2000:  'LIEN_MAKETOU_2000',
  5000:  'LIEN_MAKETOU_5000',
  10000: 'LIEN_MAKETOU_10000',
}

export const COMMISSION_RATE = 0.08  // 8%

export const MONTANTS = [
  { value: 500,   label: '500 FCFA',    icon: '✦',  name: 'Étincelle' },
  { value: 1000,  label: '1 000 FCFA',  icon: '🔥', name: 'Flamme'    },
  { value: 2000,  label: '2 000 FCFA',  icon: '💫', name: 'Lumière'   },
  { value: 5000,  label: '5 000 FCFA',  icon: '☀️', name: 'Soleil'    },
  { value: 10000, label: '10 000 FCFA', icon: '✨', name: 'Divin'     },
]

function genRef() {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `AET-${date}-${rand}`
}

export async function creerOffrande({ fromId, toId, amount, message }) {
  const commission = Math.round(amount * COMMISSION_RATE)
  const net        = amount - commission
  const reference  = genRef()

  const { data, error } = await supabase
    .from('offrandes')
    .insert({
      reference,
      from_entity_id: fromId,
      to_entity_id:   toId,
      amount, commission,
      net_amount: net,
      message: message || null,
      status: 'pending'
    })
    .select().single()

  return { data, error }
}

export async function declarerPaiement(offradeId) {
  const { error } = await supabase
    .from('offrandes')
    .update({ status: 'awaiting_confirmation' })
    .eq('id', offradeId)
  return { error }
}

export async function getWallet(userId) {
  const { data } = await supabase
    .from('wallets')
    .select('*')
    .eq('entity_id', userId)
    .single()
  return data
}

export async function getOffrandes(userId) {
  const { data } = await supabase
    .from('offrandes')
    .select('*, from_entity:from_entity_id(display_name, username), to_entity:to_entity_id(display_name, username)')
    .or(`from_entity_id.eq.${userId},to_entity_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(30)
  return data || []
}

export async function demanderRetrait({ entityId, amount, method, numero, reseau }) {
  // Vérif solde
  const wallet = await getWallet(entityId)
  if (!wallet || wallet.balance < amount) {
    return { error: 'Solde insuffisant.' }
  }
  if (amount < 1000) {
    return { error: 'Montant minimum : 1 000 FCFA.' }
  }

  // Réserver le montant (débit immédiat du wallet)
  await supabase.from('wallets')
    .update({
      balance:   wallet.balance - amount,
      total_out: wallet.total_out + amount,
      updated_at: new Date().toISOString()
    })
    .eq('entity_id', entityId)

  const { data, error } = await supabase
    .from('retraits')
    .insert({ entity_id: entityId, amount, method, numero, reseau })
    .select().single()

  return { data, error }
}
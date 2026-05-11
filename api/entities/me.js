const { adminClient, verifyJWT, ok, err, cors } = require('../_lib')

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return err(res, 'Method not allowed', 405)

  const user = await verifyJWT(req)
  if (!user) return err(res, 'Non authentifié', 401)

  const sb = adminClient()

  // Chercher l'entity
  let { data: entity, error: fetchErr } = await sb
    .from('entities')
    .select('*')
    .eq('id', user.id)
    .single()

  // Créer si absente (fallback trigger raté)
  if (fetchErr || !entity) {
    const base = user.email.split('@')[0]
      .toLowerCase().replace(/[^a-z0-9_]/g, '_')
    const username = base + '_' + Math.floor(Math.random() * 9000 + 1000)

    const { data: newEntity, error: createErr } = await sb
      .from('entities')
      .insert({
        id: user.id, username,
        display_name: base,
        aura_color: 'terre',
        wisdom_level: 1,
        karma_score: 0,
        onboarding_completed: false,
      })
      .select()
      .single()

    if (createErr) {
      // Existe déjà — réessayer
      const { data: retry } = await sb
        .from('entities').select('*').eq('id', user.id).single()
      if (!retry) return err(res, 'Entity introuvable', 404)
      entity = retry
    } else {
      entity = newEntity
      // Créer wallet
      await sb.from('wallets')
        .insert({ entity_id: user.id, balance: 0, total_in: 0, total_out: 0 })
    }
  }

  return ok(res, entity)
}

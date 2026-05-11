const { adminClient, verifyJWT, ok, err, cors } = require('../_lib')

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return err(res, 'Method not allowed', 405)

  const user = await verifyJWT(req)
  if (!user) return err(res, 'Non authentifié', 401)

  const { souffle_id, emotion } = req.body
  if (!souffle_id) return err(res, 'souffle_id requis')

  const sb = adminClient()

  const { data: exist } = await sb
    .from('resonances')
    .select('id')
    .eq('entity_id', user.id)
    .eq('souffle_id', souffle_id)
    .maybeSingle()

  if (exist) {
    await sb.from('resonances')
      .delete().eq('entity_id', user.id).eq('souffle_id', souffle_id)
    return ok(res, { action: 'removed' })
  }

  await sb.from('resonances')
    .insert({ entity_id: user.id, souffle_id, emotion: emotion || 'terre' })

  return ok(res, { action: 'added' })
}

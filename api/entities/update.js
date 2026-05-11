const { adminClient, verifyJWT, ok, err, cors } = require('../_lib')

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'PUT') return err(res, 'Method not allowed', 405)

  const user = await verifyJWT(req)
  if (!user) return err(res, 'Non authentifié', 401)

  const { display_name, intention, aura_color, onboarding_completed } = req.body
  const updates = {}

  if (display_name !== undefined) updates.display_name = display_name
  if (intention    !== undefined) updates.intention    = intention
  if (aura_color   !== undefined) updates.aura_color   = aura_color
  if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed

  if (Object.keys(updates).length === 0) return err(res, 'Rien à mettre à jour')

  const sb = adminClient()
  const { data, error } = await sb
    .from('entities')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return err(res, error.message, 500)
  return ok(res, data)
}

const { adminClient, verifyJWT, ok, err, cors } = require('../_lib')

const LIMITE = 7

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return err(res, 'Method not allowed', 405)

  const user = await verifyJWT(req)
  if (!user) return err(res, 'Non authentifié', 401)

  const { content, emotion, type, concile_id } = req.body

  if (!content?.trim()) return err(res, 'Contenu requis')
  if (content.trim().length > 280) return err(res, 'Souffle trop long (max 280 caractères)')

  const sb = adminClient()

  // Vérifier la limite journalière
  const debut = new Date(); debut.setHours(0, 0, 0, 0)
  const { count } = await sb
    .from('souffles')
    .select('id', { count: 'exact', head: true })
    .eq('entity_id', user.id)
    .gte('created_at', debut.toISOString())

  if ((count || 0) >= LIMITE) {
    return err(res, `Limite de ${LIMITE} Souffles atteinte aujourd'hui.`, 429)
  }

  // Insérer le souffle
  const { data, error } = await sb
    .from('souffles')
    .insert({
      entity_id:    user.id,
      content:      content.trim(),
      emotion:      emotion || 'terre',
      type:         type    || 'simple',
      karma_score:  10,
      is_veiled:    false,
      is_ascending: false,
      concile_id:   concile_id || null,
    })
    .select(`
      *,
      entities ( display_name, username, aura_color, wisdom_level )
    `)
    .single()

  if (error) return err(res, error.message, 500)

  // Karma +10
  await sb.rpc('increment_karma', { uid: user.id, delta: 10 })

  return ok(res, data, 201)
}

const { adminClient, cors, ok, err } = require('../_lib')

module.exports = async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return err(res, 'Method not allowed', 405)

  const page  = parseInt(req.query.page  || '0')
  const limit = parseInt(req.query.limit || '15')

  const sb = adminClient()

  const { data, error } = await sb
    .from('souffles')
    .select(`
      *,
      entities ( display_name, username, aura_color, wisdom_level ),
      resonances ( id, emotion, entity_id )
    `)
    .eq('is_veiled', false)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  if (error) return err(res, error.message, 500)

  // Ajouter les echos
  if (data?.length) {
    const ids = data.map(s => s.id)
    const { data: echos } = await sb
      .from('echos')
      .select('id, entity_id, souffle_id')
      .in('souffle_id', ids)

    data.forEach(s => {
      s.echos = echos?.filter(e => e.souffle_id === s.id) || []
    })
  }

  return ok(res, data || [])
}

const { createClient } = require('@supabase/supabase-js')

// Client admin — bypass RLS complet
function adminClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Valider le JWT et retourner le user
async function verifyJWT(req) {
  const header = req.headers.authorization || ''
  const token  = header.replace('Bearer ', '').trim()
  if (!token) return null

  const sb = adminClient()
  const { data: { user }, error } = await sb.auth.getUser(token)
  if (error || !user) return null
  return user
}

// Réponses standard
function ok(res, data, status = 200) {
  res.status(status).json({ success: true, data })
}

function err(res, message, status = 400) {
  res.status(status).json({ success: false, error: message })
}

// CORS headers
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}

module.exports = { adminClient, verifyJWT, ok, err, cors }

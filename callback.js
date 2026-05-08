export default async function handler(req, res) {
  const { code } = req.query
  if (code) {
    // Exchange code → session (pour OAuth futur)
    res.redirect('/flux')
  } else {
    res.redirect('/login')
  }
}
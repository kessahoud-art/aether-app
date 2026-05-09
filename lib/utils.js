export const EMOTIONS = {
  feu:    { icon: '🔥', label: 'Feu',    color: '#e64a19', bg: '#fff3f0', border: '#ffccbc' },
  eau:    { icon: '💧', label: 'Eau',    color: '#1565c0', bg: '#f0f4ff', border: '#bbdefb' },
  terre:  { icon: '🌿', label: 'Terre',  color: '#2e7d32', bg: '#f0fff2', border: '#c8e6c9' },
  eclair: { icon: '⚡', label: 'Éclair', color: '#e65100', bg: '#fffde7', border: '#fff59d' },
  brume:  { icon: '🌫️', label: 'Brume',  color: '#6a1b9a', bg: '#f8f0ff', border: '#e1bee7' },
}

export const TYPES = {
  simple:     { icon: '💬', label: 'Simple' },
  oracle:     { icon: '🔮', label: 'Oracle' },
  vision:     { icon: '🖼️', label: 'Vision' },
  revelation: { icon: '📜', label: 'Révélation' },
}

export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60)     return 'À l\'instant'
  if (diff < 3600)   return `${Math.floor(diff / 60)}min`
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h`
  if (diff < 604800) return `${Math.floor(diff / 86400)}j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export function avatarInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

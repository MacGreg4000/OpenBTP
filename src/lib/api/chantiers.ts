export async function getChantiers() {
  const res = await fetch('/api/chantiers')
  if (!res.ok) throw new Error('Erreur lors de la récupération des chantiers')
  const json = await res.json()
  // Compat: accepte ancien format (tableau) et nouveau ({ data, meta })
  return Array.isArray(json) ? json : json.data
} 
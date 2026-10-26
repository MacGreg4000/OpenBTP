// Affichage en arborescence des sous-traitants (principal puis rattachés).
// Module pur : utilisable côté navigateur.

/**
 * Ordre d'affichage en arborescence : chaque principal suivi de ses rattachés
 * (dans l'ordre reçu). Un rattaché dont le principal n'est pas dans la liste
 * (filtre, recherche) reste affiché à sa place.
 */
export function ordonnerEnArbre<T extends { id: string; parentId?: string | null }>(liste: T[]): T[] {
  const ids = new Set(liste.map((s) => s.id))
  const enfants = new Map<string, T[]>()
  for (const s of liste) {
    if (s.parentId && ids.has(s.parentId)) {
      enfants.set(s.parentId, [...(enfants.get(s.parentId) || []), s])
    }
  }
  const resultat: T[] = []
  for (const s of liste) {
    if (s.parentId && ids.has(s.parentId)) continue
    resultat.push(s, ...(enfants.get(s.id) || []))
  }
  return resultat
}

// Rattachement d'un sous-traitant à un sous-traitant principal : typiquement
// des indépendants qui travaillent avec / pour un autre (ex. Narcis et ses
// indépendants). Un seul niveau : un sous-traitant principal n'est lui-même
// rattaché à personne, et un indépendant rattaché n'a pas de rattachés.

import { prisma } from '@/lib/prisma/client'

/** null si le rattachement est permis, sinon un message d'erreur lisible. */
export async function verifierRattachement(id: string, parentId: string | null): Promise<string | null> {
  if (!parentId) return null
  if (parentId === id) return 'Un sous-traitant ne peut pas être rattaché à lui-même'

  const [parent, nbRattaches] = await Promise.all([
    prisma.soustraitant.findUnique({ where: { id: parentId }, select: { nom: true, parentId: true } }),
    prisma.soustraitant.count({ where: { parentId: id } }),
  ])
  if (!parent) return 'Sous-traitant principal introuvable'
  if (parent.parentId) return `« ${parent.nom} » est lui-même rattaché à un autre sous-traitant : choisissez le sous-traitant principal`
  if (nbRattaches > 0) return `Ce sous-traitant a déjà ${nbRattaches} sous-traitant(s) rattaché(s) : il ne peut pas être rattaché à son tour`
  return null
}

import { prisma } from '@/lib/prisma/client'

/**
 * Crée un OuvrierInterne correspondant au Magasinier si nécessaire.
 * Utilise le même id (magasinier.id) pour réutiliser JournalOuvrier sans modification du schéma.
 */
export async function ensureOuvrierInterneForMagasinier(magasinierId: string): Promise<boolean> {
  const existing = await prisma.ouvrierInterne.findUnique({
    where: { id: magasinierId }
  })
  if (existing) return true

  const magasinier = await prisma.magasinier.findUnique({
    where: { id: magasinierId }
  })
  if (!magasinier) return false

  await prisma.ouvrierInterne.create({
    data: {
      id: magasinier.id,
      nom: magasinier.nom,
      prenom: 'Magasinier',
      actif: magasinier.actif
    }
  })
  return true
}

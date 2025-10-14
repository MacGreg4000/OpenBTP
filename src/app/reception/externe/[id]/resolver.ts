import { prisma } from '@/lib/prisma'

/**
 * Récupère le code PIN d'une réception à partir de son ID
 * @param id ID de la réception
 * @returns Le code PIN ou null si non trouvé
 */
export async function getReceptionPin(id: string): Promise<string | null> {
  try {
    const reception = await prisma.receptionChantier.findUnique({
      where: { id },
      select: { codePIN: true }
    })
    
    return reception?.codePIN || null
  } catch (error) {
    console.error('Erreur lors de la récupération du code PIN:', error)
    return null
  }
}

/**
 * Récupère l'ID d'une réception à partir de son code PIN
 * @param pin Code PIN de la réception
 * @returns L'ID ou null si non trouvé
 */
export async function getReceptionId(pin: string): Promise<string | null> {
  try {
    const reception = await prisma.receptionChantier.findFirst({
      where: { codePIN: pin },
      select: { id: true }
    })
    
    return reception?.id || null
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'ID de réception:', error)
    return null
  }
} 
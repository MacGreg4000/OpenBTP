'use server'

import { prisma } from '@/lib/prisma'
import { Depense } from '@/types/depense'

/**
 * Récupère toutes les dépenses d'un chantier
 */
export async function getDepenses(chantierId: string): Promise<Depense[]> {
  try {
    // Utiliser Prisma pour une requête sécurisée
    const depenses = await (prisma as unknown as { depense: { findMany: (args: { where: { chantierId: string }, orderBy: { date: 'desc' } }) => Promise<Depense[]> } }).depense.findMany({
      where: { chantierId },
      orderBy: { date: 'desc' }
    })
    
    return depenses
  } catch (error) {
    console.error('Erreur lors de la récupération des dépenses:', error)
    return []
  }
}

/**
 * Récupère une dépense spécifique
 */
export async function getDepense(depenseId: string): Promise<Depense | null> {
  try {
    const depense = await (prisma as unknown as { depense: { findUnique: (args: { where: { id: string } }) => Promise<Depense | null> } }).depense.findUnique({
      where: { id: depenseId }
    })
    
    return depense
  } catch (error) {
    console.error('Erreur lors de la récupération de la dépense:', error)
    return null
  }
} 
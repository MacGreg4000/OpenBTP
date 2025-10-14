'use server'

import { prisma } from '@/lib/prisma'

type ChantierRow = {
  id: string;
  chantierId?: string | null;
  nomChantier?: string | null;
  [key: string]: unknown;
};

/**
 * Récupère les informations d'un chantier
 */
export async function getChantier(chantierId: string): Promise<ChantierRow | null> {
  try {
    const chantier = await (prisma as unknown as { chantier: { findUnique: (args: { where: { id: string } }) => Promise<unknown> } }).chantier.findUnique({
      where: { id: chantierId }
    })

    return (chantier as ChantierRow) || null
  } catch (error) {
    console.error('Erreur lors de la récupération du chantier:', error)
    return null
  }
}

/**
 * Récupère tous les chantiers
 */
export async function getAllChantiers(): Promise<ChantierRow[]> {
  try {
    const chantiers = await (prisma as unknown as { chantier: { findMany: (args: { orderBy: { dateDebut: 'desc' } }) => Promise<unknown[]> } }).chantier.findMany({
      orderBy: { dateDebut: 'desc' }
    })

    return chantiers as ChantierRow[]
  } catch (error) {
    console.error('Erreur lors de la récupération des chantiers:', error)
    return []
  }
} 
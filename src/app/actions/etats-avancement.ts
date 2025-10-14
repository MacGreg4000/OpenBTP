'use server'

import { prisma } from '@/lib/prisma'
// import { EtatAvancement } from '@/types/etat-avancement'

type LigneEtatRow = Record<string, unknown>;
type EtatWithLignes = {
  id: string;
  chantierId: string;
  numero?: number | null;
  date?: string | Date | null;
  lignes?: LigneEtatRow[] | null;
  [key: string]: unknown;
};

/**
 * Récupère tous les états d'avancement d'un chantier
 */
export async function getAllEtatsAvancement(chantierId: string): Promise<EtatWithLignes[]> {
  try {
    const etats = await (prisma as unknown as { EtatAvancement: { findMany: (args: { where: { chantierId: string }, orderBy: { date: 'desc' }, include: { LigneEtatAvancement: true } }) => Promise<Array<Record<string, unknown>>> } }).EtatAvancement.findMany({
      where: { chantierId },
      orderBy: { date: 'desc' },
      include: { LigneEtatAvancement: true }
    })

    return etats.map(e => ({ ...e, lignes: (e as Record<string, unknown>).LigneEtatAvancement as LigneEtatRow[] })) as EtatWithLignes[]
  } catch (error) {
    console.error('Erreur lors de la récupération des états d\'avancement:', error)
    return []
  }
}

/**
 * Récupère un état d'avancement spécifique
 */
export async function getEtatAvancement(etatId: string): Promise<EtatWithLignes | null> {
  try {
    const etat = await (prisma as unknown as { EtatAvancement: { findUnique: (args: { where: { id: string }, include: { LigneEtatAvancement: true } }) => Promise<Record<string, unknown> | null> } }).EtatAvancement.findUnique({
      where: { id: etatId },
      include: { LigneEtatAvancement: true }
    })

    if (!etat) return null
    const { LigneEtatAvancement, ...rest } = etat as Record<string, unknown>
    return { ...(rest as EtatWithLignes), lignes: LigneEtatAvancement as LigneEtatRow[] }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'état d\'avancement:', error)
    return null
  }
}

/**
 * Récupère le prochain état d'avancement
 */
export async function getNextEtatAvancement(etatId: string): Promise<EtatWithLignes | null> {
  try {
    const currentEtat = await (prisma as unknown as { EtatAvancement: { findUnique: (args: { where: { id: string } }) => Promise<EtatWithLignes | null> } }).EtatAvancement.findUnique({
      where: { id: etatId }
    })
    if (!currentEtat) return null
    
    const next = await (prisma as unknown as { EtatAvancement: { findFirst: (args: { where: { chantierId: string; numero: { gt: number | null | undefined } }, orderBy: { numero: 'asc' }, include: { LigneEtatAvancement: true } }) => Promise<Record<string, unknown> | null> } }).EtatAvancement.findFirst({
      where: { chantierId: currentEtat.chantierId as string, numero: { gt: (currentEtat as Record<string, unknown>).numero as number | null | undefined } },
      orderBy: { numero: 'asc' },
      include: { LigneEtatAvancement: true }
    })

    if (!next) return null
    const { LigneEtatAvancement, ...rest } = next as Record<string, unknown>
    return { ...(rest as EtatWithLignes), lignes: LigneEtatAvancement as LigneEtatRow[] }
  } catch (error) {
    console.error('Erreur lors de la récupération du prochain état d\'avancement:', error)
    return null
  }
} 
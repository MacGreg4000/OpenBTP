// ===================================
// UTILITAIRES pour le module SAV
// ===================================

import { prisma } from '@/lib/prisma/client'
import { TypeTicketSAV, PrioriteSAV, StatutSAV } from '@/types/sav'

/**
 * Génère un numéro de ticket SAV unique
 * Format: SAV-YYYY-NNNN (ex: SAV-2024-0001)
 */
export async function generateTicketSAVNumber(): Promise<string> {
  const currentYear = new Date().getFullYear()
  
  try {
    // Récupérer le dernier ticket de l'année en cours
    const lastTicket = await prisma.$queryRaw<Array<{ numTicket: string }>>`
      SELECT numTicket 
      FROM ticket_sav 
      WHERE YEAR(createdAt) = ${currentYear}
      ORDER BY createdAt DESC 
      LIMIT 1
    `
    
    let nextNumber = 1
    if (lastTicket.length > 0 && lastTicket[0].numTicket) {
      const parts = lastTicket[0].numTicket.split('-')
      if (parts.length === 3) {
        const lastNumber = parseInt(parts[2])
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1
        }
      }
    }
    
    return `SAV-${currentYear}-${nextNumber.toString().padStart(4, '0')}`
  } catch (error) {
    console.error('Erreur lors de la génération du numéro de ticket SAV:', error)
    // Fallback avec timestamp si erreur
    const timestamp = Date.now().toString().slice(-4)
    return `SAV-${currentYear}-${timestamp}`
  }
}

/**
 * Valide les données d'un ticket SAV
 */
export function validateTicketSAVData(data: Partial<{ titre: string; description: string; type: TypeTicketSAV; priorite: PrioriteSAV; dateInterventionSouhaitee?: string; coutEstime?: number }>): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // chantierId devient optionnel pour tickets hors chantier
  
  if (!data.titre || data.titre.trim().length === 0) {
    errors.push('Titre requis')
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description requise')
  }
  
  if (!Object.values(TypeTicketSAV).includes(data.type)) {
    errors.push('Type de ticket invalide')
  }
  
  if (!Object.values(PrioriteSAV).includes(data.priorite)) {
    errors.push('Priorité invalide')
  }
  
  if (data.dateInterventionSouhaitee) {
    const date = new Date(data.dateInterventionSouhaitee)
    if (isNaN(date.getTime())) {
      errors.push('Date d\'intervention souhaitée invalide')
    } else if (date < new Date()) {
      errors.push('La date d\'intervention souhaitée ne peut pas être dans le passé')
    }
  }
  
  if (data.coutEstime && (isNaN(data.coutEstime) || data.coutEstime < 0)) {
    errors.push('Coût estimé invalide')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Calcule le délai en jours entre deux dates
 */
export function calculerDelaiEnJours(dateDebut: Date, dateFin: Date): number {
  const diffTime = Math.abs(dateFin.getTime() - dateDebut.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Détermine la couleur d'affichage selon la priorité
 */
export function getCouleurPriorite(priorite: PrioriteSAV): string {
  switch (priorite) {
    case PrioriteSAV.CRITIQUE:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    case PrioriteSAV.HAUTE:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    case PrioriteSAV.NORMALE:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case PrioriteSAV.BASSE:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

/**
 * Détermine la couleur d'affichage selon le statut
 */
export function getCouleurStatut(statut: StatutSAV): string {
  switch (statut) {
    case StatutSAV.NOUVEAU:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    case StatutSAV.EN_ATTENTE:
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    case StatutSAV.ASSIGNE:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
    case StatutSAV.PLANIFIE:
      return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
    case StatutSAV.EN_COURS:
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    case StatutSAV.EN_ATTENTE_PIECES:
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
    case StatutSAV.EN_ATTENTE_VALIDATION:
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300'
    case StatutSAV.RESOLU:
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
    case StatutSAV.CLOS:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    case StatutSAV.ANNULE:
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
  }
}

/**
 * Formate une date pour l'affichage français
 */
export function formaterDateFr(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formate une date et heure pour l'affichage français
 */
export function formaterDateHeureFr(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Vérifie si un utilisateur peut modifier un ticket SAV
 */
export function peutModifierTicket(ticket: { createdBy?: string; technicienAssignId?: string }, userId: string, userRole: string): boolean {
  // L'admin peut tout modifier
  if (userRole === 'ADMIN') return true
  
  // Le manager peut modifier les tickets de son périmètre
  if (userRole === 'MANAGER') return true
  
  // L'utilisateur peut modifier les tickets qu'il a créés
  if (ticket.createdBy === userId) return true
  
  // Le technicien assigné peut modifier certains champs
  if (ticket.technicienAssignId === userId) return true
  
  return false
}

/**
 * Vérifie si un utilisateur peut voir un ticket SAV
 */
export function peutVoirTicket(ticket: { createdBy?: string; technicienAssignId?: string }, userId: string, userRole: string): boolean {
  // L'admin peut tout voir
  if (userRole === 'ADMIN') return true
  
  // Le manager peut voir les tickets de son périmètre
  if (userRole === 'MANAGER') return true
  
  // L'utilisateur peut voir les tickets qu'il a créés
  if (ticket.createdBy === userId) return true
  
  // Le technicien assigné peut voir le ticket
  if (ticket.technicienAssignId === userId) return true
  
  return false
}

/**
 * Détermine les statuts possibles pour la transition
 */
export function getStatutsSuivantsPossibles(statutActuel: StatutSAV): StatutSAV[] {
  switch (statutActuel) {
    case StatutSAV.NOUVEAU:
      return [StatutSAV.EN_ATTENTE, StatutSAV.ASSIGNE, StatutSAV.ANNULE]
    
    case StatutSAV.EN_ATTENTE:
      return [StatutSAV.ASSIGNE, StatutSAV.ANNULE]
    
    case StatutSAV.ASSIGNE:
      return [StatutSAV.PLANIFIE, StatutSAV.EN_COURS, StatutSAV.EN_ATTENTE]
    
    case StatutSAV.PLANIFIE:
      return [StatutSAV.EN_COURS, StatutSAV.EN_ATTENTE, StatutSAV.ANNULE]
    
    case StatutSAV.EN_COURS:
      return [StatutSAV.EN_ATTENTE_PIECES, StatutSAV.EN_ATTENTE_VALIDATION, StatutSAV.RESOLU]
    
    case StatutSAV.EN_ATTENTE_PIECES:
      return [StatutSAV.EN_COURS, StatutSAV.ANNULE]
    
    case StatutSAV.EN_ATTENTE_VALIDATION:
      return [StatutSAV.RESOLU, StatutSAV.EN_COURS]
    
    case StatutSAV.RESOLU:
      return [StatutSAV.CLOS, StatutSAV.EN_COURS] // Possibilité de réouvrir
    
    default:
      return []
  }
}

/**
 * Calcule les statistiques d'un tableau de tickets SAV
 */
export function calculerStatistiquesSAV(tickets: Array<{
  statut: StatutSAV;
  priorite: PrioriteSAV;
  type: TypeTicketSAV;
  coutReel?: number;
  dateResolution?: string;
  dateDemande: string;
}>): {
  totalTickets: number;
  ticketsOuverts: number;
  ticketsEnCours: number;
  ticketsResolus: number;
  delaiMoyenResolution: number;
  coutTotal: number;
  ticketsParPriorite: Record<string, number>;
} {
  const stats = {
    totalTickets: tickets.length,
    ticketsOuverts: 0,
    ticketsEnCours: 0,
    ticketsResolus: 0,
    delaiMoyenResolution: 0,
    coutTotal: 0,
    ticketsParPriorite: {
      [PrioriteSAV.CRITIQUE]: 0,
      [PrioriteSAV.HAUTE]: 0,
      [PrioriteSAV.NORMALE]: 0,
      [PrioriteSAV.BASSE]: 0
    },
    ticketsParType: {} as Record<TypeTicketSAV, number>,
    ticketsParStatut: {} as Record<StatutSAV, number>
  }
  
  let totalDelaiResolution = 0
  let ticketsAvecDelai = 0
  
  tickets.forEach(ticket => {
    // Comptage par statut
    if ([StatutSAV.NOUVEAU, StatutSAV.EN_ATTENTE, StatutSAV.ASSIGNE].includes(ticket.statut)) {
      stats.ticketsOuverts++
    }
    
    if ([StatutSAV.PLANIFIE, StatutSAV.EN_COURS, StatutSAV.EN_ATTENTE_PIECES, StatutSAV.EN_ATTENTE_VALIDATION].includes(ticket.statut)) {
      stats.ticketsEnCours++
    }
    
    if ([StatutSAV.RESOLU, StatutSAV.CLOS].includes(ticket.statut)) {
      stats.ticketsResolus++
    }
    
    // Comptage par priorité
    if (stats.ticketsParPriorite[ticket.priorite] !== undefined) {
      stats.ticketsParPriorite[ticket.priorite]++
    }
    
    // Comptage par type
    if (!stats.ticketsParType[ticket.type]) {
      stats.ticketsParType[ticket.type] = 0
    }
    stats.ticketsParType[ticket.type]++
    
    // Comptage par statut
    if (!stats.ticketsParStatut[ticket.statut]) {
      stats.ticketsParStatut[ticket.statut] = 0
    }
    stats.ticketsParStatut[ticket.statut]++
    
    // Calcul du coût total
    if (ticket.coutReel) {
      stats.coutTotal += ticket.coutReel
    }
    
    // Calcul du délai moyen de résolution
    if (ticket.dateResolution && ticket.dateDemande) {
      const delai = calculerDelaiEnJours(new Date(ticket.dateDemande), new Date(ticket.dateResolution))
      totalDelaiResolution += delai
      ticketsAvecDelai++
    }
  })
  
  if (ticketsAvecDelai > 0) {
    stats.delaiMoyenResolution = Math.round(totalDelaiResolution / ticketsAvecDelai)
  }
  
  return stats
} 
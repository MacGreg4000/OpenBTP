// ===================================
// TYPES TYPESCRIPT pour le module SAV
// ===================================

// Enums
export enum TypeTicketSAV {
  DEFAUT_CONFORMITE = 'DEFAUT_CONFORMITE',
  MALFACON = 'MALFACON', 
  USURE_PREMATUREE = 'USURE_PREMATUREE',
  MAINTENANCE = 'MAINTENANCE',
  REPARATION = 'REPARATION',
  RETOUCHE = 'RETOUCHE',
  AUTRE = 'AUTRE'
}

export enum PrioriteSAV {
  CRITIQUE = 'CRITIQUE',
  HAUTE = 'HAUTE', 
  NORMALE = 'NORMALE',
  BASSE = 'BASSE'
}

export enum StatutSAV {
  NOUVEAU = 'NOUVEAU',
  EN_ATTENTE = 'EN_ATTENTE',
  ASSIGNE = 'ASSIGNE',
  PLANIFIE = 'PLANIFIE',
  EN_COURS = 'EN_COURS',
  EN_ATTENTE_PIECES = 'EN_ATTENTE_PIECES',
  EN_ATTENTE_VALIDATION = 'EN_ATTENTE_VALIDATION',
  RESOLU = 'RESOLU',
  CLOS = 'CLOS',
  ANNULE = 'ANNULE'
}

export enum TypeInterventionSAV {
  DIAGNOSTIC = 'DIAGNOSTIC',
  REPARATION = 'REPARATION',
  REMPLACEMENT = 'REMPLACEMENT',
  RETOUCHE = 'RETOUCHE',
  MAINTENANCE = 'MAINTENANCE',
  CONTROLE = 'CONTROLE'
}

export enum StatutInterventionSAV {
  PLANIFIEE = 'PLANIFIEE',
  EN_COURS = 'EN_COURS',
  TERMINEE = 'TERMINEE',
  REPORTEE = 'REPORTEE',
  ANNULEE = 'ANNULEE'
}

export enum TypeDocumentSAV {
  FACTURE = 'FACTURE',
  DEVIS = 'DEVIS',
  RAPPORT = 'RAPPORT',
  PLAN = 'PLAN',
  FICHE_TECHNIQUE = 'FICHE_TECHNIQUE',
  AUTRE = 'AUTRE'
}

export enum TypePhotoSAV {
  CONSTAT = 'CONSTAT',
  AVANT_INTERVENTION = 'AVANT_INTERVENTION',
  PENDANT_INTERVENTION = 'PENDANT_INTERVENTION',
  APRES_INTERVENTION = 'APRES_INTERVENTION',
  DETAIL = 'DETAIL',
  VUE_ENSEMBLE = 'VUE_ENSEMBLE'
}

export enum MomentPhotoIntervention {
  AVANT = 'AVANT',
  PENDANT = 'PENDANT',
  APRES = 'APRES'
}

export enum TypeCommentaireSAV {
  COMMENTAIRE = 'COMMENTAIRE',
  NOTE_TECHNIQUE = 'NOTE_TECHNIQUE',
  INSTRUCTION = 'INSTRUCTION',
  FEEDBACK_CLIENT = 'FEEDBACK_CLIENT',
  NOTE_INTERNE = 'NOTE_INTERNE'
}

// Interfaces principales
export interface TicketSAV {
  id: string
  chantierId?: string
  numTicket: string
  
  // Informations principales
  titre: string
  description: string
  type: TypeTicketSAV
  priorite: PrioriteSAV
  statut: StatutSAV
  
  // Localisation
  localisation?: string
  adresseIntervention?: string
  coordonnees?: unknown // JSON
  
  // Planification
  dateDemande: string
  dateInterventionSouhaitee?: string
  datePlanifiee?: string
  dateIntervention?: string
  dateResolution?: string
  dateCloture?: string
  
  // Assignation
  technicienAssignId?: string
  ouvrierInterneAssignId?: string
  equipeAssignId?: string
  soustraitantAssignId?: string
  
  // Coûts
  coutEstime?: number
  coutReel?: number
  
  // Métadonnées
  createdBy: string
  createdAt: string
  updatedAt: string
  
  // Relations (optionnelles, pour les requêtes avec include)
  chantier?: {
    id: string
    chantierId: string
    nomChantier: string
    clientNom?: string
  }
  technicienAssign?: {
    id: string
    name: string
    email: string
  }
  ouvrierInterneAssign?: {
    id: string
    nom: string
    prenom: string
    email?: string
  }
  soustraitantAssign?: {
    id: string
    nom: string
    email: string
  }
  createdByUser?: {
    id: string
    name: string
    email: string
  }
  interventions?: InterventionSAV[]
  documents?: DocumentSAV[]
  photos?: PhotoSAV[]
  commentaires?: CommentaireSAV[]
}

export interface InterventionSAV {
  id: string
  ticketSAVId: string
  
  // Informations
  titre: string
  description: string
  type: TypeInterventionSAV
  statut: StatutInterventionSAV
  
  // Timing
  dateDebut: string
  dateFin?: string
  dureeReelleMinutes?: number
  
  // Intervenant
  technicienId: string
  equipeId?: string
  
  // Matériels et coûts
  materielsUtilises?: string
  coutMateriel?: number
  coutMainOeuvre?: number
  
  // Résultat
  resultat?: string
  prochainAction?: string
  
  // Métadonnées
  createdAt: string
  updatedAt: string
  
  // Relations (optionnelles)
  technicien?: {
    id: string
    name: string
    email: string
  }
  photos?: PhotoInterventionSAV[]
}

export interface DocumentSAV {
  id: string
  ticketSAVId: string
  
  // Informations du fichier
  nom: string
  nomOriginal: string
  url: string
  taille: number
  mimeType: string
  type: TypeDocumentSAV
  
  // Description
  description?: string
  
  // Métadonnées
  uploadedBy: string
  createdAt: string
  updatedAt: string
  
  // Relations (optionnelles)
  uploadedByUser?: {
    id: string
    name: string
    email: string
  }
}

export interface PhotoSAV {
  id: string
  ticketSAVId: string
  
  // Informations
  url: string
  nomOriginal?: string
  description?: string
  type: TypePhotoSAV
  
  // Métadonnées géospatiales
  coordonnees?: unknown // JSON
  orientation?: number
  
  // Métadonnées
  prisePar: string
  createdAt: string
  
  // Relations (optionnelles)
  prisParUser?: {
    id: string
    name: string
    email: string
  }
}

export interface PhotoInterventionSAV {
  id: string
  interventionSAVId: string
  
  // Informations
  url: string
  nomOriginal?: string
  description?: string
  type: TypePhotoSAV
  
  // Moment
  momentPrise: MomentPhotoIntervention
  
  // Métadonnées
  prisePar: string
  createdAt: string
  
  // Relations (optionnelles)
  prisParUser?: {
    id: string
    name: string
    email: string
  }
}

export interface CommentaireSAV {
  id: string
  ticketSAVId: string
  
  // Contenu
  contenu: string
  type: TypeCommentaireSAV
  estInterne: boolean
  
  // Métadonnées
  auteurId: string
  createdAt: string
  updatedAt: string
  
  // Relations (optionnelles)
  auteur?: {
    id: string
    name: string
    email: string
  }
}

// Types pour les formulaires
export interface CreateTicketSAVData {
  chantierId?: string
  titre: string
  description: string
  type: TypeTicketSAV
  priorite: PrioriteSAV
  localisation?: string
  adresseIntervention?: string
  dateInterventionSouhaitee?: string
  technicienAssignId?: string
  ouvrierInterneAssignId?: string
  soustraitantAssignId?: string
  coutEstime?: number
  contactNom?: string
  contactTelephone?: string
  contactEmail?: string
}

export interface UpdateTicketSAVData {
  titre?: string
  description?: string
  type?: TypeTicketSAV
  priorite?: PrioriteSAV
  statut?: StatutSAV
  localisation?: string
  dateInterventionSouhaitee?: string
  datePlanifiee?: string
  dateIntervention?: string
  dateResolution?: string
  dateCloture?: string
  technicienAssignId?: string
  soustraitantAssignId?: string
  coutEstime?: number
  coutReel?: number
}

export interface CreateInterventionSAVData {
  ticketSAVId: string
  titre: string
  description: string
  type: TypeInterventionSAV
  dateDebut: string
  dateFin?: string
  technicienId: string
  materielsUtilises?: string
  coutMateriel?: number
  coutMainOeuvre?: number
}

export interface CreateCommentaireSAVData {
  ticketSAVId: string
  contenu: string
  type: TypeCommentaireSAV
  estInterne: boolean
}

// Types pour les statistiques et filtres
export interface StatistiquesSAV {
  totalTickets: number
  ticketsOuverts: number
  ticketsEnCours: number
  ticketsResolus: number
  delaiMoyenResolution: number // en jours
  coutTotal: number
  ticketsParPriorite: Record<PrioriteSAV, number>
  ticketsParType: Record<TypeTicketSAV, number>
  ticketsParStatut: Record<StatutSAV, number>
}

export interface FiltresSAV {
  chantierId?: string
  statut?: StatutSAV[]
  priorite?: PrioriteSAV[]
  type?: TypeTicketSAV[]
  technicienAssignId?: string
  soustraitantAssignId?: string
  dateDebutPeriode?: string
  dateFinPeriode?: string
  recherche?: string
}

// Labels pour l'affichage
export const LABELS_TYPE_TICKET_SAV: Record<TypeTicketSAV, string> = {
  [TypeTicketSAV.DEFAUT_CONFORMITE]: 'Défaut de conformité',
  [TypeTicketSAV.MALFACON]: 'Malfaçon',
  [TypeTicketSAV.USURE_PREMATUREE]: 'Usure prématurée',
  [TypeTicketSAV.MAINTENANCE]: 'Maintenance préventive',
  [TypeTicketSAV.REPARATION]: 'Réparation',
  [TypeTicketSAV.RETOUCHE]: 'Retouche esthétique',
  [TypeTicketSAV.AUTRE]: 'Autre'
}

export const LABELS_PRIORITE_SAV: Record<PrioriteSAV, string> = {
  [PrioriteSAV.CRITIQUE]: 'Critique',
  [PrioriteSAV.HAUTE]: 'Haute',
  [PrioriteSAV.NORMALE]: 'Normale',
  [PrioriteSAV.BASSE]: 'Basse'
}

export const LABELS_STATUT_SAV: Record<StatutSAV, string> = {
  [StatutSAV.NOUVEAU]: 'Nouveau',
  [StatutSAV.EN_ATTENTE]: 'En attente',
  [StatutSAV.ASSIGNE]: 'Assigné',
  [StatutSAV.PLANIFIE]: 'Planifié',
  [StatutSAV.EN_COURS]: 'En cours',
  [StatutSAV.EN_ATTENTE_PIECES]: 'En attente de pièces',
  [StatutSAV.EN_ATTENTE_VALIDATION]: 'En attente de validation',
  [StatutSAV.RESOLU]: 'Résolu',
  [StatutSAV.CLOS]: 'Clos',
  [StatutSAV.ANNULE]: 'Annulé'
}

export const LABELS_TYPE_DOCUMENT_SAV: Record<TypeDocumentSAV, string> = {
  [TypeDocumentSAV.FACTURE]: 'Facture',
  [TypeDocumentSAV.DEVIS]: 'Devis',
  [TypeDocumentSAV.RAPPORT]: 'Rapport technique',
  [TypeDocumentSAV.PLAN]: 'Plan',
  [TypeDocumentSAV.FICHE_TECHNIQUE]: 'Fiche technique',
  [TypeDocumentSAV.AUTRE]: 'Autre'
}

export const LABELS_TYPE_PHOTO_SAV: Record<TypePhotoSAV, string> = {
  [TypePhotoSAV.CONSTAT]: 'Constat initial',
  [TypePhotoSAV.AVANT_INTERVENTION]: 'Avant intervention',
  [TypePhotoSAV.PENDANT_INTERVENTION]: 'Pendant intervention',
  [TypePhotoSAV.APRES_INTERVENTION]: 'Après intervention',
  [TypePhotoSAV.DETAIL]: 'Détail',
  [TypePhotoSAV.VUE_ENSEMBLE]: 'Vue d\'ensemble'
}

// Couleurs pour l'affichage
export const COULEURS_PRIORITE_SAV: Record<PrioriteSAV, string> = {
  [PrioriteSAV.CRITIQUE]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  [PrioriteSAV.HAUTE]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [PrioriteSAV.NORMALE]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [PrioriteSAV.BASSE]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export const COULEURS_STATUT_SAV: Record<StatutSAV, string> = {
  [StatutSAV.NOUVEAU]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  [StatutSAV.EN_ATTENTE]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  [StatutSAV.ASSIGNE]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  [StatutSAV.PLANIFIE]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  [StatutSAV.EN_COURS]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  [StatutSAV.EN_ATTENTE_PIECES]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  [StatutSAV.EN_ATTENTE_VALIDATION]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  [StatutSAV.RESOLU]: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  [StatutSAV.CLOS]: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  [StatutSAV.ANNULE]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
}

// Transitions de statuts autorisées
export const getStatutsSuivantsPossibles = (statutActuel: StatutSAV): StatutSAV[] => {
  const transitions: Record<StatutSAV, StatutSAV[]> = {
    [StatutSAV.NOUVEAU]: [StatutSAV.EN_ATTENTE, StatutSAV.ASSIGNE, StatutSAV.ANNULE],
    [StatutSAV.EN_ATTENTE]: [StatutSAV.ASSIGNE, StatutSAV.ANNULE],
    [StatutSAV.ASSIGNE]: [StatutSAV.PLANIFIE, StatutSAV.EN_COURS, StatutSAV.EN_ATTENTE],
    [StatutSAV.PLANIFIE]: [StatutSAV.EN_COURS, StatutSAV.ANNULE],
    [StatutSAV.EN_COURS]: [StatutSAV.EN_ATTENTE_PIECES, StatutSAV.EN_ATTENTE_VALIDATION, StatutSAV.RESOLU],
    [StatutSAV.EN_ATTENTE_PIECES]: [StatutSAV.EN_COURS, StatutSAV.PLANIFIE],
    [StatutSAV.EN_ATTENTE_VALIDATION]: [StatutSAV.RESOLU, StatutSAV.EN_COURS],
    [StatutSAV.RESOLU]: [StatutSAV.CLOS, StatutSAV.EN_COURS],
    [StatutSAV.CLOS]: [],
    [StatutSAV.ANNULE]: []
  }
  
  return [statutActuel, ...(transitions[statutActuel] || [])]
} 
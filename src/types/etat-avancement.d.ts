// Interface pour les montants des états d'avancement
export interface EtatAvancementMontant {
  precedent: number
  actuel: number
  total: number
}

// Interface pour le récapitulatif des montants
export interface EtatAvancementSummary {
  totalCommandeInitiale: EtatAvancementMontant
  totalAvenants: EtatAvancementMontant
  totalGeneral: EtatAvancementMontant
}

// Interface pour une ligne d'état d'avancement sous-traitant
export interface LigneSoustraitantEtat {
  id: number
  soustraitantEtatAvancementId: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  quantitePrecedente: number
  quantiteActuelle: number
  quantiteTotale: number
  montantPrecedent: number
  montantActuel: number
  montantTotal: number
  createdAt: Date
  updatedAt: Date
}

// Interface pour un avenant d'état d'avancement sous-traitant
export interface AvenantSoustraitantEtat {
  id: number
  soustraitantEtatAvancementId: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  quantitePrecedente: number
  quantiteActuelle: number
  quantiteTotale: number
  montantPrecedent: number
  montantActuel: number
  montantTotal: number
  createdAt: Date
  updatedAt: Date
}

// Interface pour un état d'avancement sous-traitant
export interface SoustraitantEtat {
  id: number
  soustraitantId: string
  etatAvancementId: number
  commandeSousTraitantId: number | null
  numero: number
  date: Date
  commentaires: string | null
  estFinalise: boolean
  createdAt: Date
  updatedAt: Date
  lignes: LigneSoustraitantEtat[]
  avenants?: AvenantSoustraitantEtat[]
} 
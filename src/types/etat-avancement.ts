export interface EtatAvancement {
  id: number;
  chantierId: string;
  numero: number;
  date: Date;
  mois?: string;
  commentaires?: string;
  estFinalise: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lignes: LigneEtatAvancement[];
  avenants: AvenantEtatAvancement[];
}

export interface LigneEtatAvancement {
  id: number;
  etatAvancementId: number;
  ligneCommandeId: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantitePrecedente: number;
  quantiteActuelle: number;
  quantiteTotale: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvenantEtatAvancement {
  id: number;
  etatAvancementId: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantitePrecedente: number;
  quantiteActuelle: number;
  quantiteTotale: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

// Nouveaux types pour les états d'avancement sous-traitant
export interface SoustraitantEtat {
  id: number;
  chantierId: string;
  soustraitantId: string;
  numero: number;
  date: Date;
  mois?: string;
  commentaires?: string;
  estFinalise: boolean;
  commandeSousTraitantId?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lignes: LigneSoustraitantEtat[];
  avenants: AvenantSoustraitantEtat[];
  soustraitant?: unknown; // Type à préciser selon les besoins
  chantier?: unknown; // Type à préciser selon les besoins
  commandeSousTraitant?: unknown; // Type à préciser selon les besoins
}

export interface LigneSoustraitantEtat {
  id: number;
  soustraitantEtatId: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantitePrecedente: number;
  quantiteActuelle: number;
  quantiteTotale: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvenantSoustraitantEtat {
  id: number;
  soustraitantEtatId: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  quantitePrecedente: number;
  quantiteActuelle: number;
  quantiteTotale: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SoustraitantEtatSummary {
  totalCommandeInitiale: { precedent: number; actuel: number; total: number };
  totalAvenants: { precedent: number; actuel: number; total: number };
  totalGeneral: { precedent: number; actuel: number; total: number };
}

export interface EtatAvancementSummary {
  totalCommandeInitiale: {
    precedent: number;
    actuel: number;
    total: number;
  };
  totalAvenants: {
    precedent: number;
    actuel: number;
    total: number;
  };
  totalGeneral: {
    precedent: number;
    actuel: number;
    total: number;
  };
}

// Ajout de EtatAvancementEtendu
export interface EtatAvancementEtendu extends EtatAvancement { // Assurez-vous que EtatAvancement est bien défini/importé ici
  typeSoustraitant?: boolean;
  soustraitantId?: string;
} 
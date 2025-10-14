import { LigneEtatAvancement, AvenantEtatAvancement, LigneSoustraitantEtat, AvenantSoustraitantEtat } from '@/types/etat-avancement'

interface MontantsBase {
  quantiteTotale: number;
  montantActuel: number;
  montantTotal: number;
}

interface Totaux {
  precedent: number;
  actuel: number;
  total: number;
}

interface TotauxEtatAvancement {
  totalLignes: Totaux;
  totalAvenants: Totaux;
  totalGeneral: Totaux;
}

// Interface pour les objets avec des montants
export interface Montants {
  quantiteActuelle: number;
  quantitePrecedente: number;
  quantiteTotale: number;
  prixUnitaire: number;
  montantPrecedent: number;
  montantActuel: number;
  montantTotal: number;
}

/**
 * Calcule les montants d'une ligne (état d'avancement ou avenant)
 * @param ligne Ligne avec quantités et prix unitaire
 * @returns Ligne avec montants calculés
 */
export function calculerMontantsLigne<T extends Montants>(ligne: T): T {
  const montantActuel = ligne.quantiteActuelle * ligne.prixUnitaire;
  const quantiteTotale = ligne.quantitePrecedente + ligne.quantiteActuelle;
  const montantTotal = ligne.montantPrecedent + montantActuel;

  return {
    ...ligne,
    quantiteTotale,
    montantActuel,
    montantTotal
  };
}

/**
 * Calcule le total des montants pour un ensemble de lignes
 * @param lignes Tableau de lignes avec montants
 * @returns Objet avec les totaux (précédent, actuel, total)
 */
export function calculerTotalMontants(lignes: Montants[]) {
  return lignes.reduce(
    (acc, ligne) => {
      return {
        precedent: acc.precedent + ligne.montantPrecedent,
        actuel: acc.actuel + ligne.montantActuel,
        total: acc.total + ligne.montantTotal
      };
    },
    { precedent: 0, actuel: 0, total: 0 }
  );
}

/**
 * Calcule les montants d'un avenant d'état d'avancement client
 */
export function calculerMontantsAvenantClient(avenant: AvenantEtatAvancement): MontantsBase {
  const quantiteTotale = avenant.quantitePrecedente + avenant.quantiteActuelle
  const montantActuel = avenant.quantiteActuelle * avenant.prixUnitaire
  const montantTotal = avenant.montantPrecedent + montantActuel

  return {
    quantiteTotale,
    montantActuel,
    montantTotal
  }
}

/**
 * Calcule les montants d'une ligne d'état d'avancement sous-traitant
 */
export function calculerMontantsLigneSoustraitant(ligne: LigneSoustraitantEtat): MontantsBase {
  const quantiteTotale = ligne.quantitePrecedente + ligne.quantiteActuelle
  const montantActuel = ligne.quantiteActuelle * ligne.prixUnitaire
  const montantTotal = ligne.montantPrecedent + montantActuel

  return {
    quantiteTotale,
    montantActuel,
    montantTotal
  }
}

/**
 * Calcule les montants d'un avenant d'état d'avancement sous-traitant
 */
export function calculerMontantsAvenantSoustraitant(avenant: AvenantSoustraitantEtat): MontantsBase {
  const quantiteTotale = avenant.quantitePrecedente + avenant.quantiteActuelle
  const montantActuel = avenant.quantiteActuelle * avenant.prixUnitaire
  const montantTotal = avenant.montantPrecedent + montantActuel

  return {
    quantiteTotale,
    montantActuel,
    montantTotal
  }
}

/**
 * Calcule les totaux pour un état d'avancement client
 */
export function calculerTotauxEtatAvancement(lignes: LigneEtatAvancement[], avenants: AvenantEtatAvancement[]): TotauxEtatAvancement {
  const totalLignes: Totaux = {
    precedent: lignes.reduce((sum, ligne) => sum + ligne.montantPrecedent, 0),
    actuel: lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0),
    total: lignes.reduce((sum, ligne) => sum + ligne.montantTotal, 0)
  }

  const totalAvenants: Totaux = {
    precedent: avenants.reduce((sum, avenant) => sum + avenant.montantPrecedent, 0),
    actuel: avenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0),
    total: avenants.reduce((sum, avenant) => sum + avenant.montantTotal, 0)
  }

  return {
    totalLignes,
    totalAvenants,
    totalGeneral: {
      precedent: totalLignes.precedent + totalAvenants.precedent,
      actuel: totalLignes.actuel + totalAvenants.actuel,
      total: totalLignes.total + totalAvenants.total
    }
  }
}

/**
 * Calcule les totaux pour un état d'avancement sous-traitant
 */
export function calculerTotauxSoustraitantEtatAvancement(lignes: LigneSoustraitantEtat[], avenants: AvenantSoustraitantEtat[] = []): TotauxEtatAvancement {
  const totalLignes: Totaux = {
    precedent: lignes.reduce((sum, ligne) => sum + ligne.montantPrecedent, 0),
    actuel: lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0),
    total: lignes.reduce((sum, ligne) => sum + ligne.montantTotal, 0)
  }

  const totalAvenants: Totaux = {
    precedent: avenants.reduce((sum, avenant) => sum + avenant.montantPrecedent, 0),
    actuel: avenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0),
    total: avenants.reduce((sum, avenant) => sum + avenant.montantTotal, 0)
  }

  return {
    totalLignes,
    totalAvenants,
    totalGeneral: {
      precedent: totalLignes.precedent + totalAvenants.precedent,
      actuel: totalLignes.actuel + totalAvenants.actuel,
      total: totalLignes.total + totalAvenants.total
    }
  }
} 
/**
 * Filtre « états d'avancement sous-traitant de ce chantier » (id interne du chantier).
 *
 * Un état sous-traitant n'exige plus d'état client : le chantier se retrouve par
 * la commande sous-traitant, ou par l'état client pour les états créés avant ce
 * changement (ils y sont tous rattachés).
 */
export function etatsSoustraitantDuChantier(chantierCuid: string) {
  return {
    OR: [
      { commande_soustraitant: { chantierId: chantierCuid } },
      { etat_avancement: { chantierId: chantierCuid } },
    ],
  }
}

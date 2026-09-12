// Règle d'échéance des contrats sous-traitant — module pur, sans Prisma, pour
// être partagé entre l'API de liste, la modale d'historique et tout futur
// écran (badge tableau de bord, notification) sans dupliquer le seuil.

/** Nombre de jours avant l'échéance à partir duquel un renouvellement est
 *  proposé. 30 jours : le temps d'envoyer un nouveau contrat et de le faire
 *  signer avant l'expiration du précédent. */
export const SEUIL_RENOUVELLEMENT_JOURS = 30

const JOUR_MS = 24 * 60 * 60 * 1000

/** Jours restants avant `dateFin` (négatif si déjà dépassée). Null si aucune
 *  date de fin connue (contrats antérieurs à l'introduction du champ, avant
 *  rétro-remplissage, ou état incohérent). */
export function joursAvantEcheance(dateFin: Date | null | undefined): number | null {
  if (!dateFin) return null
  return Math.ceil((dateFin.getTime() - Date.now()) / JOUR_MS)
}

export type StatutEcheance = 'expire' | 'proche' | 'ok' | 'inconnu'

/** Statut d'échéance à afficher : expirée, proche du seuil, ou confortable. */
export function statutEcheance(dateFin: Date | null | undefined): StatutEcheance {
  const jours = joursAvantEcheance(dateFin)
  if (jours === null) return 'inconnu'
  if (jours < 0) return 'expire'
  if (jours <= SEUIL_RENOUVELLEMENT_JOURS) return 'proche'
  return 'ok'
}

/** Le renouvellement doit être proposé : contrat expiré ou proche du seuil. */
export function renouvellementConseille(dateFin: Date | null | undefined): boolean {
  const statut = statutEcheance(dateFin)
  return statut === 'expire' || statut === 'proche'
}

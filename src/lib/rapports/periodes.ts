// Périodes des états d'avancement pour le rapport d'activité. Module pur.
//
// Règle de clôture Secotech : le mois M est clôturé jusqu'au 20 du mois M+1.
//  - du 1er au 20 : la période suivie est le mois PRÉCÉDENT (en clôture),
//    le dernier mois clos est M-2 ;
//  - à partir du 21 : le mois précédent est clos, la période suivie est le
//    mois EN COURS.

export const JOUR_CLOTURE = 20

export const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

/** « Septembre 2026 » — même format que le champ `mois` des états d'avancement. */
export function libelleMois(annee: number, mois0: number): string {
  const d = new Date(Date.UTC(annee, mois0, 1))
  return `${MOIS_NOMS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export interface PeriodesRapport {
  /** Période suivie (« Septembre 2026 ») */
  suivie: string
  /** true si la période suivie est le mois précédent, en cours de clôture */
  enCloture: boolean
  /** Date limite de clôture de la période suivie (AAAA-MM-JJ), si en clôture */
  dateCloture: string | null
  /** Dernier mois clos (référence de comparaison) */
  dernierClos: string
  /** 6 derniers mois clos, du plus ancien au plus récent */
  derniersClos: string[]
}

/** @param date AAAA-MM-JJ (date du jour à Bruxelles) */
export function periodesRapport(date: string): PeriodesRapport {
  const [a, m, j] = date.split('-').map(Number)
  const mois0 = m - 1
  const enCloture = j <= JOUR_CLOTURE
  const decalageSuivie = enCloture ? -1 : 0
  const suivie = libelleMois(a, mois0 + decalageSuivie)
  const derniersClos: string[] = []
  for (let i = 6; i >= 1; i--) derniersClos.push(libelleMois(a, mois0 + decalageSuivie - i))
  return {
    suivie,
    enCloture,
    dateCloture: enCloture ? `${a}-${String(m).padStart(2, '0')}-${String(JOUR_CLOTURE).padStart(2, '0')}` : null,
    dernierClos: derniersClos[derniersClos.length - 1],
    derniersClos,
  }
}

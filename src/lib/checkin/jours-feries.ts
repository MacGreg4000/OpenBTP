// Jours fériés légaux belges (les 10 jours de la loi), calculés pour
// n'importe quelle année : aucune liste à tenir à jour. Module pur.

export interface JourFerie {
  date: string // AAAA-MM-JJ
  nom: string
}

const iso = (a: number, m: number, j: number) =>
  `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`

/** Dimanche de Pâques (calendrier grégorien, algorithme de Meeus/Jones/Butcher). */
export function dimancheDePaques(annee: number): { mois: number; jour: number } {
  const a = annee % 19
  const b = Math.floor(annee / 100)
  const c = annee % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31)
  const jour = ((h + l - 7 * m + 114) % 31) + 1
  return { mois, jour }
}

function decaler(annee: number, mois: number, jour: number, jours: number): string {
  const d = new Date(Date.UTC(annee, mois - 1, jour + jours))
  return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function joursFeriesBelges(annee: number): JourFerie[] {
  const p = dimancheDePaques(annee)
  return [
    { date: iso(annee, 1, 1), nom: 'Nouvel An' },
    { date: decaler(annee, p.mois, p.jour, 1), nom: 'Lundi de Pâques' },
    { date: iso(annee, 5, 1), nom: 'Fête du Travail' },
    { date: decaler(annee, p.mois, p.jour, 39), nom: 'Ascension' },
    { date: decaler(annee, p.mois, p.jour, 50), nom: 'Lundi de Pentecôte' },
    { date: iso(annee, 7, 21), nom: 'Fête nationale' },
    { date: iso(annee, 8, 15), nom: 'Assomption' },
    { date: iso(annee, 11, 1), nom: 'Toussaint' },
    { date: iso(annee, 11, 11), nom: 'Armistice' },
    { date: iso(annee, 12, 25), nom: 'Noël' },
  ]
}

/** Nom du jour férié belge à cette date (AAAA-MM-JJ), ou null. */
export function jourFerieBelge(date: string): string | null {
  const annee = Number(date.slice(0, 4))
  return joursFeriesBelges(annee).find((f) => f.date === date)?.nom ?? null
}

/** Prochains jours fériés à partir d'une date (incluse). */
export function prochainsJoursFeries(depuis: string, nombre = 4): JourFerie[] {
  const annee = Number(depuis.slice(0, 4))
  return [...joursFeriesBelges(annee), ...joursFeriesBelges(annee + 1)]
    .filter((f) => f.date >= depuis)
    .slice(0, nombre)
}

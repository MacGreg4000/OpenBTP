// Identifiants utiles à Checkinatwork : numéro national (NISS), numéro
// d'entreprise (BCE) et numéro de document (Limosa).
//
// Aucune validation bloquante : un numéro étranger doit pouvoir être saisi tel
// quel. On stocke une forme compacte (sans espaces ni ponctuation pour les
// numéros belges reconnus) et on formate seulement à l'affichage.

/** Forme stockée : null si vide ; chiffres seuls pour un NISS belge (11 chiffres). */
export function normaliserNumeroNational(valeur: unknown): string | null {
  const brut = String(valeur ?? '').trim()
  if (!brut) return null
  const chiffres = brut.replace(/\D/g, '')
  return chiffres.length === 11 && /^[\d\s.\-/]+$/.test(brut) ? chiffres : brut
}

/**
 * Forme stockée d'un numéro d'entreprise : null si vide ; « BE0123456789 » pour un
 * numéro belge reconnu (10 chiffres, ou 9 sans le 0 initial), sinon tel quel en majuscules.
 */
export function normaliserNumeroEntreprise(valeur: unknown): string | null {
  const brut = String(valeur ?? '').trim()
  if (!brut) return null
  const compact = brut.replace(/[\s.\-/]/g, '').toUpperCase()
  const sansPays = compact.startsWith('BE') ? compact.slice(2) : compact
  // Un numéro BCE commence par 0 ou 1 : un autre numéro à 10 chiffres reste tel quel
  if (/^[01]\d{9}$/.test(sansPays)) return `BE${sansPays}`
  if (/^\d{9}$/.test(sansPays)) return `BE0${sansPays}`
  return compact
}

/** Forme stockée d'un numéro de document : null si vide, sinon sans espaces superflus. */
export function normaliserNumeroDocument(valeur: unknown): string | null {
  const brut = String(valeur ?? '').trim().replace(/\s+/g, ' ')
  return brut || null
}

/** Affichage NISS : 00.00.00-000.00 ; autre valeur inchangée. */
export function formaterNumeroNational(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const v = valeur.trim()
  if (!/^\d{11}$/.test(v)) return v
  return `${v.slice(0, 2)}.${v.slice(2, 4)}.${v.slice(4, 6)}-${v.slice(6, 9)}.${v.slice(9)}`
}

/** Affichage BCE : BE 0123.456.789 ; autre valeur inchangée. */
export function formaterNumeroEntreprise(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const v = normaliserNumeroEntreprise(valeur) || ''
  const m = /^BE(\d{4})(\d{3})(\d{3})$/.exec(v)
  return m ? `BE ${m[1]}.${m[2]}.${m[3]}` : valeur.trim()
}

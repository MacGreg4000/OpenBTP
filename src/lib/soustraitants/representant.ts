// Représentant légal d'un sous-traitant — règles partagées par l'API, les
// formulaires et le générateur de contrat. Module pur (sans Prisma ni DNS),
// donc importable côté navigateur.
//
// Pourquoi ces champs sont obligatoires : le contrat-cadre v2 fait du
// représentant le signataire ET le destinataire des rappels Checkinatwork
// quotidiens (art. 8.6.2, « un rappel envoyé à l'adresse mentionnée au contrat
// est réputé reçu »). Un contrat affichant « Représenté par : Représentant »
// ou sans adresse de rappel ne vaut rien comme preuve.

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export interface RepresentantSaisi {
  representantNom?: string | null
  representantPrenom?: string | null
  representantFonction?: string | null
  representantEmail?: string | null
  representantGsm?: string | null
}

const LIBELLES: Record<keyof RepresentantSaisi, string> = {
  representantNom: 'nom du représentant',
  representantPrenom: 'prénom du représentant',
  representantFonction: 'fonction du représentant',
  representantEmail: 'email du représentant',
  representantGsm: 'GSM du représentant',
}

/** Champs manquants, en clair — vide si le représentant est complet. */
export function champsRepresentantManquants(r: RepresentantSaisi | null | undefined): string[] {
  return (Object.keys(LIBELLES) as (keyof RepresentantSaisi)[])
    .filter((k) => !String(r?.[k] ?? '').trim())
    .map((k) => LIBELLES[k])
}

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function emailFormatValide(email: string): boolean {
  return FORMAT_EMAIL.test(email.trim())
}

/**
 * Normalise un GSM en E.164 (+351912345678).
 *
 * Pays par défaut : Belgique (un 04… belge saisi sans indicatif). Un numéro
 * étranger — la plupart des sous-traitants concernés sont portugais ou
 * roumains — doit être saisi avec son indicatif (+351, 00351…), sinon il
 * serait interprété à tort comme belge.
 */
export function normaliserGsm(
  brut: string,
  paysParDefaut: CountryCode = 'BE'
): { ok: boolean; e164?: string; erreur?: string } {
  const s = String(brut || '').trim().replace(/^00/, '+')
  if (!s) return { ok: false, erreur: 'GSM vide.' }
  const tel = parsePhoneNumberFromString(s, paysParDefaut)
  if (!tel || !tel.isValid()) {
    return {
      ok: false,
      erreur: `GSM invalide : « ${brut} ». Pour un numéro étranger, indique l'indicatif (ex. +351 912 345 678).`,
    }
  }
  return { ok: true, e164: tel.number }
}

/** Affichage lisible d'un numéro E.164 (+351 912 345 678). */
export function formaterGsm(e164: string | null | undefined): string {
  if (!e164) return ''
  const tel = parsePhoneNumberFromString(e164)
  return tel ? tel.formatInternational() : e164
}

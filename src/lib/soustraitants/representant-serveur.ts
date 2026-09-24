// Validation serveur du représentant : vérification DNS du domaine email et
// normalisation complète avant écriture en base.

import { promises as dns } from 'dns'
import { emailFormatValide, normaliserGsm, type RepresentantSaisi } from './representant'

/**
 * Le domaine peut-il recevoir du courrier ? MX d'abord, A en repli (RFC 5321).
 *
 * Une erreur réseau ou un délai dépassé ne bloque PAS l'enregistrement : un
 * DNS momentanément indisponible sur le NAS ne doit pas empêcher le bureau de
 * travailler. Seul un domaine dont on sait qu'il n'existe pas est refusé —
 * c'est le cas d'une faute de frappe (gmial.com), celui qu'on veut attraper.
 */
async function domaineAccepteLeCourrier(domaine: string): Promise<'oui' | 'non' | 'inconnu'> {
  const avecDelai = <T,>(p: Promise<T>) =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('ETIMEOUT')), 4000))])
  try {
    const mx = await avecDelai(dns.resolveMx(domaine))
    if (mx.length > 0) return 'oui'
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    if (code !== 'ENOTFOUND' && code !== 'ENODATA') return 'inconnu'
  }
  try {
    const a = await avecDelai(dns.resolve4(domaine))
    return a.length > 0 ? 'oui' : 'non'
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code
    return code === 'ENOTFOUND' || code === 'ENODATA' ? 'non' : 'inconnu'
  }
}

export interface RepresentantNormalise {
  erreur?: string
  data?: RepresentantSaisi
}

/**
 * Valide et normalise les champs représentant présents dans `body`.
 * Seuls les champs fournis sont renvoyés (fusion partielle côté route) ;
 * une chaîne vide devient null.
 */
export async function normaliserRepresentant(body: Record<string, unknown>): Promise<RepresentantNormalise> {
  const data: RepresentantSaisi = {}
  const texte = (v: unknown) => {
    const s = String(v ?? '').trim()
    return s || null
  }

  for (const k of ['representantNom', 'representantPrenom', 'representantFonction'] as const) {
    if (body[k] !== undefined) data[k] = texte(body[k])
  }

  if (body.representantEmail !== undefined) {
    const email = texte(body.representantEmail)?.toLowerCase() ?? null
    if (email) {
      if (!emailFormatValide(email)) return { erreur: `Email du représentant invalide : « ${email} ».` }
      const domaine = email.split('@')[1]
      if ((await domaineAccepteLeCourrier(domaine)) === 'non') {
        return {
          erreur: `Le domaine « ${domaine} » ne reçoit pas d'email (faute de frappe ?). Vérifie l'adresse du représentant.`,
        }
      }
    }
    data.representantEmail = email
  }

  if (body.representantGsm !== undefined) {
    const brut = texte(body.representantGsm)
    if (brut) {
      const gsm = normaliserGsm(brut)
      if (!gsm.ok) return { erreur: gsm.erreur }
      data.representantGsm = gsm.e164
    } else {
      data.representantGsm = null
    }
  }

  return { data }
}

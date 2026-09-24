// Chantiers communiqués aux sous-traitants pour leur check-in Checkinatwork.
//
// Contexte : avertissement de l'Inspection du travail (CLS Liège, 23/09/2026)
// — des personnes d'un sous-traitant présentes sur chantier sans être
// enregistrées. Cette liste est publiée sur la page /checkin/<jeton> et, plus
// tard, figée dans chaque email de rappel quotidien comme élément de preuve :
// UNE seule fonction produit les deux, pour que la page et la preuve ne
// puissent jamais diverger.
//
// Données volontairement limitées : numéro, client, chantier, adresse. Aucune
// donnée financière ni coordonnée client — la page est publique.

import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma/client'

/** Statuts publiés. A_VENIR est inclus : ce sont les chantiers qui démarrent
 *  bientôt, et le premier jour sur chantier est justement le plus exposé. */
export const STATUTS_CHECKIN = ['EN_COURS', 'A_VENIR', 'EN_PREPARATION'] as const

export { LIBELLES_STATUT_CHECKIN } from './libelles'

export interface ChantierCheckin {
  id: string
  numero: string | null
  client: string
  chantier: string
  adresse: string
  localite: string
  statut: string
}

/** L'adresse contient parfois déjà la ville : on ne la répète pas. */
function composerAdresse(adresse: string | null, ville: string | null): string {
  const a = (adresse || '').trim()
  const v = (ville || '').trim()
  if (!a) return v
  if (!v || a.toLowerCase().includes(v.toLowerCase())) return a
  return `${a}, ${v}`
}

export async function listerChantiersCheckin(): Promise<ChantierCheckin[]> {
  const chantiers = await prisma.chantier.findMany({
    where: { statut: { in: [...STATUTS_CHECKIN] } },
    select: {
      id: true,
      numeroIdentification: true,
      nomChantier: true,
      adresseChantier: true,
      villeChantier: true,
      clientNom: true,
      statut: true,
      client: { select: { nom: true } },
    },
  })

  const ordreStatut = (s: string) => {
    const i = (STATUTS_CHECKIN as readonly string[]).indexOf(s)
    return i === -1 ? 99 : i
  }

  return chantiers
    .map((c) => ({
      id: c.id,
      // Trim, format saisi conservé (ex. XX-XXXXXX-XXX)
      numero: c.numeroIdentification?.trim() || null,
      client: (c.client?.nom || c.clientNom || '').trim(),
      chantier: c.nomChantier.trim(),
      adresse: composerAdresse(c.adresseChantier, c.villeChantier),
      localite: (c.villeChantier || '').trim(),
      statut: c.statut,
    }))
    .sort(
      (a, b) =>
        ordreStatut(a.statut) - ordreStatut(b.statut) ||
        a.localite.localeCompare(b.localite, 'fr') ||
        a.chantier.localeCompare(b.chantier, 'fr')
    )
}

/** Résout le jeton public. Aucun jeton configuré → aucune page accessible. */
export async function jetonCheckinValide(jeton: string): Promise<boolean> {
  const j = String(jeton || '').trim()
  if (j.length < 16) return false
  const settings = await prisma.companysettings.findFirst({ select: { checkinToken: true } })
  if (!settings?.checkinToken) return false
  const attendu = Buffer.from(settings.checkinToken)
  const fourni = Buffer.from(j)
  return attendu.length === fourni.length && timingSafeEqual(attendu, fourni)
}

/** URL publique de la page pour un jeton (null si aucun jeton). */
export function lienCheckin(jeton: string | null | undefined): string | null {
  if (!jeton) return null
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
  return `${base}/checkin/${jeton}`
}

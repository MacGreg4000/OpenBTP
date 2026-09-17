// Résolution d'entités à partir d'une référence libre fournie par le modèle.
//
// ATTENTION aux relations mixtes du schéma :
//   Commande / CommandeSousTraitant / EtatAvancement / Depense → Chantier.id (cuid)
//   Note / BonRegie / Task / Document / Tache                  → Chantier.chantierId (slug métier)
// Les outils doivent donc choisir explicitement la bonne clé.

import { prisma } from '@/lib/prisma/client'

export interface ChantierRef {
  id: string
  chantierId: string
  nomChantier: string
  statut: string
  clientId: string | null
}

export interface ClientRef {
  id: string
  nom: string
  numeroTva: string | null
  email: string | null
}

export interface ResolveResult<T> {
  ok: boolean
  value?: T
  message?: string
  candidats?: { id: string; nom: string }[]
}

/** Numéro de TVA comparable : majuscules, sans espaces/points/tirets/slashes. */
export function normalizeTva(value: string | null | undefined): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/**
 * Nom d'entreprise comparable : minuscules, sans accents, sans ponctuation,
 * sans forme juridique. « ACME S.R.L. » et « Acme SRL » deviennent « acme ».
 */
export function normalizeNomEntreprise(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
    // « & » et « et » sont équivalents dans les raisons sociales
    .replace(/&/g, ' et ')
    // les points sont SUPPRIMÉS (et non remplacés par une espace) pour que
    // « s.r.l. » redevienne « srl » et soit reconnu comme forme juridique
    .replace(/\./g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(sa|sprl|srl|scrl|bvba|nv|sc|scs|snc|asbl|sasu|sas|sarl|eurl)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function resolveChantier(ref: string): Promise<ResolveResult<ChantierRef>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence de chantier vide.' }

  const select = {
    id: true,
    chantierId: true,
    nomChantier: true,
    statut: true,
    clientId: true,
  }

  // 1. Clé exacte (slug métier ou cuid)
  const exact = await prisma.chantier.findFirst({
    where: { OR: [{ chantierId: cleaned }, { id: cleaned }] },
    select,
  })
  if (exact) return { ok: true, value: exact }

  // 2. Nom flou
  const matches = await prisma.chantier.findMany({
    where: { nomChantier: { contains: cleaned } },
    select,
    take: 6,
  })
  if (matches.length === 1) return { ok: true, value: matches[0] }
  if (matches.length > 1) {
    return {
      ok: false,
      message: `Plusieurs chantiers correspondent à « ${cleaned} ». Demande à l'utilisateur de préciser.`,
      candidats: matches.map((m) => ({ id: m.chantierId, nom: `${m.nomChantier} (${m.statut})` })),
    }
  }
  return { ok: false, message: `Aucun chantier trouvé pour « ${cleaned} ».` }
}

/** Résout un client par id exact, puis par nom (normalisé, puis contains). */
export async function resolveClient(ref: string): Promise<ResolveResult<ClientRef>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence de client vide.' }

  const select = { id: true, nom: true, numeroTva: true, email: true }

  const exact = await prisma.client.findUnique({ where: { id: cleaned }, select })
  if (exact) return { ok: true, value: exact }

  const matches = await prisma.client.findMany({
    where: { nom: { contains: cleaned } },
    select,
    take: 8,
  })
  if (matches.length === 1) return { ok: true, value: matches[0] }
  if (matches.length > 1) {
    // Un match normalisé exact tranche l'ambiguïté (« Acme SRL » vs « Acme SRL Bis »)
    const target = normalizeNomEntreprise(cleaned)
    const strict = matches.filter((m) => normalizeNomEntreprise(m.nom) === target)
    if (strict.length === 1) return { ok: true, value: strict[0] }
    return {
      ok: false,
      message: `Plusieurs clients correspondent à « ${cleaned} ». Demande à l'utilisateur de préciser.`,
      candidats: matches.map((m) => ({ id: m.id, nom: m.numeroTva ? `${m.nom} (${m.numeroTva})` : m.nom })),
    }
  }
  return { ok: false, message: `Aucun client trouvé pour « ${cleaned} ».` }
}

export async function resolveSousTraitant(
  ref: string
): Promise<ResolveResult<{ id: string; nom: string }>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence de sous-traitant vide.' }

  const exact = await prisma.soustraitant.findUnique({
    where: { id: cleaned },
    select: { id: true, nom: true },
  })
  if (exact) return { ok: true, value: exact }

  const matches = await prisma.soustraitant.findMany({
    where: { nom: { contains: cleaned } },
    select: { id: true, nom: true },
    take: 6,
  })
  if (matches.length === 1) return { ok: true, value: matches[0] }
  if (matches.length > 1) {
    return {
      ok: false,
      message: `Plusieurs sous-traitants correspondent à « ${cleaned} ». Demande à l'utilisateur de préciser.`,
      candidats: matches,
    }
  }
  return { ok: false, message: `Aucun sous-traitant trouvé pour « ${cleaned} ».` }
}

/** Résout un ouvrier par id exact, puis par nom/prénom flou, DANS le périmètre
 *  d'un sous-traitant donné — deux sous-traitants peuvent chacun employer un
 *  « Jean Dupont », la recherche ne doit jamais traverser cette frontière. */
export async function resolveOuvrier(
  sousTraitantId: string,
  ref: string
): Promise<ResolveResult<{ id: string; nom: string; prenom: string }>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence d’ouvrier vide.' }

  const select = { id: true, nom: true, prenom: true }

  const exact = await prisma.ouvrier.findFirst({
    where: { id: cleaned, sousTraitantId },
    select,
  })
  if (exact) return { ok: true, value: exact }

  const matches = await prisma.ouvrier.findMany({
    where: {
      sousTraitantId,
      OR: [{ nom: { contains: cleaned } }, { prenom: { contains: cleaned } }],
    },
    select,
    take: 8,
  })
  if (matches.length === 1) return { ok: true, value: matches[0] }
  if (matches.length > 1) {
    return {
      ok: false,
      message: `Plusieurs ouvriers de ce sous-traitant correspondent à « ${cleaned} ». Demande à l'utilisateur de préciser.`,
      candidats: matches.map((m) => ({ id: m.id, nom: `${m.prenom} ${m.nom}` })),
    }
  }
  return { ok: false, message: `Aucun ouvrier de ce sous-traitant ne correspond à « ${cleaned} ».` }
}

/** Borne un paramètre limit fourni par le modèle. */
export function clampLimit(value: unknown, def: number, max: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

/**
 * Arrondi monétaire à 2 décimales.
 *
 * Reproduit EXACTEMENT `Math.round(x * 100) / 100` utilisé par l'écran
 * commande (recalculerTotaux et le calcul du total de ligne). Ne pas y
 * ajouter Number.EPSILON : la variante « corrigée » diverge sur des valeurs
 * comme 1,005 et les totaux ne correspondraient plus au centime à ceux
 * affichés dans l'application.
 */
export function arrondi2(n: number): number {
  return Math.round(Number(n) * 100) / 100
}

/** Formate un montant en euros à la française (ex. 1 234,56 €). */
export function eur(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

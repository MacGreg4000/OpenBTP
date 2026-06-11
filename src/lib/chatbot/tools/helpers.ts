// Résolution d'entités à partir d'une référence libre du modèle.
// ATTENTION aux relations mixtes du schéma :
//   CommandeSousTraitant / EtatAvancement / Depense → Chantier.id (cuid)
//   Note / BonRegie / Task / Document / Tache       → Chantier.chantierId (clé métier)
import { prisma } from '@/lib/prisma/client'

export interface ChantierRef {
  id: string
  chantierId: string
  nomChantier: string
  statut: string
}

export interface ResolveResult<T> {
  ok: boolean
  value?: T
  message?: string
  candidats?: { id: string; nom: string }[]
}

export async function resolveChantier(ref: string): Promise<ResolveResult<ChantierRef>> {
  const cleaned = String(ref || '').trim()
  if (!cleaned) return { ok: false, message: 'Référence de chantier vide.' }

  const select = { id: true, chantierId: true, nomChantier: true, statut: true }

  // 1. Clé exacte (chantierId métier ou id cuid)
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

/** Borne un paramètre limit fourni par le modèle. */
export function clampLimit(value: unknown, def: number, max: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(n) || n <= 0) return def
  return Math.min(Math.floor(n), max)
}

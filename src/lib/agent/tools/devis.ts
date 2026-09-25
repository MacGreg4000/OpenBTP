// Devis CLIENT direct (pas d'avenant — la conversion devis → avenant est déjà
// gérée dans l'application, hors périmètre ici).
//
// Comme pour les commandes, POST /api/devis n'a pas de calcul serveur : les
// montants sont pris tels quels dans le corps de la requête. On les calcule
// donc nous-mêmes, en miroir EXACT de `calculerTotaux` (écran devis — DIFFÉRENT
// de `recalculerTotaux` des commandes) :
//   src/app/(dashboard)/devis/nouveau/page.tsx:230
//
//   lignesCalculables = lignes.filter(l => l.type === 'QP')   ← inclusion stricte,
//     pas une exclusion de TITRE/SOUS_TITRE comme pour les commandes (le devis
//     n'a que QP/TITRE/SOUS_TITRE, pas de QF/FF)
//   totalHT             = Σ ligne.total (lignes QP uniquement)
//   montantRemise        = totalHT * remiseGlobale / 100
//   totalHTApresRemise   = totalHT - montantRemise
//   totalTVA             = totalHTApresRemise * tauxTVA / 100
//   totalTTC             = totalHTApresRemise + totalTVA
//
// Piège vérifié dans le code : le champ stocké `montantHT` est bien
// `totalHTApresRemise` (HT APRÈS remise globale), pas le HT brut.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveClient, arrondi2, eur, clampLimit } from './helpers'

const TYPES_LIGNE_DEVIS = ['QP', 'TITRE', 'SOUS_TITRE'] as const
const TAUX_TVA_AUTORISES = [0, 6, 21] as const
const MAX_LIGNES = 300

interface LigneDevisNormalisee {
  ordre: number
  type: string
  article: string | null
  description: string | null
  unite: string
  quantite: number
  prixUnitaire: number
  remise: number
  total: number
}

function normaliserLignesDevis(
  brutes: unknown[]
): { lignes?: LigneDevisNormalisee[]; erreur?: string } {
  const lignes: LigneDevisNormalisee[] = []

  for (let i = 0; i < brutes.length; i++) {
    const l = (brutes[i] || {}) as Record<string, unknown>
    const type = l.type ? String(l.type).trim().toUpperCase() : 'QP'
    if (!(TYPES_LIGNE_DEVIS as readonly string[]).includes(type)) {
      return { erreur: `Ligne ${i + 1} : type « ${type} » invalide. Valeurs : ${TYPES_LIGNE_DEVIS.join(', ')}.` }
    }
    const estSection = type === 'TITRE' || type === 'SOUS_TITRE'

    if (estSection) {
      lignes.push({
        ordre: i + 1,
        type,
        article: String(l.article || (type === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')).trim(),
        description: String(l.description || (type === 'TITRE' ? 'TITRE DE SECTION' : 'Sous-titre de section')).trim(),
        unite: '',
        quantite: 0,
        prixUnitaire: 0,
        remise: 0,
        total: 0,
      })
      continue
    }

    const description = String(l.description || '').trim()
    if (!description) return { erreur: `Ligne ${i + 1} : description obligatoire.` }

    const quantite = Number(l.quantite ?? 0)
    const prixUnitaire = Number(l.prixUnitaire ?? 0)
    const remise = Number(l.remise ?? 0)
    if (!Number.isFinite(quantite) || !Number.isFinite(prixUnitaire) || !Number.isFinite(remise)) {
      return { erreur: `Ligne ${i + 1} : quantite, prixUnitaire et remise doivent être numériques.` }
    }
    if (quantite < 0 || prixUnitaire < 0) {
      return { erreur: `Ligne ${i + 1} : quantite et prixUnitaire ne peuvent pas être négatifs.` }
    }
    if (remise < 0 || remise > 100) {
      return { erreur: `Ligne ${i + 1} : remise doit être comprise entre 0 et 100.` }
    }

    const sousTotal = quantite * prixUnitaire
    lignes.push({
      ordre: i + 1,
      type: 'QP',
      article: l.article ? String(l.article).trim() : null,
      description,
      unite: l.unite ? String(l.unite).trim() : 'Pièces',
      quantite,
      prixUnitaire,
      remise,
      total: arrondi2(sousTotal - (sousTotal * remise) / 100),
    })
  }

  return { lignes }
}

interface TotauxDevis {
  totalHT: number
  montantRemise: number
  totalHTApresRemise: number
  totalTVA: number
  totalTTC: number
}

/** Miroir exact de calculerTotaux (écran devis). */
function calculerTotauxDevis(
  lignes: LigneDevisNormalisee[],
  tauxTVA: number,
  remiseGlobale: number
): TotauxDevis {
  const totalHT = arrondi2(lignes.filter((l) => l.type === 'QP').reduce((s, l) => s + l.total, 0))
  const montantRemise = arrondi2(totalHT * (remiseGlobale / 100))
  const totalHTApresRemise = arrondi2(totalHT - montantRemise)
  const totalTVA = arrondi2(totalHTApresRemise * (tauxTVA / 100))
  const totalTTC = arrondi2(totalHTApresRemise + totalTVA)
  return { totalHT, montantRemise, totalHTApresRemise, totalTVA, totalTTC }
}

/** Numéro séquentiel DEV-ANNÉE-XXXX, avec repli en cas de collision concurrente. */
async function genererNumeroDevis(): Promise<string> {
  const annee = new Date().getFullYear()
  for (let essai = 0; essai < 5; essai++) {
    const dernier = await prisma.devis.findFirst({
      where: { numeroDevis: { startsWith: `DEV-${annee}-` } },
      orderBy: { numeroDevis: 'desc' },
      select: { numeroDevis: true },
    })
    const dernierNumero = dernier ? parseInt(dernier.numeroDevis.split('-')[2], 10) || 0 : 0
    const candidat = `DEV-${annee}-${String(dernierNumero + 1 + essai).padStart(4, '0')}`
    const existe = await prisma.devis.findUnique({ where: { numeroDevis: candidat }, select: { id: true } })
    if (!existe) return candidat
  }
  // Repli improbable : horodatage pour garantir l'unicité
  return `DEV-${annee}-${Date.now().toString().slice(-6)}`
}

interface PreparationDevis {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  clientId?: string
  clientNom?: string
  reference?: string | null
  tauxTVA?: number
  remiseGlobale?: number
  observations?: string | null
  lignes?: LigneDevisNormalisee[]
  totaux?: TotauxDevis
}

async function preparerDevis(args: Record<string, unknown>): Promise<PreparationDevis> {
  const res = await resolveClient(String(args.client || ''))
  if (!res.ok || !res.value) return { erreur: res.message || 'Client introuvable.', candidats: res.candidats }

  const brutes = Array.isArray(args.lignes) ? (args.lignes as unknown[]) : null
  if (!brutes || brutes.length === 0) return { erreur: 'Au moins une ligne est requise.' }
  if (brutes.length > MAX_LIGNES) return { erreur: `Trop de lignes (${brutes.length}). Maximum ${MAX_LIGNES}.` }

  const norm = normaliserLignesDevis(brutes)
  if (norm.erreur) return { erreur: norm.erreur }
  if (!norm.lignes!.some((l) => l.type === 'QP')) {
    return { erreur: 'Le devis doit contenir au moins une ligne chiffrée (type QP).' }
  }

  let tauxTVA = 21
  if (args.tauxTVA !== undefined && args.tauxTVA !== null && String(args.tauxTVA) !== '') {
    const t = Number(args.tauxTVA)
    if (!(TAUX_TVA_AUTORISES as readonly number[]).includes(t)) {
      return { erreur: `tauxTVA invalide (${t}). Valeurs acceptées : ${TAUX_TVA_AUTORISES.join(', ')}.` }
    }
    tauxTVA = t
  }

  let remiseGlobale = 0
  if (args.remiseGlobale !== undefined && args.remiseGlobale !== null && String(args.remiseGlobale) !== '') {
    const r = Number(args.remiseGlobale)
    if (!Number.isFinite(r) || r < 0 || r > 100) {
      return { erreur: 'remiseGlobale doit être un nombre entre 0 et 100.' }
    }
    remiseGlobale = r
  }

  return {
    clientId: res.value.id,
    clientNom: res.value.nom,
    reference: args.reference ? String(args.reference).trim() : null,
    tauxTVA,
    remiseGlobale,
    observations: args.observations ? String(args.observations).trim() : null,
    lignes: norm.lignes,
    totaux: calculerTotauxDevis(norm.lignes!, tauxTVA, remiseGlobale),
  }
}

export const creerDevis: ToolDefinition = {
  name: 'creer_devis',
  description:
    'Crée un devis CLIENT (pas un avenant de chantier) en BROUILLON, avec ses lignes chiffrées. ' +
    'Les montants (HT, TVA, TTC) sont TOUJOURS calculés côté serveur — ne pas les fournir. ' +
    'Le numéro (DEV-ANNÉE-XXXX) est généré automatiquement. Pour convertir un devis accepté en ' +
    "commande ou en avenant de chantier, utiliser l'application. Utiliser dryRun pour vérifier " +
    "les totaux avant d'écrire.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Identifiant (CL-…) ou nom du client' },
      reference: { type: 'string', description: 'Référence libre du devis (optionnel)' },
      tauxTVA: {
        type: 'number',
        description: 'Taux de TVA en %. Défaut 21. 6 % pour rénovation de logement ancien, 0 % si exonéré.',
        enum: [0, 6, 21],
      },
      remiseGlobale: { type: 'number', description: 'Remise globale en % appliquée au total HT (défaut 0)' },
      observations: { type: 'string', description: 'Observations libres (optionnel)' },
      lignes: {
        type: 'array',
        description:
          'Lignes du devis, dans l’ordre. TITRE et SOUS_TITRE structurent le document et sont ' +
          'exclues des totaux ; au moins une ligne QP est requise.',
        items: {
          type: 'object',
          properties: {
            article: { type: 'string', description: "Référence de l'article (optionnel)" },
            description: { type: 'string', description: 'Libellé du poste (obligatoire hors sections)' },
            type: { type: 'string', description: 'QP (défaut), TITRE ou SOUS_TITRE', enum: [...TYPES_LIGNE_DEVIS] },
            unite: { type: 'string', description: "Unité (m², m³, pièce…). Défaut « Pièces »" },
            quantite: { type: 'number', description: 'Quantité' },
            prixUnitaire: { type: 'number', description: 'Prix unitaire' },
            remise: { type: 'number', description: 'Remise en % sur cette ligne uniquement (défaut 0)' },
          },
          required: ['description'],
        },
      },
    },
    required: ['client', 'lignes'],
  },
  summarize: async (args) => {
    const p = await preparerDevis(args)
    if (p.erreur) return `Création impossible : ${p.erreur}`
    const t = p.totaux!
    const nbPostes = p.lignes!.filter((l) => l.type === 'QP').length
    const remise = t.montantRemise > 0 ? ` − remise ${p.remiseGlobale}% (${eur(t.montantRemise)})` : ''
    return (
      `Créer un devis BROUILLON pour « ${p.clientNom} » : ${nbPostes} poste(s), ` +
      `HT ${eur(t.totalHT)}${remise}, TVA ${p.tauxTVA}% ${eur(t.totalTVA)}, TTC ${eur(t.totalTTC)}.`
    )
  },
  preview: async (args) => {
    const p = await preparerDevis(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'creation',
      client: p.clientNom,
      statut: 'BROUILLON',
      reference: p.reference,
      tauxTVA: p.tauxTVA,
      remiseGlobale: p.remiseGlobale,
      nbLignes: p.lignes!.length,
      totaux: p.totaux,
      note: 'Montants calculés côté serveur — à comparer au devis source avant exécution.',
    }
  },
  execute: async (args, ctx) => {
    const p = await preparerDevis(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const t = p.totaux!

    const numeroDevis = await genererNumeroDevis()
    const dateValidite = new Date()
    dateValidite.setDate(dateValidite.getDate() + 30)

    const devis = await prisma.$transaction(async (tx) => {
      const d = await tx.devis.create({
        data: {
          numeroDevis,
          typeDevis: 'DEVIS',
          reference: p.reference,
          clientId: p.clientId!,
          chantierId: null,
          dateValidite,
          observations: p.observations,
          tauxTVA: p.tauxTVA!,
          remiseGlobale: p.remiseGlobale!,
          montantHT: t.totalHTApresRemise,
          montantTVA: t.totalTVA,
          montantTTC: t.totalTTC,
          createdBy: ctx.userId,
        },
        select: { id: true, numeroDevis: true },
      })

      await tx.ligneDevis.createMany({
        data: p.lignes!.map((l) => ({
          devisId: d.id,
          ordre: l.ordre,
          type: l.type,
          article: l.article,
          description: l.description,
          unite: l.unite,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          remise: l.remise,
          total: l.total,
        })),
      })

      return d
    })

    return {
      succes: true,
      devisId: devis.id,
      numeroDevis: devis.numeroDevis,
      client: p.clientNom,
      statut: 'BROUILLON',
      totaux: t,
      prochaineEtape:
        "Le devis est en brouillon. Envoie-le au client depuis l'application ; une fois accepté, " +
        'il peut y être converti en commande ou en avenant de chantier.',
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Lecture et modification des devis
// ─────────────────────────────────────────────────────────────────────────────
//
// Même règle que l'application (PATCH /api/devis/[devisId]) : seul un devis
// BROUILLON est modifiable. Les lignes sont réécrites intégralement dans une
// transaction (l'application fait de même : deleteMany + createMany) et les
// totaux sont recalculés avec calculerTotauxDevis — jamais repris du modèle.

const STATUTS_DEVIS = ['BROUILLON', 'EN_ATTENTE', 'ACCEPTE', 'REFUSE', 'CONVERTI', 'EXPIRE'] as const

interface DevisRef {
  id: string
  numeroDevis: string
}

interface ResolutionDevis {
  devis?: DevisRef
  erreur?: string
  candidats?: { id: string; nom: string }[]
}

/** Accepte l'id, le numéro complet (DEV-2026-0012) ou sa fin (2026-0012, 0012, 12). */
async function resolveDevis(ref: unknown): Promise<ResolutionDevis> {
  const r = String(ref ?? '').trim()
  if (!r) return { erreur: 'Référence de devis vide (numéro DEV-… ou identifiant).' }
  const select = { id: true, numeroDevis: true }

  const exact =
    (await prisma.devis.findUnique({ where: { id: r }, select })) ||
    (await prisma.devis.findUnique({ where: { numeroDevis: r.toUpperCase() }, select }))
  if (exact) return { devis: exact }

  // « 12 » → « 0012 » : les numéros sont complétés à 4 chiffres
  const fin = /^\d{1,3}$/.test(r) ? r.padStart(4, '0') : r
  const matches = await prisma.devis.findMany({
    where: { numeroDevis: { endsWith: fin } },
    select: { ...select, dateCreation: true },
    orderBy: { dateCreation: 'desc' },
    take: 8,
  })
  if (matches.length === 1) return { devis: matches[0] }
  if (matches.length > 1) {
    return {
      erreur: `Plusieurs devis correspondent à « ${r} ». Précise le numéro complet.`,
      candidats: matches.map((m) => ({ id: m.id, nom: m.numeroDevis })),
    }
  }
  return { erreur: `Aucun devis trouvé pour « ${r} ».` }
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v))

export const listeDevis: ToolDefinition = {
  name: 'liste_devis',
  description:
    'Liste les devis (et avenants) avec numéro, client, statut, dates et montants. ' +
    'Filtrable par statut, client, type et recherche sur le numéro ou la référence. ' +
    'Utiliser detail_devis pour lire les lignes.',
  parameters: {
    type: 'object',
    properties: {
      statut: { type: 'string', enum: [...STATUTS_DEVIS], description: 'Filtrer par statut' },
      client: { type: 'string', description: 'Nom (partiel) ou identifiant du client' },
      typeDevis: { type: 'string', enum: ['DEVIS', 'AVENANT'], description: 'Filtrer par type' },
      recherche: { type: 'string', description: 'Recherche sur le numéro, la référence ou les observations' },
      limit: { type: 'number', description: 'Nombre max de résultats (défaut 20, max 50)' },
    },
  },
  execute: async (args) => {
    const limit = clampLimit(args.limit, 20, 50)
    const where: Record<string, unknown> = {}
    if (args.statut) where.statut = String(args.statut).toUpperCase()
    if (args.typeDevis) where.typeDevis = String(args.typeDevis).toUpperCase()
    if (args.client) {
      const c = String(args.client).trim()
      where.OR = [{ clientId: c }, { client: { nom: { contains: c } } }]
    }
    if (args.recherche) {
      const q = String(args.recherche).trim()
      where.AND = [
        { OR: [{ numeroDevis: { contains: q } }, { reference: { contains: q } }, { observations: { contains: q } }] },
      ]
    }
    const devis = await prisma.devis.findMany({
      where,
      select: {
        id: true,
        numeroDevis: true,
        typeDevis: true,
        reference: true,
        statut: true,
        dateCreation: true,
        dateValidite: true,
        tauxTVA: true,
        montantHT: true,
        montantTTC: true,
        client: { select: { nom: true } },
        chantier: { select: { chantierId: true, nomChantier: true } },
        _count: { select: { lignes: true } },
      },
      orderBy: { dateCreation: 'desc' },
      take: limit,
    })
    return {
      total: devis.length,
      devis: devis.map((d) => ({
        id: d.id,
        numeroDevis: d.numeroDevis,
        type: d.typeDevis,
        reference: d.reference,
        statut: d.statut,
        modifiable: d.statut === 'BROUILLON',
        client: d.client?.nom,
        chantier: d.chantier ? `${d.chantier.nomChantier} (${d.chantier.chantierId})` : undefined,
        dateCreation: d.dateCreation,
        dateValidite: d.dateValidite,
        tauxTVA: d.tauxTVA,
        montantHTApresRemise: d.montantHT,
        montantTTC: d.montantTTC,
        nbLignes: d._count.lignes,
      })),
    }
  },
}

export const detailDevis: ToolDefinition = {
  name: 'detail_devis',
  description:
    "Lit un devis complet : en-tête, client, statut, totaux et TOUTES ses lignes numérotées (champ « ligne »). " +
    'Ces numéros de ligne sont ceux à utiliser dans operationsLignes de modifier_devis.',
  parameters: {
    type: 'object',
    properties: {
      devis: { type: 'string', description: 'Numéro (DEV-2026-0012, ou 2026-0012, ou 12) ou identifiant du devis' },
    },
    required: ['devis'],
  },
  execute: async (args) => {
    const r = await resolveDevis(args.devis)
    if (!r.devis) return { erreur: r.erreur, candidats: r.candidats }
    const d = await prisma.devis.findUnique({
      where: { id: r.devis.id },
      include: {
        client: { select: { id: true, nom: true } },
        chantier: { select: { chantierId: true, nomChantier: true } },
        createur: { select: { name: true } },
        lignes: { orderBy: { ordre: 'asc' } },
      },
    })
    if (!d) return { erreur: 'Devis introuvable.' }
    return {
      id: d.id,
      numeroDevis: d.numeroDevis,
      type: d.typeDevis,
      reference: d.reference,
      statut: d.statut,
      modifiable: d.statut === 'BROUILLON',
      ...(d.statut !== 'BROUILLON' && {
        info: "Non modifiable par modifier_devis : seul un devis BROUILLON l'est (même règle que l'application).",
      }),
      client: d.client,
      chantier: d.chantier ?? undefined,
      creePar: d.createur?.name,
      dateCreation: d.dateCreation,
      dateValidite: d.dateValidite,
      observations: d.observations,
      tauxTVA: d.tauxTVA,
      remiseGlobale: d.remiseGlobale,
      montantHTApresRemise: d.montantHT,
      montantTVA: d.montantTVA,
      montantTTC: d.montantTTC,
      convertiEnCommande: d.convertedToCommandeId ?? undefined,
      lignes: d.lignes.map((l, i) => ({
        ligne: i + 1,
        type: l.type,
        ...(l.type === 'QP'
          ? {
              article: l.article,
              description: l.description,
              unite: l.unite,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              remise: l.remise,
              total: l.total,
            }
          : { description: l.description }),
      })),
    }
  },
}

interface PreparationModification {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  devisId?: string
  numeroDevis?: string
  data?: {
    clientId?: string
    reference?: string | null
    observations?: string | null
    tauxTVA: number
    remiseGlobale: number
    dateValidite?: Date
  }
  clientNom?: string
  lignes?: LigneDevisNormalisee[]
  lignesModifiees: boolean
  avant?: TotauxDevis & { nbLignes: number }
  apres?: TotauxDevis & { nbLignes: number }
  changements: string[]
}

export type LigneCourante = LigneDevisNormalisee & { touchee: boolean }

/**
 * Applique des opérations ciblées aux lignes d'un devis. Fonction pure.
 * Les numéros de ligne désignent TOUJOURS le devis tel qu'il est avant
 * modification (numérotation de detail_devis) : les opérations sont donc
 * indépendantes de leur ordre d'écriture.
 */
export function appliquerOperationsLignes(
  actuelles: LigneCourante[],
  ops: Record<string, unknown>[]
): { lignes?: LigneCourante[]; resume?: string; erreur?: string } {
  const n = actuelles.length
  const supprimees = new Set<number>()
  const modifiees = new Map<number, Record<string, unknown>>()
  const insertions = new Map<number, unknown[]>() // clé : après la ligne n (0 = en tête)
  let nbAjouts = 0

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i] || {}
    const action = String(op.action || '').toLowerCase()
    const ligne = Number(op.ligne)
    const etiquette = `Opération ${i + 1} (${action || '?'})`
    if (action === 'modifier' || action === 'supprimer') {
      if (!Number.isInteger(ligne) || ligne < 1 || ligne > n) {
        return { erreur: `${etiquette} : ligne ${op.ligne} inexistante (le devis a ${n} lignes).` }
      }
      if (supprimees.has(ligne) || modifiees.has(ligne)) {
        return { erreur: `${etiquette} : la ligne ${ligne} est visée par plusieurs opérations.` }
      }
      if (action === 'supprimer') supprimees.add(ligne)
      else {
        const champs = (op.champs || {}) as Record<string, unknown>
        if (!Object.keys(champs).length) return { erreur: `${etiquette} : champs à modifier manquants.` }
        modifiees.set(ligne, champs)
      }
    } else if (action === 'inserer') {
      const apres = op.apres === undefined ? n : Number(op.apres)
      if (!Number.isInteger(apres) || apres < 0 || apres > n) {
        return { erreur: `${etiquette} : apres=${op.apres} invalide (0 à ${n}).` }
      }
      const nouvelles = Array.isArray(op.lignes) ? (op.lignes as unknown[]) : []
      if (!nouvelles.length) return { erreur: `${etiquette} : lignes à insérer manquantes.` }
      insertions.set(apres, [...(insertions.get(apres) || []), ...nouvelles])
      nbAjouts += nouvelles.length
    } else {
      return { erreur: `${etiquette} : action inconnue. Valeurs : modifier, supprimer, inserer.` }
    }
  }

  const resultat: LigneCourante[] = []
  const inserer = (apres: number): string | undefined => {
    const brutes = insertions.get(apres)
    if (!brutes) return
    const norm = normaliserLignesDevis(brutes)
    if (norm.erreur) return `Insertion après la ligne ${apres} — ${norm.erreur}`
    norm.lignes!.forEach((l) => resultat.push({ ...l, touchee: true }))
  }
  let e = inserer(0)
  if (e) return { erreur: e }
  for (const l of actuelles) {
    if (!supprimees.has(l.ordre)) {
      const champs = modifiees.get(l.ordre)
      if (champs) {
        // Fusion puis revalidation complète de la ligne modifiée
        const fusion = {
          type: l.type,
          article: l.article,
          description: l.description,
          unite: l.unite,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          remise: l.remise,
          ...champs,
        }
        const norm = normaliserLignesDevis([fusion])
        if (norm.erreur) return { erreur: norm.erreur.replace('Ligne 1', `Ligne ${l.ordre}`) }
        resultat.push({ ...norm.lignes![0], touchee: true })
      } else {
        resultat.push(l)
      }
    }
    e = inserer(l.ordre)
    if (e) return { erreur: e }
  }
  if (resultat.length === 0) return { erreur: 'Toutes les lignes seraient supprimées.' }
  if (resultat.length > MAX_LIGNES) return { erreur: `Trop de lignes (${resultat.length}). Maximum ${MAX_LIGNES}.` }

  const parts = []
  if (modifiees.size) parts.push(`${modifiees.size} modifiée(s)`)
  if (supprimees.size) parts.push(`${supprimees.size} supprimée(s)`)
  if (nbAjouts) parts.push(`${nbAjouts} ajoutée(s)`)
  return { lignes: resultat.map((l, i) => ({ ...l, ordre: i + 1 })), resume: parts.join(', ') }
}

async function preparerModification(args: Record<string, unknown>): Promise<PreparationModification> {
  const vide: PreparationModification = { lignesModifiees: false, changements: [] }
  const r = await resolveDevis(args.devis)
  if (!r.devis) return { ...vide, erreur: r.erreur, candidats: r.candidats }

  const d = await prisma.devis.findUnique({
    where: { id: r.devis.id },
    include: { client: { select: { nom: true } }, lignes: { orderBy: { ordre: 'asc' } } },
  })
  if (!d) return { ...vide, erreur: 'Devis introuvable.' }
  if (d.statut !== 'BROUILLON') {
    return {
      ...vide,
      erreur:
        `Le devis ${d.numeroDevis} est « ${d.statut} » : seuls les devis en BROUILLON sont modifiables ` +
        "(même règle que l'application). Pour le modifier, il faut d'abord le remettre en brouillon dans l'application.",
    }
  }

  const changements: string[] = []
  const tauxActuel = num(d.tauxTVA)
  const remiseActuelle = num(d.remiseGlobale)
  const data: PreparationModification['data'] = { tauxTVA: tauxActuel, remiseGlobale: remiseActuelle }
  let clientNom = d.client?.nom

  if (args.client !== undefined && String(args.client).trim()) {
    if (d.typeDevis === 'AVENANT') {
      return { ...vide, erreur: "Le client d'un avenant suit son chantier : il ne se change pas ici." }
    }
    const c = await resolveClient(String(args.client))
    if (!c.ok || !c.value) return { ...vide, erreur: c.message || 'Client introuvable.', candidats: c.candidats }
    if (c.value.id !== d.clientId) {
      data.clientId = c.value.id
      clientNom = c.value.nom
      changements.push(`client : ${d.client?.nom} → ${c.value.nom}`)
    }
  }
  if (args.reference !== undefined) {
    const v = String(args.reference ?? '').trim() || null
    if (v !== d.reference) {
      data.reference = v
      changements.push(`référence : ${d.reference ?? '—'} → ${v ?? '—'}`)
    }
  }
  if (args.observations !== undefined) {
    const v = String(args.observations ?? '').trim() || null
    if (v !== d.observations) {
      data.observations = v
      changements.push('observations modifiées')
    }
  }
  if (args.tauxTVA !== undefined && args.tauxTVA !== null && String(args.tauxTVA) !== '') {
    const t = Number(args.tauxTVA)
    if (!(TAUX_TVA_AUTORISES as readonly number[]).includes(t)) {
      return { ...vide, erreur: `tauxTVA invalide (${t}). Valeurs acceptées : ${TAUX_TVA_AUTORISES.join(', ')}.` }
    }
    if (t !== tauxActuel) changements.push(`TVA : ${tauxActuel}% → ${t}%`)
    data.tauxTVA = t
  }
  if (args.remiseGlobale !== undefined && args.remiseGlobale !== null && String(args.remiseGlobale) !== '') {
    const rg = Number(args.remiseGlobale)
    if (!Number.isFinite(rg) || rg < 0 || rg > 100) return { ...vide, erreur: 'remiseGlobale doit être entre 0 et 100.' }
    if (rg !== remiseActuelle) changements.push(`remise globale : ${remiseActuelle}% → ${rg}%`)
    data.remiseGlobale = rg
  }
  if (args.dateValidite !== undefined && String(args.dateValidite).trim()) {
    const s = String(args.dateValidite).trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ...vide, erreur: 'dateValidite au format AAAA-MM-JJ.' }
    data.dateValidite = new Date(`${s}T12:00:00`)
    changements.push(`validité → ${s}`)
  }

  // Lignes actuelles, au format normalisé
  const actuelles: LigneCourante[] = d.lignes.map((l, i) => ({
    ordre: i + 1,
    type: l.type || 'QP',
    article: l.article,
    description: l.description,
    unite: l.unite || '',
    quantite: num(l.quantite),
    prixUnitaire: num(l.prixUnitaire),
    remise: num(l.remise),
    total: num(l.total),
    touchee: false,
  }))
  const avantTotaux = calculerTotauxDevis(actuelles, tauxActuel, remiseActuelle)

  const aRemplacement = Array.isArray(args.lignes)
  const aOperations = Array.isArray(args.operationsLignes) && (args.operationsLignes as unknown[]).length > 0
  if (aRemplacement && aOperations) {
    return { ...vide, erreur: 'Utiliser soit lignes (remplacement complet), soit operationsLignes (modifications ciblées), pas les deux.' }
  }

  let lignes: LigneDevisNormalisee[] = actuelles
  let lignesModifiees = false

  if (aRemplacement) {
    const brutes = args.lignes as unknown[]
    if (brutes.length === 0) return { ...vide, erreur: 'lignes est vide : un devis doit garder au moins une ligne.' }
    if (brutes.length > MAX_LIGNES) return { ...vide, erreur: `Trop de lignes (${brutes.length}). Maximum ${MAX_LIGNES}.` }
    const norm = normaliserLignesDevis(brutes)
    if (norm.erreur) return { ...vide, erreur: norm.erreur }
    lignes = norm.lignes!
    lignesModifiees = true
    changements.push(`lignes remplacées : ${actuelles.length} → ${lignes.length}`)
  } else if (aOperations) {
    const r = appliquerOperationsLignes(actuelles, args.operationsLignes as Record<string, unknown>[])
    if (r.erreur) return { ...vide, erreur: r.erreur }
    lignes = r.lignes!
    lignesModifiees = true
    changements.push(`lignes : ${r.resume}`)
  }

  if (lignesModifiees && !lignes.some((l) => l.type === 'QP')) {
    return { ...vide, erreur: 'Le devis doit garder au moins une ligne chiffrée (type QP).' }
  }
  if (!changements.length) return { ...vide, erreur: 'Aucune modification demandée (ou valeurs identiques).' }

  const apresTotaux = calculerTotauxDevis(lignes, data.tauxTVA, data.remiseGlobale)
  return {
    devisId: d.id,
    numeroDevis: d.numeroDevis,
    data,
    clientNom,
    lignes: lignes.map(({ ordre, type, article, description, unite, quantite, prixUnitaire, remise, total }) => ({
      ordre, type, article, description, unite, quantite, prixUnitaire, remise, total,
    })),
    lignesModifiees,
    avant: { ...avantTotaux, nbLignes: actuelles.length },
    apres: { ...apresTotaux, nbLignes: lignes.length },
    changements,
  }
}

const schemaLigne = {
  type: 'object',
  properties: {
    type: { type: 'string', enum: [...TYPES_LIGNE_DEVIS], description: 'QP (défaut), TITRE ou SOUS_TITRE' },
    article: { type: 'string' },
    description: { type: 'string' },
    unite: { type: 'string' },
    quantite: { type: 'number' },
    prixUnitaire: { type: 'number' },
    remise: { type: 'number', description: 'Remise en % sur la ligne' },
  },
}

export const modifierDevis: ToolDefinition = {
  name: 'modifier_devis',
  description:
    'Modifie un devis en BROUILLON (seul statut modifiable, comme dans l’application) : en-tête ' +
    '(client, référence, observations, TVA, remise globale, date de validité) et/ou lignes. ' +
    'Deux façons de modifier les lignes, au choix : operationsLignes (modifier / supprimer / insérer ' +
    'des lignes précises, numérotées comme dans detail_devis — à privilégier) ou lignes (remplace TOUTES ' +
    'les lignes). Les totaux sont TOUJOURS recalculés côté serveur. Lire le devis avec detail_devis ' +
    'avant, et faire un dryRun pour montrer les totaux avant/après.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      devis: { type: 'string', description: 'Numéro (DEV-2026-0012, 2026-0012 ou 12) ou identifiant' },
      client: { type: 'string', description: 'Nouveau client (identifiant ou nom) — devis uniquement, pas les avenants' },
      reference: { type: 'string', description: 'Nouvelle référence (chaîne vide pour effacer)' },
      observations: { type: 'string', description: 'Nouvelles observations (remplacent les anciennes ; vide pour effacer)' },
      tauxTVA: { type: 'number', enum: [0, 6, 21], description: 'Nouveau taux de TVA' },
      remiseGlobale: { type: 'number', description: 'Nouvelle remise globale en %' },
      dateValidite: { type: 'string', description: 'Nouvelle date de validité AAAA-MM-JJ' },
      operationsLignes: {
        type: 'array',
        description:
          'Modifications ciblées. Les numéros de ligne sont ceux de detail_devis AVANT modification, ' +
          'quel que soit l’ordre des opérations.',
        items: {
          type: 'object',
          properties: {
            action: { type: 'string', enum: ['modifier', 'supprimer', 'inserer'] },
            ligne: { type: 'number', description: 'modifier / supprimer : numéro de la ligne visée' },
            champs: { ...schemaLigne, description: 'modifier : seuls les champs à changer' },
            apres: { type: 'number', description: 'inserer : insérer après cette ligne (0 = en tête ; défaut : à la fin)' },
            lignes: { type: 'array', items: schemaLigne, description: 'inserer : lignes à insérer' },
          },
          required: ['action'],
        },
      },
      lignes: {
        type: 'array',
        items: schemaLigne,
        description: 'Remplacement COMPLET des lignes (toutes les lignes du devis, dans l’ordre). Exclusif avec operationsLignes.',
      },
    },
    required: ['devis'],
  },
  summarize: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return `Modification impossible : ${p.erreur}`
    return (
      `Modifier le devis ${p.numeroDevis} (${p.clientNom}) : ${p.changements.join(' ; ')}. ` +
      `TTC ${eur(p.avant!.totalTTC)} → ${eur(p.apres!.totalTTC)}.`
    )
  },
  preview: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'modification',
      devis: p.numeroDevis,
      client: p.clientNom,
      changements: p.changements,
      avant: p.avant,
      apres: p.apres,
      ...(p.lignesModifiees && {
        lignesApres: p.lignes!.map((l) =>
          l.type === 'QP'
            ? { ligne: l.ordre, description: l.description, quantite: l.quantite, unite: l.unite, prixUnitaire: l.prixUnitaire, remise: l.remise, total: l.total }
            : { ligne: l.ordre, type: l.type, description: l.description }
        ),
      }),
      note: 'Totaux recalculés côté serveur — à faire valider par l’utilisateur avant exécution.',
    }
  },
  execute: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const t = p.apres!

    const resultat = await prisma.$transaction(async (tx) => {
      // Revérifié dans la transaction : le devis a pu être envoyé entre-temps
      const actuel = await tx.devis.findUnique({ where: { id: p.devisId }, select: { statut: true } })
      if (actuel?.statut !== 'BROUILLON') return { erreur: `Le devis n'est plus en brouillon (${actuel?.statut}).` }

      if (p.lignesModifiees) {
        await tx.ligneDevis.deleteMany({ where: { devisId: p.devisId } })
        await tx.ligneDevis.createMany({
          data: p.lignes!.map((l) => ({
            devisId: p.devisId!,
            ordre: l.ordre,
            type: l.type,
            article: l.article,
            description: l.description,
            unite: l.unite,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            remise: l.remise,
            total: l.total,
          })),
        })
      }
      await tx.devis.update({
        where: { id: p.devisId },
        data: {
          ...(p.data!.clientId && { clientId: p.data!.clientId }),
          ...(p.data!.reference !== undefined && { reference: p.data!.reference }),
          ...(p.data!.observations !== undefined && { observations: p.data!.observations }),
          ...(p.data!.dateValidite && { dateValidite: p.data!.dateValidite }),
          tauxTVA: p.data!.tauxTVA,
          remiseGlobale: p.data!.remiseGlobale,
          montantHT: t.totalHTApresRemise,
          montantTVA: t.totalTVA,
          montantTTC: t.totalTTC,
        },
      })
      return { ok: true }
    })
    if ('erreur' in resultat) return resultat

    return {
      succes: true,
      devis: p.numeroDevis,
      client: p.clientNom,
      changements: p.changements,
      avant: p.avant,
      apres: p.apres,
    }
  },
}

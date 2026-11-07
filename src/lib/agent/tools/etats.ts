// États d'avancement et avenants.
//
// AVERTISSEMENTS issus de l'audit du code existant — ils dictent la conception :
//
//  1. La route POST d'avenant CLIENT n'a AUCUNE garde `estFinalise` : on peut
//     écrire dans un état clôturé. Ici la protection est faite PAR SÉLECTION
//     (on ne cible que `estFinalise: false`), jamais par simple vérification.
//  2. Aucun total n'est calculé côté serveur, ni pour les lignes ni pour les
//     avenants : les montants sont persistés tels quels. On les calcule donc
//     nous-mêmes, arrondis comme l'interface.
//  3. Les avenants sont RECOPIÉS dans chaque état suivant avec leur cumul : un
//     avenant erroné contamine N+1, N+2… et la réouverture est refusée dès
//     qu'un état suivant existe. D'où le dryRun fortement recommandé.
//  4. `EtatAvancement.chantierId` est le CUID `Chantier.id`, pas le slug.
//
// Périmètre volontaire : états CLIENT uniquement en écriture. Les états
// sous-traitant ont des préconditions supplémentaires (commande verrouillée,
// rattachement à un état client) et restent en lecture seule ici.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition, ToolContext } from '../types'
import { resolveChantier, arrondi2 } from './helpers'
import { etatsSoustraitantDuChantier } from '@/lib/etats/soustraitant'

// ─────────────────────────────────────────────────────────────────────────────
// Lecture
// ─────────────────────────────────────────────────────────────────────────────

export const listeEtatsAvancement: ToolDefinition = {
  name: 'liste_etats_avancement',
  description:
    "États d'avancement d'un chantier (client et/ou sous-traitant) : numéro, date, montants de la " +
    "période et cumulés, nombre d'avenants, et si l'état est finalisé ou encore en brouillon.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      type: {
        type: 'string',
        enum: ['client', 'soustraitant'],
        description: 'Limiter à un type. Absent = les deux.',
      },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
    const cuid = res.value.id
    const type = args.type ? String(args.type) : null

    const sortie: Record<string, unknown> = { chantier: res.value.nomChantier }

    if (!type || type === 'client') {
      const etats = await prisma.etatAvancement.findMany({
        where: { chantierId: cuid },
        include: { lignes: true, avenants: true },
        orderBy: { numero: 'desc' },
      })
      sortie.client = etats.map((e) => ({
        id: e.id,
        numero: e.numero,
        date: e.date,
        mois: e.mois,
        finalise: e.estFinalise,
        factureNumero: e.factureNumero,
        montantPeriode: arrondi2(
          e.lignes.reduce((s, l) => s + l.montantActuel, 0) +
            e.avenants.reduce((s, a) => s + a.montantActuel, 0)
        ),
        montantCumule: arrondi2(
          e.lignes.reduce((s, l) => s + l.montantTotal, 0) +
            e.avenants.reduce((s, a) => s + a.montantTotal, 0)
        ),
        nombreLignes: e.lignes.length,
        nombreAvenants: e.avenants.length,
      }))
    }

    if (!type || type === 'soustraitant') {
      // soustraitant_etat_avancement n'a pas de chantierId : le lien passe par
      // la commande sous-traitant (ou l'état client pour les anciens états).
      const etats = await prisma.soustraitant_etat_avancement.findMany({
        where: { ...etatsSoustraitantDuChantier(cuid) },
        include: {
          ligne_soustraitant_etat_avancement: true,
          avenant_soustraitant_etat_avancement: true,
          soustraitant: { select: { nom: true } },
        },
        orderBy: { numero: 'desc' },
      })
      sortie.soustraitant = etats.map((e) => ({
        id: e.id,
        numero: e.numero,
        date: e.date,
        sousTraitant: e.soustraitant?.nom,
        finalise: e.estFinalise,
        montantPeriode: arrondi2(
          e.ligne_soustraitant_etat_avancement.reduce((s, l) => s + l.montantActuel, 0) +
            e.avenant_soustraitant_etat_avancement.reduce((s, a) => s + a.montantActuel, 0)
        ),
        montantCumule: arrondi2(
          e.ligne_soustraitant_etat_avancement.reduce((s, l) => s + l.montantTotal, 0) +
            e.avenant_soustraitant_etat_avancement.reduce((s, a) => s + a.montantTotal, 0)
        ),
        nombreAvenants: e.avenant_soustraitant_etat_avancement.length,
      }))
    }

    return sortie
  },
}

export const detailEtatAvancement: ToolDefinition = {
  name: 'detail_etat_avancement',
  description:
    "Détail ligne par ligne d'un état d'avancement CLIENT : id de chaque ligne et avenant, article, " +
    'description, unité, prix unitaire, quantité commandée, quantités et montants précédents, de la ' +
    'période et cumulés. Sert à faire correspondre un état fourni par le client avant ' +
    "saisir_quantites_etat. Par défaut, le dernier état du chantier.",
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      numero: { type: 'number', description: "Numéro de l'état (défaut : le dernier)" },
    },
    required: ['chantier'],
  },
  execute: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

    const numero = args.numero === undefined || args.numero === null ? null : Number(args.numero)
    const etat = await prisma.etatAvancement.findFirst({
      where: { chantierId: res.value.id, ...(numero === null ? {} : { numero }) },
      orderBy: { numero: 'desc' },
      include: { lignes: { orderBy: { id: 'asc' } }, avenants: { orderBy: { id: 'asc' } } },
    })
    if (!etat) {
      return {
        erreur:
          numero === null
            ? `Aucun état d'avancement sur « ${res.value.nomChantier} ».`
            : `L'état n° ${numero} n'existe pas sur « ${res.value.nomChantier} ».`,
      }
    }

    const poste = (p: (typeof etat.lignes)[number] | (typeof etat.avenants)[number]) => ({
      id: p.id,
      article: p.article,
      description: p.description,
      type: p.type,
      unite: p.unite,
      prixUnitaire: p.prixUnitaire,
      quantiteCommandee: p.quantite,
      quantitePrecedente: p.quantitePrecedente,
      quantiteActuelle: p.quantiteActuelle,
      quantiteTotale: p.quantiteTotale,
      montantPrecedent: p.montantPrecedent,
      montantActuel: p.montantActuel,
      montantTotal: p.montantTotal,
    })

    return {
      chantier: res.value.nomChantier,
      id: etat.id,
      numero: etat.numero,
      date: etat.date,
      mois: etat.mois,
      finalise: etat.estFinalise,
      montantPeriode: arrondi2(
        etat.lignes.reduce((s, l) => s + l.montantActuel, 0) +
          etat.avenants.reduce((s, a) => s + a.montantActuel, 0)
      ),
      montantCumule: arrondi2(
        etat.lignes.reduce((s, l) => s + l.montantTotal, 0) +
          etat.avenants.reduce((s, a) => s + a.montantTotal, 0)
      ),
      lignes: etat.lignes.map(poste),
      avenants: etat.avenants.map(poste),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers d'écriture
// ─────────────────────────────────────────────────────────────────────────────

/** Dernier état client du chantier, avec ses lignes et avenants. */
async function dernierEtatClient(cuidChantier: string) {
  return prisma.etatAvancement.findFirst({
    where: { chantierId: cuidChantier },
    orderBy: { numero: 'desc' },
    include: { lignes: true, avenants: true },
  })
}

/** `createdBy` des états est un identifiant d'auteur libre : on y met l'email de l'agent. */
async function auteurAgent(ctx: ToolContext): Promise<string> {
  const u = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true } })
  return u?.email || ctx.userId
}

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

/** Prochain numéro d'article d'avenant, robuste aux suppressions (AV-1, AV-2…). */
function prochainArticleAvenant(articles: string[]): string {
  let max = 0
  for (const a of articles) {
    const m = /^AV-(\d+)$/.exec(String(a || '').trim())
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `AV-${max + 1}`
}

// ─────────────────────────────────────────────────────────────────────────────
// creer_etat_avancement (client)
// ─────────────────────────────────────────────────────────────────────────────

export const creerEtatAvancement: ToolDefinition = {
  name: 'creer_etat_avancement',
  description:
    "Crée un nouvel état d'avancement CLIENT (en brouillon) pour un chantier. Le précédent doit être " +
    'finalisé. Les quantités et montants déjà facturés sont automatiquement reportés en « précédent », ' +
    "et la période démarre à zéro. Le premier état reprend les lignes de la commande validée.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
    },
    required: ['chantier'],
  },
  summarize: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok || !res.value) return `Création impossible : ${res.message}`
    const dernier = await dernierEtatClient(res.value.id)
    if (dernier && !dernier.estFinalise) {
      return `Rien à créer : l'état n° ${dernier.numero} de « ${res.value.nomChantier} » est déjà en brouillon.`
    }
    const n = dernier ? dernier.numero + 1 : 1
    return `Créer l'état d'avancement n° ${n} (brouillon) sur « ${res.value.nomChantier} ».`
  },
  preview: async (args) => {
    const prep = await preparerNouvelEtat(args)
    if (prep.erreur) return { action: 'aucune', erreur: prep.erreur, candidats: prep.candidats }
    return {
      action: 'creation',
      chantier: prep.chantierNom,
      numero: prep.numero,
      lignesReportees: prep.nbLignes,
      avenantsReportes: prep.nbAvenants,
      note: "L'état est créé en brouillon, période à zéro ; les cumuls précédents sont reportés.",
    }
  },
  execute: async (args, ctx) => {
    const prep = await preparerNouvelEtat(args)
    if (prep.erreur) return { erreur: prep.erreur, candidats: prep.candidats }
    const createdBy = await auteurAgent(ctx)

    const etat = await prisma.$transaction(async (tx) => {
      const e = await tx.etatAvancement.create({
        data: {
          chantierId: prep.cuid!, // CUID Chantier.id, pas le slug
          numero: prep.numero!,
          date: new Date(),
          commentaires: '',
          estFinalise: false,
          createdBy,
        },
        select: { id: true, numero: true },
      })

      if (prep.lignes!.length > 0) {
        await tx.ligneEtatAvancement.createMany({
          data: prep.lignes!.map((l) => ({ ...l, etatAvancementId: e.id })),
        })
      }
      if (prep.avenants!.length > 0) {
        await tx.avenantEtatAvancement.createMany({
          data: prep.avenants!.map((a) => ({ ...a, etatAvancementId: e.id })),
        })
      }
      return e
    })

    return {
      succes: true,
      etatId: etat.id,
      numero: etat.numero,
      chantier: prep.chantierNom,
      statut: 'BROUILLON',
      lignesReportees: prep.nbLignes,
      avenantsReportes: prep.nbAvenants,
    }
  },
}

interface LigneEtatData {
  ligneCommandeId: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  quantitePrecedente: number
  quantiteActuelle: number
  quantiteTotale: number
  montantPrecedent: number
  montantActuel: number
  montantTotal: number
}

type AvenantEtatData = Omit<LigneEtatData, 'ligneCommandeId'>

interface PreparationEtat {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  cuid?: string
  chantierNom?: string
  numero?: number
  lignes?: LigneEtatData[]
  avenants?: AvenantEtatData[]
  nbLignes?: number
  nbAvenants?: number
}

/** Calcule le contenu du prochain état sans rien écrire (report des cumuls). */
async function preparerNouvelEtat(args: Record<string, unknown>): Promise<PreparationEtat> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }
  const cuid = res.value.id

  const dernier = await dernierEtatClient(cuid)
  if (dernier && !dernier.estFinalise) {
    return {
      erreur:
        `L'état n° ${dernier.numero} est encore en brouillon (id ${dernier.id}). ` +
        `Finalise-le dans l'application avant d'en créer un nouveau, ou ajoute directement ` +
        `l'avenant à cet état avec ajouter_avenant_etat.`,
    }
  }

  const numero = dernier ? dernier.numero + 1 : 1
  let lignes: LigneEtatData[] = []
  let avenants: AvenantEtatData[] = []

  if (!dernier) {
    // Premier état : on part de la commande client validée
    const commande = await prisma.commande.findFirst({
      where: { chantierId: cuid, statut: 'VALIDEE', lignes: { some: {} } },
      include: { lignes: { orderBy: { ordre: 'asc' } } },
    })
    if (!commande) {
      return { erreur: "Validez d'abord la commande client : sans elle, le premier état serait vide." }
    }
    lignes = commande.lignes.map((l) => ({
      ligneCommandeId: l.id,
      article: l.article,
      description: l.description,
      type: l.type,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire,
      quantite: l.quantite,
      quantitePrecedente: 0,
      quantiteActuelle: 0,
      quantiteTotale: 0,
      montantPrecedent: 0,
      montantActuel: 0,
      montantTotal: 0,
    }))
  } else {
    // États suivants : report des cumuls, période remise à zéro
    lignes = dernier.lignes.map((l) => ({
      ligneCommandeId: l.ligneCommandeId,
      article: l.article,
      description: l.description,
      type: l.type,
      unite: l.unite,
      prixUnitaire: l.prixUnitaire,
      quantite: l.quantite,
      quantitePrecedente: l.quantiteTotale,
      quantiteActuelle: 0,
      quantiteTotale: l.quantiteTotale,
      montantPrecedent: l.montantTotal,
      montantActuel: 0,
      montantTotal: l.montantTotal,
    }))
    avenants = dernier.avenants.map((a) => ({
      article: a.article,
      description: a.description,
      type: a.type,
      unite: a.unite,
      prixUnitaire: a.prixUnitaire,
      quantite: a.quantite,
      quantitePrecedente: a.quantiteTotale,
      quantiteActuelle: 0,
      quantiteTotale: a.quantiteTotale,
      montantPrecedent: a.montantTotal,
      montantActuel: 0,
      montantTotal: a.montantTotal,
    }))
  }

  return {
    cuid,
    chantierNom: res.value.nomChantier,
    numero,
    lignes,
    avenants,
    nbLignes: lignes.length,
    nbAvenants: avenants.length,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saisir_quantites_etat (client, état en brouillon uniquement)
// ─────────────────────────────────────────────────────────────────────────────

interface PosteSaisi {
  genre: 'ligne' | 'avenant'
  id: number
  article: string
  description: string
  unite: string
  prixUnitaire: number
  quantiteCommandee: number
  quantitePrecedente: number
  quantiteActuelle: number
  quantiteTotale: number
  montantPrecedent: number
  montantActuel: number
  montantTotal: number
  depasseCommande: boolean
}

interface PreparationSaisie {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  etatId?: number
  numeroEtat?: number
  chantierNom?: string
  mois?: string
  postes?: PosteSaisi[]
  montantPeriode?: number
  montantCumule?: number
  ecartAttendu?: number
}

/**
 * Calcule la saisie sans rien écrire. Mêmes formules que l'écran d'état :
 * cumul = précédent + période ; montant = quantité × prix, arrondi à 2 décimales.
 * Les postes non cités gardent leurs valeurs.
 */
async function preparerSaisie(args: Record<string, unknown>): Promise<PreparationSaisie> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

  const saisies = Array.isArray(args.quantites) ? (args.quantites as Record<string, unknown>[]) : []
  if (saisies.length === 0) return { erreur: 'quantites doit contenir au moins un poste.' }

  // PROTECTION PAR SÉLECTION : on ne cible QUE l'état en brouillon.
  const etat = await prisma.etatAvancement.findFirst({
    where: { chantierId: res.value.id, estFinalise: false },
    orderBy: { numero: 'desc' },
    include: { lignes: true, avenants: true },
  })
  if (!etat) {
    return {
      erreur:
        `Aucun état d'avancement en brouillon sur « ${res.value.nomChantier} ». ` +
        `Crée-en un avec creer_etat_avancement, puis relance la saisie.`,
    }
  }

  const postes: PosteSaisi[] = []
  const vus = new Set<string>()
  for (const s of saisies) {
    const ligneId = s.ligneId === undefined || s.ligneId === null ? null : Number(s.ligneId)
    const avenantId = s.avenantId === undefined || s.avenantId === null ? null : Number(s.avenantId)
    if ((ligneId === null) === (avenantId === null)) {
      return { erreur: 'Chaque poste doit indiquer soit ligneId, soit avenantId.' }
    }
    const genre = ligneId !== null ? 'ligne' : 'avenant'
    const id = (ligneId ?? avenantId) as number
    const cle = `${genre}-${id}`
    if (vus.has(cle)) return { erreur: `Le poste ${cle} est cité deux fois.` }
    vus.add(cle)

    const source =
      genre === 'ligne'
        ? etat.lignes.find((l) => l.id === id)
        : etat.avenants.find((a) => a.id === id)
    if (!source) {
      return { erreur: `Le poste ${cle} n'appartient pas à l'état n° ${etat.numero}.` }
    }

    const quantiteActuelle = Number(s.quantiteActuelle)
    if (!Number.isFinite(quantiteActuelle)) {
      return { erreur: `quantiteActuelle du poste ${cle} doit être un nombre.` }
    }
    const quantiteTotale = source.quantitePrecedente + quantiteActuelle
    if (quantiteTotale < 0) {
      return { erreur: `Le poste ${cle} aurait un cumul négatif (${quantiteTotale}).` }
    }

    const montantActuel = arrondi2(quantiteActuelle * source.prixUnitaire)
    postes.push({
      genre,
      id,
      article: source.article,
      description: source.description,
      unite: source.unite,
      prixUnitaire: source.prixUnitaire,
      quantiteCommandee: source.quantite,
      quantitePrecedente: source.quantitePrecedente,
      quantiteActuelle,
      quantiteTotale,
      montantPrecedent: source.montantPrecedent,
      montantActuel,
      montantTotal: arrondi2(montantActuel + source.montantPrecedent),
      depasseCommande: quantiteTotale > source.quantite,
    })
  }

  // Totaux de l'état après saisie : postes saisis + postes laissés tels quels
  const nouveau = new Map(postes.map((p) => [`${p.genre}-${p.id}`, p]))
  const tous = [
    ...etat.lignes.map((l) => ({ cle: `ligne-${l.id}`, actuel: l.montantActuel, total: l.montantTotal })),
    ...etat.avenants.map((a) => ({ cle: `avenant-${a.id}`, actuel: a.montantActuel, total: a.montantTotal })),
  ]
  const montantPeriode = arrondi2(
    tous.reduce((s, p) => s + (nouveau.get(p.cle)?.montantActuel ?? p.actuel), 0)
  )
  const montantCumule = arrondi2(
    tous.reduce((s, p) => s + (nouveau.get(p.cle)?.montantTotal ?? p.total), 0)
  )

  const attendu =
    args.totalPeriodeAttendu === undefined || args.totalPeriodeAttendu === null
      ? null
      : Number(args.totalPeriodeAttendu)

  return {
    etatId: etat.id,
    numeroEtat: etat.numero,
    chantierNom: res.value.nomChantier,
    mois: args.mois ? String(args.mois).trim() : undefined,
    postes,
    montantPeriode,
    montantCumule,
    ecartAttendu:
      attendu !== null && Number.isFinite(attendu) ? arrondi2(montantPeriode - attendu) : undefined,
  }
}

export const saisirQuantitesEtat: ToolDefinition = {
  name: 'saisir_quantites_etat',
  description:
    "Saisit les quantités de la PÉRIODE sur l'état d'avancement CLIENT en brouillon d'un chantier " +
    "(encodage d'un état fourni par le client). Récupérer d'abord les id avec detail_etat_avancement. " +
    "Les cumuls et montants sont calculés serveur ; les postes non cités ne changent pas. Refuse " +
    "d'écrire dans un état finalisé et ne finalise jamais : la validation reste dans l'application. " +
    'Toujours passer par dryRun et comparer le total avec totalPeriodeAttendu.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      quantites: {
        type: 'array',
        description: 'Postes à saisir : ligneId OU avenantId, avec la quantité de la période.',
        items: {
          type: 'object',
          properties: {
            ligneId: { type: 'number', description: "Id de la ligne de l'état" },
            avenantId: { type: 'number', description: "Id de l'avenant de l'état" },
            quantiteActuelle: { type: 'number', description: 'Quantité de la période' },
          },
          required: ['quantiteActuelle'],
        },
      },
      mois: { type: 'string', description: "Mois de l'état, ex. « Octobre 2026 »" },
      totalPeriodeAttendu: {
        type: 'number',
        description: "Montant de la période sur le document du client, pour contrôle de l'écart",
      },
    },
    required: ['chantier', 'quantites'],
  },
  summarize: async (args) => {
    const p = await preparerSaisie(args)
    if (p.erreur) return `Saisie impossible : ${p.erreur}`
    return (
      `Saisir ${p.postes!.length} poste(s) sur l'état n° ${p.numeroEtat} de « ${p.chantierNom} » : ` +
      `période ${eur(p.montantPeriode!)}, cumul ${eur(p.montantCumule!)}.`
    )
  },
  preview: async (args) => {
    const p = await preparerSaisie(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'modification',
      chantier: p.chantierNom,
      etat: { id: p.etatId, numero: p.numeroEtat, statut: 'BROUILLON', mois: p.mois },
      postes: p.postes,
      montantPeriode: p.montantPeriode,
      montantCumule: p.montantCumule,
      ecartAvecAttendu: p.ecartAttendu,
    }
  },
  execute: async (args) => {
    const p = await preparerSaisie(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }

    const valeurs = (x: PosteSaisi) => ({
      quantiteActuelle: x.quantiteActuelle,
      quantiteTotale: x.quantiteTotale,
      montantActuel: x.montantActuel,
      montantTotal: x.montantTotal,
    })

    await prisma.$transaction(async (tx) => {
      for (const x of p.postes!) {
        if (x.genre === 'ligne') {
          await tx.ligneEtatAvancement.update({ where: { id: x.id }, data: valeurs(x) })
        } else {
          await tx.avenantEtatAvancement.update({ where: { id: x.id }, data: valeurs(x) })
        }
      }
      if (p.mois) {
        await tx.etatAvancement.update({ where: { id: p.etatId! }, data: { mois: p.mois } })
      }
    })

    return {
      succes: true,
      chantier: p.chantierNom,
      etatNumero: p.numeroEtat,
      statut: 'BROUILLON',
      postesSaisis: p.postes!.length,
      montantPeriode: p.montantPeriode,
      montantCumule: p.montantCumule,
      ecartAvecAttendu: p.ecartAttendu,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ajouter_avenant_etat (client, état en brouillon uniquement)
// ─────────────────────────────────────────────────────────────────────────────

interface PreparationAvenant {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  etatId?: number
  numeroEtat?: number
  chantierNom?: string
  article?: string
  description?: string
  unite?: string
  prixUnitaire?: number
  quantite?: number
  montant?: number
}

async function preparerAvenant(args: Record<string, unknown>): Promise<PreparationAvenant> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) return { erreur: res.message, candidats: res.candidats }

  const description = String(args.description || '').trim()
  if (!description) return { erreur: "La description de l'avenant est requise." }

  const prixUnitaire = Number(args.prixUnitaire)
  if (!Number.isFinite(prixUnitaire)) return { erreur: 'prixUnitaire doit être un nombre.' }

  const quantite = args.quantite === undefined || args.quantite === null ? 1 : Number(args.quantite)
  if (!Number.isFinite(quantite) || quantite < 0) {
    return { erreur: 'quantite doit être un nombre positif.' }
  }

  // PROTECTION PAR SÉLECTION : on ne cible QUE les états non finalisés.
  // La route REST équivalente n'a pas cette garde.
  const etat = await prisma.etatAvancement.findFirst({
    where: { chantierId: res.value.id, estFinalise: false },
    orderBy: { numero: 'desc' },
    include: { avenants: { select: { article: true } } },
  })
  if (!etat) {
    return {
      erreur:
        `Aucun état d'avancement en brouillon sur « ${res.value.nomChantier} ». ` +
        `Crée-en un avec creer_etat_avancement, puis relance cet ajout.`,
    }
  }

  const montant = arrondi2(prixUnitaire * quantite)
  return {
    etatId: etat.id,
    numeroEtat: etat.numero,
    chantierNom: res.value.nomChantier,
    article: prochainArticleAvenant(etat.avenants.map((a) => a.article)),
    description,
    unite: args.unite ? String(args.unite).trim() : 'fft',
    prixUnitaire,
    quantite,
    montant,
  }
}

export const ajouterAvenantEtat: ToolDefinition = {
  name: 'ajouter_avenant_etat',
  description:
    "Ajoute un avenant (travail supplémentaire, régie…) à l'état d'avancement CLIENT en brouillon " +
    "d'un chantier. Refuse d'écrire dans un état finalisé. Le montant est calculé serveur " +
    '(prix unitaire × quantité). Attention : un avenant est reporté dans tous les états suivants — ' +
    'utiliser dryRun pour vérifier avant.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      description: { type: 'string', description: "Libellé de l'avenant" },
      prixUnitaire: { type: 'number', description: 'Prix unitaire' },
      quantite: { type: 'number', description: 'Quantité (défaut 1)' },
      unite: { type: 'string', description: "Unité (défaut « fft » = forfait)" },
    },
    required: ['chantier', 'description', 'prixUnitaire'],
  },
  summarize: async (args) => {
    const p = await preparerAvenant(args)
    if (p.erreur) return `Ajout impossible : ${p.erreur}`
    return (
      `Ajouter l'avenant « ${p.description} » à l'état n° ${p.numeroEtat} de « ${p.chantierNom} » : ` +
      `${p.quantite} ${p.unite} × ${eur(p.prixUnitaire!)} = ${eur(p.montant!)}.`
    )
  },
  preview: async (args) => {
    const p = await preparerAvenant(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'creation',
      chantier: p.chantierNom,
      etat: { id: p.etatId, numero: p.numeroEtat, statut: 'BROUILLON' },
      avenant: {
        article: p.article,
        description: p.description,
        unite: p.unite,
        prixUnitaire: p.prixUnitaire,
        quantite: p.quantite,
        montant: p.montant,
      },
      avertissement:
        "Cet avenant sera reporté avec son cumul dans tous les états d'avancement suivants.",
    }
  },
  execute: async (args) => {
    const p = await preparerAvenant(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }

    const avenant = await prisma.avenantEtatAvancement.create({
      data: {
        etatAvancementId: p.etatId!,
        article: p.article!,
        description: p.description!,
        type: 'QP',
        unite: p.unite!,
        prixUnitaire: p.prixUnitaire!,
        quantite: p.quantite!,
        // La période porte le montant ; rien n'était facturé avant.
        quantitePrecedente: 0,
        quantiteActuelle: p.quantite!,
        quantiteTotale: p.quantite!,
        montantPrecedent: 0,
        montantActuel: p.montant!,
        montantTotal: p.montant!,
      },
      select: { id: true, article: true },
    })

    return {
      succes: true,
      avenantId: avenant.id,
      article: avenant.article,
      chantier: p.chantierNom,
      etatNumero: p.numeroEtat,
      montant: p.montant,
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Numéro de facture des états CLIENT (rapprochement avec la facturation Odoo)
// ─────────────────────────────────────────────────────────────────────────────
//
// Le numéro de facture d'un état se saisit aussi à la main dans la page
// « États d'avancement » (PATCH /api/etats-avancement/[id]/facture). Ces deux
// outils servent à le faire en lot après rapprochement avec Odoo :
//  - etats_sans_numero_facture : liste, tous chantiers confondus, ce qui reste à renseigner
//  - renseigner_factures_etats : écrit le numéro, uniquement sur des états FINALISÉS,
//    tout ou rien, sans jamais écraser un numéro existant sauf demande explicite.

const MODELE_NUMERO_FACTURE = /^FAC\/\d{4}\/\d{5}$/

export const etatsSansNumeroFacture: ToolDefinition = {
  name: 'etats_sans_numero_facture',
  description:
    "Liste, tous chantiers confondus, les états d'avancement CLIENT finalisés dont le numéro de facture " +
    "n'est pas encore renseigné : id de l'état, chantier, client, numéro, mois, date, montant de la période " +
    "et cumulé (HT). Sert à les rapprocher des factures d'Odoo avant renseigner_factures_etats.",
  parameters: {
    type: 'object',
    properties: {
      inclureBrouillons: {
        type: 'boolean',
        description: 'Inclure aussi les états encore en brouillon (défaut : non, finalisés seulement)',
      },
    },
  },
  execute: async (args) => {
    const etats = await prisma.etatAvancement.findMany({
      where: {
        ...(args.inclureBrouillons === true ? {} : { estFinalise: true }),
        OR: [{ factureNumero: null }, { factureNumero: '' }],
      },
      include: {
        Chantier: { select: { chantierId: true, nomChantier: true, clientNom: true } },
        lignes: { select: { montantActuel: true, montantTotal: true } },
        avenants: { select: { montantActuel: true, montantTotal: true } },
      },
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      take: 300,
    })
    return {
      total: etats.length,
      etats: etats.map((e) => ({
        id: e.id,
        chantierId: e.Chantier.chantierId,
        chantier: e.Chantier.nomChantier,
        client: e.Chantier.clientNom,
        numero: e.numero,
        mois: e.mois,
        date: e.date,
        finalise: e.estFinalise,
        montantPeriode: arrondi2(
          e.lignes.reduce((s, l) => s + l.montantActuel, 0) +
            e.avenants.reduce((s, a) => s + a.montantActuel, 0)
        ),
        montantCumule: arrondi2(
          e.lignes.reduce((s, l) => s + l.montantTotal, 0) +
            e.avenants.reduce((s, a) => s + a.montantTotal, 0)
        ),
      })),
    }
  },
}

interface LigneFactureEtat {
  etatId: number
  factureNumero: string
  ok: boolean
  dejaFait?: boolean
  refus?: string
  avertissement?: string
  chantier?: string
  etatNumero?: number
  mois?: string | null
  montantPeriode?: number
  numeroActuel?: string | null
}

async function preparerFacturesEtats(
  args: Record<string, unknown>
): Promise<{ erreur?: string; lignes?: LigneFactureEtat[] }> {
  const brut = Array.isArray(args.associations) ? (args.associations as Record<string, unknown>[]) : []
  if (brut.length === 0) return { erreur: 'associations est vide.' }
  if (brut.length > 100) return { erreur: 'Maximum 100 associations par appel.' }
  const ecraser = args.ecraser === true

  const ids = brut.map((a) => Number(a?.etatId)).filter((n) => Number.isInteger(n))
  const numeros = brut.map((a) => String(a?.factureNumero ?? '').trim()).filter(Boolean)

  const etats = await prisma.etatAvancement.findMany({
    where: { id: { in: ids } },
    include: {
      Chantier: { select: { nomChantier: true } },
      lignes: { select: { montantActuel: true } },
      avenants: { select: { montantActuel: true } },
    },
  })
  const parId = new Map<number, (typeof etats)[number]>()
  for (const x of etats) parId.set(x.id, x)
  const dejaPris = await prisma.etatAvancement.findMany({
    where: { factureNumero: { in: numeros } },
    select: { id: true, numero: true, factureNumero: true, Chantier: { select: { nomChantier: true } } },
  })

  const lignes: LigneFactureEtat[] = []
  const vus = new Set<number>()
  for (const a of brut) {
    const etatId = Number(a?.etatId)
    const factureNumero = String(a?.factureNumero ?? '').trim()
    const l: LigneFactureEtat = { etatId, factureNumero, ok: false }
    lignes.push(l)

    if (!Number.isInteger(etatId)) { l.refus = 'etatId invalide'; continue }
    if (vus.has(etatId)) { l.refus = "état cité deux fois dans l'appel"; continue }
    vus.add(etatId)
    if (!factureNumero) { l.refus = 'factureNumero vide'; continue }
    if (factureNumero.length > 50) { l.refus = 'factureNumero trop long (50 caractères max)'; continue }

    const e = parId.get(etatId)
    if (!e) { l.refus = 'état introuvable'; continue }
    l.chantier = e.Chantier.nomChantier
    l.etatNumero = e.numero
    l.mois = e.mois
    l.numeroActuel = e.factureNumero
    l.montantPeriode = arrondi2(
      e.lignes.reduce((s, x) => s + x.montantActuel, 0) + e.avenants.reduce((s, x) => s + x.montantActuel, 0)
    )

    if (!e.estFinalise) { l.refus = 'état non finalisé : seuls les états validés reçoivent un numéro'; continue }
    if (e.factureNumero && e.factureNumero === factureNumero) { l.ok = true; l.dejaFait = true; continue }
    if (e.factureNumero && !ecraser) {
      l.refus = `un numéro existe déjà (${e.factureNumero}) ; passer ecraser=true pour le remplacer`
      continue
    }

    const avertissements: string[] = []
    if (!MODELE_NUMERO_FACTURE.test(factureNumero)) avertissements.push('format inhabituel (attendu FAC/AAAA/NNNNN)')
    const ailleurs = dejaPris.find((p) => p.id !== etatId && p.factureNumero === factureNumero)
    if (ailleurs) avertissements.push(`déjà utilisé par l'état n° ${ailleurs.numero} de « ${ailleurs.Chantier.nomChantier} »`)
    if (brut.filter((b) => String(b?.factureNumero ?? '').trim() === factureNumero).length > 1) {
      avertissements.push('même numéro cité sur plusieurs états de cet appel')
    }
    if (avertissements.length) l.avertissement = avertissements.join(' ; ')
    l.ok = true
  }
  return { lignes }
}

export const renseignerFacturesEtats: ToolDefinition = {
  name: 'renseigner_factures_etats',
  description:
    "Renseigne le numéro de facture d'états d'avancement CLIENT FINALISÉS (rapprochement avec Odoo, " +
    "jusqu'à 100 à la fois). Récupérer d'abord les id avec etats_sans_numero_facture. Tout ou rien : " +
    "si une association est refusée, rien n'est écrit. N'écrase jamais un numéro existant sauf ecraser=true. " +
    'Toujours passer par dryRun et faire confirmer la liste.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      associations: {
        type: 'array',
        description: 'Un objet par état : son id et le numéro de la facture Odoo (ex. FAC/2026/00240).',
        items: {
          type: 'object',
          properties: {
            etatId: { type: 'number', description: "Id de l'état d'avancement" },
            factureNumero: { type: 'string', description: 'Numéro de la facture, ex. FAC/2026/00240' },
          },
          required: ['etatId', 'factureNumero'],
        },
      },
      ecraser: { type: 'boolean', description: 'Autoriser le remplacement d\'un numéro déjà renseigné (défaut : non)' },
    },
    required: ['associations'],
  },
  summarize: async (args) => {
    const p = await preparerFacturesEtats(args)
    if (p.erreur) return `Saisie impossible : ${p.erreur}`
    const l = p.lignes!
    const refus = l.filter((x) => !x.ok).length
    const aEcrire = l.filter((x) => x.ok && !x.dejaFait).length
    return refus
      ? `Rien ne sera écrit : ${refus} association(s) refusée(s) sur ${l.length}.`
      : `Renseigner le numéro de facture de ${aEcrire} état(s) d'avancement.`
  },
  preview: async (args) => {
    const p = await preparerFacturesEtats(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur }
    const l = p.lignes!
    return {
      action: 'modification',
      aEcrire: l.filter((x) => x.ok && !x.dejaFait).length,
      dejaRenseignes: l.filter((x) => x.dejaFait).length,
      refuses: l.filter((x) => !x.ok).length,
      lignes: l,
    }
  },
  execute: async (args) => {
    const p = await preparerFacturesEtats(args)
    if (p.erreur) return { erreur: p.erreur }
    const l = p.lignes!
    if (l.some((x) => !x.ok)) {
      return { erreur: 'Rien écrit : au moins une association est refusée.', lignes: l.filter((x) => !x.ok) }
    }
    const aEcrire = l.filter((x) => !x.dejaFait)
    await prisma.$transaction(
      aEcrire.map((x) =>
        prisma.etatAvancement.update({ where: { id: x.etatId }, data: { factureNumero: x.factureNumero } })
      )
    )
    return {
      succes: true,
      ecrits: aEcrire.length,
      dejaRenseignes: l.length - aEcrire.length,
      lignes: aEcrire.map((x) => ({
        etatId: x.etatId,
        chantier: x.chantier,
        etatNumero: x.etatNumero,
        factureNumero: x.factureNumero,
        avertissement: x.avertissement,
      })),
    }
  },
}

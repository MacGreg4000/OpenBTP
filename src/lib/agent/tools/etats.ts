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
      where: { chantierId: cuid, statut: 'VALIDEE' },
      include: { lignes: { orderBy: { ordre: 'asc' } } },
    })
    lignes = (commande?.lignes || []).map((l) => ({
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

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'

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

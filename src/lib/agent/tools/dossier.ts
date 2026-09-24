// Outils d'encodage d'un dossier : client → chantier → fiche → commande.
//
// Règles communes (voir src/lib/agent/tools/index.ts) :
//  - ne jamais throw : les erreurs sont des données
//  - création uniquement, jamais de suppression ni d'envoi
//  - écriture en Prisma direct (les routes REST correspondantes ont des
//    défauts documentés : pas de dédoublonnage, statuts en libellés français,
//    totaux non calculés…)

import { prisma } from '@/lib/prisma/client'
import { generatePPSS } from '@/lib/ppss-generator'
import { notifier } from '@/lib/services/notificationService'
import { ToolDefinition } from '../types'
import {
  normalizeTva,
  normalizeNomEntreprise,
  resolveClient,
  resolveChantier,
  arrondi2,
  eur,
} from './helpers'

// ─────────────────────────────────────────────────────────────────────────────
// D1 — trouver_ou_creer_client
// ─────────────────────────────────────────────────────────────────────────────

interface ClientLite {
  id: string
  nom: string
  numeroTva: string | null
  email: string | null
}

type RechercheClient =
  | { statut: 'trouve'; client: ClientLite; methode: 'tva' | 'email' | 'nom' }
  | { statut: 'candidats'; candidats: ClientLite[] }
  | { statut: 'absent' }

/**
 * Recherche un client sans rien écrire.
 * Ordre de certitude décroissante : TVA (seul critère réellement
 * discriminant) → email → nom normalisé exact → nom approchant.
 */
async function rechercherClient(args: {
  nom?: string
  numeroTva?: string
  email?: string
}): Promise<RechercheClient> {
  // La table Client est petite (liste des donneurs d'ordre) : on la charge une
  // fois et on compare en mémoire, ce qui permet une normalisation correcte
  // (accents, formes juridiques, séparateurs de TVA) impossible en SQL simple.
  const tous = await prisma.client.findMany({
    select: { id: true, nom: true, numeroTva: true, email: true },
    take: 5000,
  })

  // 1. TVA normalisée
  const tva = normalizeTva(args.numeroTva)
  if (tva) {
    const parTva = tous.filter((c) => normalizeTva(c.numeroTva) === tva)
    if (parTva.length === 1) return { statut: 'trouve', client: parTva[0], methode: 'tva' }
    if (parTva.length > 1) return { statut: 'candidats', candidats: parTva }
  }

  // 2. Email exact
  const email = String(args.email || '').trim().toLowerCase()
  if (email) {
    const parEmail = tous.filter((c) => (c.email || '').trim().toLowerCase() === email)
    if (parEmail.length === 1) return { statut: 'trouve', client: parEmail[0], methode: 'email' }
    if (parEmail.length > 1) return { statut: 'candidats', candidats: parEmail }
  }

  // 3. Nom
  const nomNorm = normalizeNomEntreprise(args.nom)
  if (nomNorm) {
    const exacts = tous.filter((c) => normalizeNomEntreprise(c.nom) === nomNorm)
    if (exacts.length === 1) return { statut: 'trouve', client: exacts[0], methode: 'nom' }
    if (exacts.length > 1) return { statut: 'candidats', candidats: exacts }

    // Rapprochement souple : l'un contient l'autre (« ACME » ↔ « ACME Construction »)
    const proches = tous.filter((c) => {
      const n = normalizeNomEntreprise(c.nom)
      return n.length > 2 && (n.includes(nomNorm) || nomNorm.includes(n))
    })
    if (proches.length > 0) return { statut: 'candidats', candidats: proches.slice(0, 8) }
  }

  return { statut: 'absent' }
}

function decrireClient(c: ClientLite): string {
  return c.numeroTva ? `${c.nom} (${c.numeroTva})` : c.nom
}

export const trouverOuCreerClient: ToolDefinition = {
  name: 'trouver_ou_creer_client',
  description:
    "Trouve le client (entrepreneur général / donneur d'ordre) d'un dossier, par numéro de TVA, email ou nom. " +
    "Ne crée JAMAIS de doublon : si un client correspond de façon certaine, il est renvoyé tel quel. " +
    "Si des clients ressemblent sans certitude, la liste des candidats est renvoyée pour que l'utilisateur tranche. " +
    "La création n'a lieu que si creerSiAbsent vaut true. Utiliser dryRun d'abord pour voir ce qui se passerait.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      nom: { type: 'string', description: "Raison sociale du client, ex. « RECO+ » ou « Eloy Travaux SA »" },
      numeroTva: { type: 'string', description: 'Numéro de TVA, ex. BE0123456789 (critère le plus fiable)' },
      email: { type: 'string', description: 'Email de contact (optionnel)' },
      telephone: { type: 'string', description: 'Téléphone (optionnel)' },
      adresse: { type: 'string', description: 'Adresse postale (optionnel)' },
      creerSiAbsent: {
        type: 'boolean',
        description:
          "Défaut false. Si true et qu'aucun client certain n'existe, le client est créé. " +
          "Des candidats proches n'empêchent alors pas la création mais sont signalés.",
      },
    },
    required: ['nom'],
  },
  summarize: async (args) => {
    const recherche = await rechercherClient(args as { nom?: string; numeroTva?: string; email?: string })
    if (recherche.statut === 'trouve') {
      return `Utiliser le client existant « ${decrireClient(recherche.client)} » (aucune création).`
    }
    if (recherche.statut === 'candidats') {
      const liste = recherche.candidats.map(decrireClient).join(', ')
      return args.creerSiAbsent
        ? `Créer le client « ${String(args.nom)} » MALGRÉ des clients proches : ${liste}.`
        : `Ne rien créer : ${recherche.candidats.length} client(s) proche(s) à départager — ${liste}.`
    }
    return args.creerSiAbsent
      ? `Créer le nouveau client « ${String(args.nom)} »${args.numeroTva ? ` (TVA ${String(args.numeroTva)})` : ''}.`
      : `Aucun client trouvé pour « ${String(args.nom)} » — rien ne sera créé (creerSiAbsent absent).`
  },
  preview: async (args) => {
    const recherche = await rechercherClient(args as { nom?: string; numeroTva?: string; email?: string })
    if (recherche.statut === 'trouve') {
      return { action: 'aucune', raison: 'client existant', methode: recherche.methode, client: recherche.client }
    }
    if (recherche.statut === 'candidats') {
      return {
        action: args.creerSiAbsent ? 'creation_avec_avertissement' : 'aucune',
        candidats: recherche.candidats,
        avertissement: 'Des clients ressemblants existent — vérifier avant de créer un doublon.',
      }
    }
    return {
      action: args.creerSiAbsent ? 'creation' : 'aucune',
      raison: args.creerSiAbsent ? 'aucun client existant' : 'creerSiAbsent absent',
    }
  },
  execute: async (args) => {
    const nom = String(args.nom || '').trim()
    if (!nom) return { erreur: 'Le nom du client est requis.' }

    const recherche = await rechercherClient({
      nom,
      numeroTva: args.numeroTva ? String(args.numeroTva) : undefined,
      email: args.email ? String(args.email) : undefined,
    })

    // Match certain → on renvoie l'existant, jamais de doublon
    if (recherche.statut === 'trouve') {
      return {
        succes: true,
        cree: false,
        methode: recherche.methode,
        client: recherche.client,
        clientId: recherche.client.id,
      }
    }

    const creerSiAbsent = args.creerSiAbsent === true

    if (recherche.statut === 'candidats' && !creerSiAbsent) {
      return {
        erreur:
          `Plusieurs clients ressemblent à « ${nom} ». Demande à l'utilisateur lequel utiliser, ` +
          `puis rappelle avec son nom exact ou son id. Pour créer malgré tout : creerSiAbsent: true.`,
        candidats: recherche.candidats,
      }
    }

    if (!creerSiAbsent) {
      return {
        erreur: `Aucun client trouvé pour « ${nom} ». Rappelle avec creerSiAbsent: true pour le créer.`,
        candidats: [],
      }
    }

    // Création — même convention d'id que POST /api/clients
    const id = `CL-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const cree = await prisma.client.create({
      data: {
        id,
        nom,
        email: args.email ? String(args.email).trim() : null,
        telephone: args.telephone ? String(args.telephone).trim() : null,
        adresse: args.adresse ? String(args.adresse).trim() : null,
        numeroTva: args.numeroTva ? String(args.numeroTva).trim() : null,
        updatedAt: new Date(), // le modèle Client n'a pas @updatedAt
      },
      select: { id: true, nom: true, numeroTva: true, email: true },
    })

    return {
      succes: true,
      cree: true,
      client: cree,
      clientId: cree.id,
      ...(recherche.statut === 'candidats'
        ? { avertissement: 'Créé malgré des clients proches', candidatsIgnores: recherche.candidats }
        : {}),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// D2 — creer_chantier
// ─────────────────────────────────────────────────────────────────────────────

/** Statuts réellement stockés en base (colonne String libre, pas d'enum Prisma). */
const STATUTS_CHANTIER = ['EN_PREPARATION', 'A_VENIR', 'EN_COURS', 'TERMINE'] as const
const TYPES_DUREE = ['CALENDRIER', 'OUVRABLE'] as const

const ALPHABET_SLUG = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

/** Slug métier au format CH-<année>-<6 alphanumériques>, comme POST /api/chantiers. */
function genererSlugChantier(): string {
  let suffixe = ''
  for (let i = 0; i < 6; i++) {
    suffixe += ALPHABET_SLUG[Math.floor(Math.random() * ALPHABET_SLUG.length)]
  }
  return `CH-${new Date().getFullYear()}-${suffixe}`
}

/** Slug libre : chantierId est @unique et l'aléatoire ne garantit rien. */
async function genererSlugChantierUnique(): Promise<string | null> {
  for (let essai = 0; essai < 5; essai++) {
    const slug = genererSlugChantier()
    const existe = await prisma.chantier.findUnique({
      where: { chantierId: slug },
      select: { id: true },
    })
    if (!existe) return slug
  }
  return null
}

function parseDateOuNull(valeur: unknown): { ok: true; date: Date | null } | { ok: false } {
  if (valeur === undefined || valeur === null || String(valeur).trim() === '') {
    return { ok: true, date: null }
  }
  const d = new Date(String(valeur))
  if (Number.isNaN(d.getTime())) return { ok: false }
  return { ok: true, date: d }
}

interface ValidationChantier {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  nomChantier?: string
  statut?: string
  typeDuree?: string
  dateDebut?: Date | null
  dureeEnJours?: number | null
  clientId?: string | null
  clientNom?: string | null
  contactId?: string | null
  numeroIdentification?: string | null
}

/** Valide et résout les arguments sans rien écrire (partagé preview/execute). */
async function validerChantier(args: Record<string, unknown>): Promise<ValidationChantier> {
  const nomChantier = String(args.nomChantier || '').trim()
  if (!nomChantier) return { erreur: 'Le nom du chantier est requis.' }

  // Statut : écrit en forme BASE. La route REST n'accepte que les libellés
  // français et retombe silencieusement sur EN_PREPARATION — d'où l'écriture directe.
  const statutBrut = args.statut ? String(args.statut).trim().toUpperCase() : 'EN_PREPARATION'
  if (!(STATUTS_CHANTIER as readonly string[]).includes(statutBrut)) {
    return { erreur: `Statut invalide « ${statutBrut} ». Valeurs acceptées : ${STATUTS_CHANTIER.join(', ')}.` }
  }

  const typeDuree = args.typeDuree ? String(args.typeDuree).trim().toUpperCase() : 'CALENDRIER'
  if (!(TYPES_DUREE as readonly string[]).includes(typeDuree)) {
    return { erreur: `typeDuree invalide « ${typeDuree} ». Valeurs acceptées : ${TYPES_DUREE.join(', ')}.` }
  }

  const dateParsee = parseDateOuNull(args.dateDebut)
  if (!dateParsee.ok) return { erreur: 'dateDebut invalide (format attendu AAAA-MM-JJ).' }

  let dureeEnJours: number | null = null
  if (args.dureeEnJours !== undefined && args.dureeEnJours !== null && String(args.dureeEnJours) !== '') {
    const n = Number(args.dureeEnJours)
    if (!Number.isFinite(n) || n < 0) return { erreur: 'dureeEnJours doit être un nombre positif.' }
    dureeEnJours = Math.floor(n)
  }

  // numeroIdentification est @unique : on pré-contrôle pour éviter un 500 opaque
  const numeroIdentification = args.numeroIdentification
    ? String(args.numeroIdentification).trim()
    : null
  if (numeroIdentification) {
    const conflit = await prisma.chantier.findUnique({
      where: { numeroIdentification },
      select: { chantierId: true, nomChantier: true },
    })
    if (conflit) {
      return {
        erreur:
          `Le numéro Checkinatwork « ${numeroIdentification} » est déjà utilisé par le chantier ` +
          `« ${conflit.nomChantier} » (${conflit.chantierId}). Vérifie le numéro de déclaration.`,
      }
    }
  }

  // Client : on accepte un id, ou à défaut un nom que l'on résout
  let clientId: string | null = null
  let clientNom: string | null = null
  if (args.clientId) {
    const ref = String(args.clientId).trim()
    const parId = await prisma.client.findUnique({ where: { id: ref }, select: { id: true, nom: true } })
    if (parId) {
      clientId = parId.id
      clientNom = parId.nom
    } else {
      const res = await resolveClient(ref)
      if (!res.ok || !res.value) {
        return { erreur: res.message || `Client introuvable : « ${ref} ».`, candidats: res.candidats }
      }
      clientId = res.value.id
      clientNom = res.value.nom
    }
  }

  let contactId: string | null = null
  if (args.contactId) {
    const ref = String(args.contactId).trim()
    const contact = await prisma.contact.findUnique({ where: { id: ref }, select: { id: true } })
    if (!contact) return { erreur: `Contact introuvable : « ${ref} ».` }
    contactId = contact.id
  }

  return {
    nomChantier,
    statut: statutBrut,
    typeDuree,
    dateDebut: dateParsee.date,
    dureeEnJours,
    clientId,
    clientNom,
    contactId,
    numeroIdentification,
  }
}

export const creerChantier: ToolDefinition = {
  name: 'creer_chantier',
  description:
    "Crée un nouveau chantier. L'identifiant du chantier (format CH-ANNEE-XXXXXX) est généré " +
    "automatiquement et ne doit PAS être fourni. numeroIdentification reçoit UNIQUEMENT le numéro de déclaration " +
    "Checkinatwork (enregistrement des présences, ONSS) — jamais une référence de marché ou de " +
    "bon de commande : il est communiqué chaque jour aux sous-traitants pour leur check-in. " +
    "Si le numéro n'est pas connu, ne rien mettre (unique : un doublon est refusé). Génère aussi le PPSS et notifie l'équipe. " +
    "Utiliser dryRun d'abord pour valider les données sans rien écrire.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      nomChantier: { type: 'string', description: 'Nom du chantier (obligatoire)' },
      clientId: {
        type: 'string',
        description:
          "Id du client obtenu via trouver_ou_creer_client. Un nom est toléré et sera résolu.",
      },
      numeroIdentification: {
        type: 'string',
        description:
          "Numéro de déclaration Checkinatwork du chantier (unique). JAMAIS une référence de marché ou " +
          "de bon de commande. Laisser vide si inconnu.",
      },
      adresseChantier: { type: 'string', description: 'Adresse du chantier' },
      villeChantier: { type: 'string', description: 'Ville du chantier' },
      dateDebut: { type: 'string', description: 'Date de début, format AAAA-MM-JJ' },
      dureeEnJours: { type: 'number', description: 'Durée prévue en jours' },
      typeDuree: {
        type: 'string',
        description: "CALENDRIER (défaut) ou OUVRABLE",
        enum: ['CALENDRIER', 'OUVRABLE'],
      },
      statut: {
        type: 'string',
        description: 'Défaut EN_PREPARATION',
        enum: ['EN_PREPARATION', 'A_VENIR', 'EN_COURS', 'TERMINE'],
      },
      contactId: { type: 'string', description: 'Id du contact client (optionnel)' },
    },
    required: ['nomChantier'],
  },
  summarize: async (args) => {
    const v = await validerChantier(args)
    if (v.erreur) return `Création impossible : ${v.erreur}`
    const client = v.clientNom ? ` pour ${v.clientNom}` : ''
    const ref = v.numeroIdentification ? ` (réf. ${v.numeroIdentification})` : ''
    const date = v.dateDebut ? `, début le ${v.dateDebut.toLocaleDateString('fr-FR')}` : ''
    return `Créer le chantier « ${v.nomChantier} »${client}${ref}${date} — statut ${v.statut}.`
  },
  preview: async (args) => {
    const v = await validerChantier(args)
    if (v.erreur) return { action: 'aucune', erreur: v.erreur, candidats: v.candidats }
    return {
      action: 'creation',
      chantier: {
        nomChantier: v.nomChantier,
        statut: v.statut,
        typeDuree: v.typeDuree,
        dateDebut: v.dateDebut,
        dureeEnJours: v.dureeEnJours,
        numeroIdentification: v.numeroIdentification,
        client: v.clientNom,
      },
      note: "L'identifiant CH-ANNEE-XXXXXX sera généré à l'exécution. Le PPSS sera généré automatiquement.",
    }
  },
  execute: async (args, ctx) => {
    const v = await validerChantier(args)
    if (v.erreur) return { erreur: v.erreur, candidats: v.candidats }

    const chantierId = await genererSlugChantierUnique()
    if (!chantierId) {
      return { erreur: "Impossible de générer un identifiant de chantier unique. Réessaie." }
    }

    const chantier = await prisma.chantier.create({
      data: {
        chantierId,
        nomChantier: v.nomChantier!,
        statut: v.statut!,
        typeDuree: v.typeDuree!,
        // on écrit dateDebut (dateCommencement est une colonne héritée inutilisée)
        dateDebut: v.dateDebut ?? null,
        dureeEnJours: v.dureeEnJours ?? null,
        numeroIdentification: v.numeroIdentification ?? null,
        adresseChantier: args.adresseChantier ? String(args.adresseChantier).trim() : null,
        villeChantier: args.villeChantier ? String(args.villeChantier).trim() : null,
        clientId: v.clientId ?? null,
        contactId: v.contactId ?? null,
        updatedAt: new Date(),
      },
      select: { id: true, chantierId: true, nomChantier: true, statut: true },
    })

    // Effets de bord de la route REST, reproduits explicitement.
    // Différence assumée : on REMONTE l'échec PPSS au lieu de l'avaler.
    let ppssErreur: string | undefined
    try {
      await generatePPSS(chantier.chantierId, ctx.userId)
    } catch (e) {
      ppssErreur = e instanceof Error ? e.message : 'échec inconnu'
      console.error('[agent] PPSS non généré pour', chantier.chantierId, e)
    }

    try {
      await notifier({
        code: 'CHANTIER_CREE',
        rolesDestinataires: ['ADMIN', 'MANAGER'],
        metadata: {
          chantierId: chantier.chantierId,
          chantierNom: chantier.nomChantier,
          userName: 'Agent MCP',
        },
      })
    } catch (e) {
      console.error('[agent] notification CHANTIER_CREE non envoyée:', e)
    }

    return {
      succes: true,
      // id (cuid) ET chantierId (slug) : les outils suivants ont besoin de l'un ou l'autre
      id: chantier.id,
      chantierId: chantier.chantierId,
      nomChantier: chantier.nomChantier,
      statut: chantier.statut,
      clientId: v.clientId ?? null,
      ...(ppssErreur ? { ppssErreur } : {}),
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// D3 — completer_fiche_chantier
// ─────────────────────────────────────────────────────────────────────────────

/** Champs texte simples de la fiche, fusionnés tels quels. */
const CHAMPS_TEXTE_FICHE = [
  'maitreOuvrageNom',
  'maitreOuvrageAdresse',
  'maitreOuvrageLocalite',
  'bureauArchitectureNom',
  'bureauArchitectureAdresse',
  'bureauArchitectureLocalite',
  'villeChantier',
  'adresseChantier',
] as const

/**
 * Un champ n'est modifié que s'il est explicitement fourni.
 * Chaîne vide = « je ne sais pas » → ignoré (protège contre l'effacement
 * accidentel par un modèle qui remplirait tous les champs).
 * null explicite = « vider ce champ ».
 */
function champFourni(args: Record<string, unknown>, cle: string): boolean {
  if (!(cle in args)) return false
  const v = args[cle]
  if (v === null) return true
  return String(v).trim() !== ''
}

function valeurTexte(args: Record<string, unknown>, cle: string): string | null {
  const v = args[cle]
  return v === null ? null : String(v).trim()
}

export const completerFicheChantier: ToolDefinition = {
  name: 'completer_fiche_chantier',
  description:
    "Complète la fiche d'un chantier existant : maître d'ouvrage, bureau d'architecture, " +
    "adresse/ville, budget, numéro Checkinatwork, durée. Fusion partielle : seuls les champs fournis sont " +
    "modifiés, les autres restent intacts. Une chaîne vide est ignorée ; envoyer null pour vider " +
    "un champ. Cet outil ne peut pas modifier le statut du chantier.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: {
        type: 'string',
        description: "Identifiant (CH-…), id interne ou nom du chantier",
      },
      maitreOuvrageNom: { type: 'string', description: "Nom du maître d'ouvrage" },
      maitreOuvrageAdresse: { type: 'string', description: "Adresse du maître d'ouvrage" },
      maitreOuvrageLocalite: { type: 'string', description: "Localité du maître d'ouvrage" },
      bureauArchitectureNom: { type: 'string', description: "Nom du bureau d'architecture" },
      bureauArchitectureAdresse: { type: 'string', description: "Adresse du bureau d'architecture" },
      bureauArchitectureLocalite: { type: 'string', description: "Localité du bureau d'architecture" },
      adresseChantier: { type: 'string', description: 'Adresse du chantier' },
      villeChantier: { type: 'string', description: 'Ville du chantier' },
      budget: { type: 'number', description: 'Budget en euros (voir avertissement dans le résumé)' },
      numeroIdentification: {
        type: 'string',
        description:
          "Numéro de déclaration Checkinatwork du chantier (unique). JAMAIS une référence de marché ou " +
          "de bon de commande.",
      },
      dateDebut: { type: 'string', description: 'Date de début, format AAAA-MM-JJ' },
      dureeEnJours: { type: 'number', description: 'Durée prévue en jours' },
      typeDuree: { type: 'string', description: 'CALENDRIER ou OUVRABLE', enum: ['CALENDRIER', 'OUVRABLE'] },
    },
    required: ['chantier'],
  },
  summarize: async (args) => {
    const res = await resolveChantier(String(args.chantier || ''))
    const nom = res.ok && res.value ? res.value.nomChantier : String(args.chantier)
    const champs: string[] = []
    for (const c of CHAMPS_TEXTE_FICHE) if (champFourni(args, c)) champs.push(c)
    for (const c of ['numeroIdentification', 'dateDebut', 'dureeEnJours', 'typeDuree', 'budget']) {
      if (champFourni(args, c)) champs.push(c)
    }
    if (champs.length === 0) return `Aucun champ à modifier sur « ${nom} ».`
    const alerte = champFourni(args, 'budget')
      ? " ⚠️ Le budget sera recalculé automatiquement dès qu'une commande sera validée."
      : ''
    return `Compléter la fiche de « ${nom} » : ${champs.join(', ')}.${alerte}`
  },
  preview: async (args) => {
    const prep = await preparerFiche(args)
    if (prep.erreur) return { action: 'aucune', erreur: prep.erreur, candidats: prep.candidats }
    if (Object.keys(prep.data!).length === 0) {
      return { action: 'aucune', raison: 'aucun champ fourni' }
    }
    return {
      action: 'mise_a_jour',
      chantier: prep.chantierNom,
      champsModifies: prep.data,
      inchange: 'statut (non modifiable par cet outil), et tout champ non fourni',
      ...(prep.avertissement ? { avertissement: prep.avertissement } : {}),
    }
  },
  execute: async (args) => {
    const prep = await preparerFiche(args)
    if (prep.erreur) return { erreur: prep.erreur, candidats: prep.candidats }
    const data = prep.data!
    if (Object.keys(data).length === 0) {
      return { erreur: 'Aucun champ à modifier : fournis au moins une valeur.' }
    }

    const maj = await prisma.chantier.update({
      where: { id: prep.chantierIdInterne! },
      data: { ...data, updatedAt: new Date() },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        statut: true,
        maitreOuvrageNom: true,
        bureauArchitectureNom: true,
        villeChantier: true,
        budget: true,
      },
    })

    return {
      succes: true,
      chantier: maj,
      champsModifies: Object.keys(data),
      ...(prep.avertissement ? { avertissement: prep.avertissement } : {}),
    }
  },
}

interface PreparationFiche {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  chantierIdInterne?: string
  chantierNom?: string
  data?: Record<string, unknown>
  avertissement?: string
}

/** Résout le chantier et construit le patch partiel, sans rien écrire. */
async function preparerFiche(args: Record<string, unknown>): Promise<PreparationFiche> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) {
    return { erreur: res.message || 'Chantier introuvable.', candidats: res.candidats }
  }

  const data: Record<string, unknown> = {}

  for (const cle of CHAMPS_TEXTE_FICHE) {
    if (champFourni(args, cle)) data[cle] = valeurTexte(args, cle)
  }

  if (champFourni(args, 'budget')) {
    const v = args.budget
    if (v === null) {
      data.budget = null
    } else {
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0) return { erreur: 'budget doit être un nombre positif.' }
      data.budget = n
    }
  }

  if (champFourni(args, 'dateDebut')) {
    if (args.dateDebut === null) {
      data.dateDebut = null
    } else {
      const d = parseDateOuNull(args.dateDebut)
      if (!d.ok) return { erreur: 'dateDebut invalide (format attendu AAAA-MM-JJ).' }
      data.dateDebut = d.date
    }
  }

  if (champFourni(args, 'dureeEnJours')) {
    if (args.dureeEnJours === null) {
      data.dureeEnJours = null
    } else {
      const n = Number(args.dureeEnJours)
      if (!Number.isFinite(n) || n < 0) return { erreur: 'dureeEnJours doit être un nombre positif.' }
      data.dureeEnJours = Math.floor(n)
    }
  }

  if (champFourni(args, 'typeDuree')) {
    const t = String(args.typeDuree).trim().toUpperCase()
    if (!(TYPES_DUREE as readonly string[]).includes(t)) {
      return { erreur: `typeDuree invalide « ${t} ». Valeurs acceptées : ${TYPES_DUREE.join(', ')}.` }
    }
    data.typeDuree = t
  }

  if (champFourni(args, 'numeroIdentification')) {
    if (args.numeroIdentification === null) {
      data.numeroIdentification = null
    } else {
      const ref = String(args.numeroIdentification).trim()
      // @unique : on exclut le chantier courant du contrôle de conflit
      const conflit = await prisma.chantier.findUnique({
        where: { numeroIdentification: ref },
        select: { id: true, chantierId: true, nomChantier: true },
      })
      if (conflit && conflit.id !== res.value.id) {
        return {
          erreur:
            `Le numéro Checkinatwork « ${ref} » est déjà utilisé par le chantier ` +
            `« ${conflit.nomChantier} » (${conflit.chantierId}).`,
        }
      }
      data.numeroIdentification = ref
    }
  }

  return {
    chantierIdInterne: res.value.id,
    chantierNom: res.value.nomChantier,
    data,
    avertissement:
      'budget' in data
        ? "Le budget saisi sera écrasé par le recalcul automatique dès qu'une commande du chantier sera validée."
        : undefined,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D4 — creer_commande_chantier
// ─────────────────────────────────────────────────────────────────────────────

const TYPES_LIGNE = ['QP', 'QF', 'FF', 'TITRE', 'SOUS_TITRE'] as const
const MAX_LIGNES = 500
/**
 * 0 % par défaut : les commandes viennent d'entrepreneurs généraux, donc en
 * autoliquidation (report de TVA au cocontractant). Vérifié sur deux dossiers
 * réels — Bierset Bâtiment 84 et Eloy Bra-Sur-Lienne — dont les montants
 * encodés correspondent au bordereau sans TVA. Le défaut du schéma (20) est un
 * héritage, et 21 % serait faux pour ce flux. Fournir tauxTVA explicitement
 * pour une commande soumise à TVA.
 */
const TAUX_TVA_DEFAUT = 0

interface LigneNormalisee {
  ordre: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  total: number
  estOption: boolean
}

interface TotauxCommande {
  sousTotal: number
  totalOptions: number
  tva: number
  total: number
}

/**
 * Normalise les lignes en reproduisant le traitement des sections que la
 * branche « création » de POST /api/commandes omet (il n'existe que dans la
 * branche update et dans PUT /api/commandes/[commandeId]).
 */
function normaliserLignes(brutes: unknown[]): { lignes?: LigneNormalisee[]; erreur?: string } {
  const lignes: LigneNormalisee[] = []

  for (let i = 0; i < brutes.length; i++) {
    const l = (brutes[i] || {}) as Record<string, unknown>

    const typeBrut = l.type ? String(l.type).trim().toUpperCase() : 'QP'
    if (!(TYPES_LIGNE as readonly string[]).includes(typeBrut)) {
      return { erreur: `Ligne ${i + 1} : type « ${typeBrut} » invalide. Valeurs : ${TYPES_LIGNE.join(', ')}.` }
    }
    const estSection = typeBrut === 'TITRE' || typeBrut === 'SOUS_TITRE'

    const description = String(l.description ?? '').trim()
    if (!description && !estSection) {
      return { erreur: `Ligne ${i + 1} : description obligatoire.` }
    }

    if (estSection) {
      lignes.push({
        ordre: i,
        article: String(
          l.article || (typeBrut === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE')
        ).trim(),
        description,
        type: typeBrut,
        unite: '',
        prixUnitaire: 0,
        quantite: 0,
        total: 0,
        estOption: false,
      })
      continue
    }

    const prixUnitaire = Number(l.prixUnitaire ?? 0)
    const quantite = Number(l.quantite ?? 0)
    if (!Number.isFinite(prixUnitaire) || !Number.isFinite(quantite)) {
      return { erreur: `Ligne ${i + 1} : prixUnitaire et quantite doivent être numériques.` }
    }
    if (prixUnitaire < 0 || quantite < 0) {
      return { erreur: `Ligne ${i + 1} : prixUnitaire et quantite ne peuvent pas être négatifs.` }
    }

    lignes.push({
      ordre: i,
      article: String(l.article ?? '').trim(),
      description,
      type: typeBrut,
      unite: String(l.unite || 'Pièces').trim(),
      prixUnitaire,
      quantite,
      // total TOUJOURS recalculé : on ne fait jamais confiance à une valeur fournie
      total: arrondi2(prixUnitaire * quantite),
      estOption: l.estOption === true,
    })
  }

  return { lignes }
}

/** Miroir exact de recalculerTotaux (écran commande). totalOptions est EXCLU du total. */
function calculerTotaux(lignes: LigneNormalisee[], tauxTVA: number): TotauxCommande {
  const calculables = lignes.filter((l) => l.type !== 'TITRE' && l.type !== 'SOUS_TITRE')
  const sousTotal = arrondi2(
    calculables.filter((l) => !l.estOption).reduce((s, l) => s + l.total, 0)
  )
  const totalOptions = arrondi2(
    calculables.filter((l) => l.estOption).reduce((s, l) => s + l.total, 0)
  )
  const tva = arrondi2((sousTotal * tauxTVA) / 100)
  const total = arrondi2(sousTotal + tva)
  return { sousTotal, totalOptions, tva, total }
}

interface PreparationCommande {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  chantierIdInterne?: string
  chantierNom?: string
  clientId?: string | null
  dateCommande?: Date
  reference?: string | null
  tauxTVA?: number
  lignes?: LigneNormalisee[]
  totaux?: TotauxCommande
}

async function preparerCommande(args: Record<string, unknown>): Promise<PreparationCommande> {
  const res = await resolveChantier(String(args.chantier || ''))
  if (!res.ok || !res.value) {
    return { erreur: res.message || 'Chantier introuvable.', candidats: res.candidats }
  }

  const brutes = Array.isArray(args.lignes) ? (args.lignes as unknown[]) : null
  if (!brutes || brutes.length === 0) {
    return { erreur: 'Au moins une ligne de commande est requise.' }
  }
  if (brutes.length > MAX_LIGNES) {
    return { erreur: `Trop de lignes (${brutes.length}). Maximum ${MAX_LIGNES}.` }
  }

  const norm = normaliserLignes(brutes)
  if (norm.erreur) return { erreur: norm.erreur }

  let tauxTVA = TAUX_TVA_DEFAUT
  if (args.tauxTVA !== undefined && args.tauxTVA !== null && String(args.tauxTVA) !== '') {
    const t = Number(args.tauxTVA)
    if (!Number.isFinite(t) || t < 0 || t > 100) {
      return { erreur: 'tauxTVA doit être un nombre entre 0 et 100.' }
    }
    tauxTVA = t
  }

  const dateParsee = parseDateOuNull(args.dateCommande)
  if (!dateParsee.ok) return { erreur: 'dateCommande invalide (format attendu AAAA-MM-JJ).' }
  const dateCommande = dateParsee.date ?? new Date()

  const reference = args.reference ? String(args.reference).trim() : null

  // Refus d'écrasement : une commande de même référence sur ce chantier
  if (reference) {
    const existante = await prisma.commande.findFirst({
      where: { chantierId: res.value.id, reference },
      select: { id: true, statut: true },
    })
    if (existante) {
      return {
        erreur:
          `Une commande de référence « ${reference} » existe déjà sur ce chantier ` +
          `(id ${existante.id}, statut ${existante.statut}). Cet outil ne remplace jamais ` +
          `une commande existante : utilise une autre référence ou modifie-la dans l'application.`,
      }
    }
  }

  // Commande.clientId n'a PAS de clé étrangère : une valeur fausse passerait
  // silencieusement, d'où la vérification explicite.
  let clientId: string | null = res.value.clientId ?? null
  if (args.clientId) {
    const ref = String(args.clientId).trim()
    const c = await prisma.client.findUnique({ where: { id: ref }, select: { id: true } })
    if (!c) return { erreur: `Client introuvable : « ${ref} ».` }
    clientId = c.id
  }

  return {
    chantierIdInterne: res.value.id,
    chantierNom: res.value.nomChantier,
    clientId,
    dateCommande,
    reference,
    tauxTVA,
    lignes: norm.lignes,
    totaux: calculerTotaux(norm.lignes!, tauxTVA),
  }
}

export const creerCommandeChantier: ToolDefinition = {
  name: 'creer_commande_chantier',
  description:
    "Crée la commande client d'un chantier à partir des lignes du bordereau. Les totaux (ligne, " +
    "sous-total, TVA, total) sont TOUJOURS calculés côté serveur — ne pas les fournir. " +
    "La commande est créée en BROUILLON : elle doit être validée dans l'application, ce qui " +
    "déclenchera le PDF et le recalcul du budget du chantier. Ne remplace jamais une commande " +
    "existante. Utiliser dryRun pour vérifier les totaux avant d'écrire.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant (CH-…), id interne ou nom du chantier' },
      reference: { type: 'string', description: 'Référence de la commande (ex. numéro du bon de commande)' },
      dateCommande: { type: 'string', description: "Date de la commande, format AAAA-MM-JJ (défaut : aujourd'hui)" },
      tauxTVA: {
        type: 'number',
        description:
          'Taux de TVA en pourcentage. Défaut 0 (autoliquidation : commandes des ' +
          'entrepreneurs généraux). Préciser 21 si la commande est soumise à TVA.',
      },
      clientId: { type: 'string', description: 'Id du client (défaut : celui du chantier)' },
      lignes: {
        type: 'array',
        description:
          "Lignes du bordereau, dans l'ordre. Les lignes TITRE et SOUS_TITRE structurent le " +
          "document et sont exclues des totaux.",
        items: {
          type: 'object',
          properties: {
            article: { type: 'string', description: "Numéro d'article du bordereau" },
            description: { type: 'string', description: 'Libellé du poste (obligatoire hors sections)' },
            type: { type: 'string', description: 'QP (défaut), QF, FF, TITRE ou SOUS_TITRE', enum: [...TYPES_LIGNE] },
            unite: { type: 'string', description: "Unité (m², m³, pièce…). Défaut « Pièces »" },
            prixUnitaire: { type: 'number', description: 'Prix unitaire' },
            quantite: { type: 'number', description: 'Quantité' },
            estOption: { type: 'boolean', description: 'true si le poste est en option (exclu du total)' },
          },
          required: ['description'],
        },
      },
    },
    required: ['chantier', 'lignes'],
  },
  summarize: async (args) => {
    const p = await preparerCommande(args)
    if (p.erreur) return `Création impossible : ${p.erreur}`
    const t = p.totaux!
    const nbPostes = p.lignes!.filter((l) => l.type !== 'TITRE' && l.type !== 'SOUS_TITRE').length
    const options = t.totalOptions > 0 ? ` (options : ${eur(t.totalOptions)}, hors total)` : ''
    return (
      `Créer une commande BROUILLON sur « ${p.chantierNom} » : ${nbPostes} poste(s), ` +
      `sous-total ${eur(t.sousTotal)}, TVA ${p.tauxTVA} % ${eur(t.tva)}, total ${eur(t.total)}${options}.`
    )
  },
  preview: async (args) => {
    const p = await preparerCommande(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'creation',
      chantier: p.chantierNom,
      statut: 'BROUILLON',
      reference: p.reference,
      tauxTVA: p.tauxTVA,
      nbLignes: p.lignes!.length,
      totaux: p.totaux,
      note:
        "Totaux calculés côté serveur — à comparer au bordereau avant exécution. " +
        "Le budget du chantier ne sera PAS modifié tant que la commande reste en BROUILLON.",
    }
  },
  execute: async (args) => {
    const p = await preparerCommande(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const t = p.totaux!

    // Transaction : jamais de commande orpheline sans ses lignes
    const commande = await prisma.$transaction(async (tx) => {
      const c = await tx.commande.create({
        data: {
          // Commande.chantierId pointe sur Chantier.id (cuid), PAS sur le slug métier
          chantierId: p.chantierIdInterne!,
          clientId: p.clientId ?? null,
          dateCommande: p.dateCommande!,
          reference: p.reference,
          tauxTVA: p.tauxTVA!,
          sousTotal: t.sousTotal,
          totalOptions: t.totalOptions,
          tva: t.tva,
          total: t.total,
          // BROUILLON imposé : pas de PDF, pas de recalcul du budget du chantier
          statut: 'BROUILLON',
          estVerrouillee: false,
          updatedAt: new Date(),
        },
        select: { id: true },
      })

      await tx.ligneCommande.createMany({
        data: p.lignes!.map((l) => ({
          commandeId: c.id,
          ordre: l.ordre,
          article: l.article,
          description: l.description,
          type: l.type,
          unite: l.unite,
          prixUnitaire: l.prixUnitaire,
          quantite: l.quantite,
          total: l.total,
          estOption: l.estOption,
          updatedAt: new Date(),
        })),
      })

      return c
    })

    return {
      succes: true,
      commandeId: commande.id,
      chantier: p.chantierNom,
      statut: 'BROUILLON',
      reference: p.reference,
      tauxTVA: p.tauxTVA,
      nbLignes: p.lignes!.length,
      totaux: t,
      prochaineEtape:
        "Vérifie la commande dans l'application puis valide-la : c'est la validation qui génère " +
        'le PDF et met à jour le budget du chantier.',
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// D5 — modifier_client (compléter / corriger une fiche client existante)
// ─────────────────────────────────────────────────────────────────────────────

const CHAMPS_TEXTE_CLIENT = ['nom', 'email', 'telephone', 'adresse', 'numeroTva'] as const

export const modifierClient: ToolDefinition = {
  name: 'modifier_client',
  description:
    "Complète ou corrige la fiche d'un client existant (nom, email, téléphone, adresse, TVA). " +
    'Fusion partielle : seuls les champs fournis sont modifiés. Une chaîne vide est ignorée ; ' +
    'envoyer null pour vider un champ. Ne crée jamais de client — utiliser trouver_ou_creer_client.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Identifiant (CL-…) ou nom du client à modifier' },
      nom: { type: 'string', description: 'Nouvelle raison sociale' },
      email: { type: 'string', description: 'Email' },
      telephone: { type: 'string', description: 'Téléphone' },
      adresse: { type: 'string', description: 'Adresse postale' },
      numeroTva: { type: 'string', description: 'Numéro de TVA' },
    },
    required: ['client'],
  },
  summarize: async (args) => {
    const prep = await preparerModifClient(args)
    if (prep.erreur) return `Modification impossible : ${prep.erreur}`
    const champs = Object.keys(prep.data!)
    if (champs.length === 0) return `Aucun champ à modifier sur « ${prep.clientNom} ».`
    return `Modifier le client « ${prep.clientNom} » : ${champs.join(', ')}.`
  },
  preview: async (args) => {
    const prep = await preparerModifClient(args)
    if (prep.erreur) return { action: 'aucune', erreur: prep.erreur, candidats: prep.candidats }
    if (Object.keys(prep.data!).length === 0) return { action: 'aucune', raison: 'aucun champ fourni' }
    return {
      action: 'mise_a_jour',
      client: prep.clientNom,
      champsModifies: prep.data,
      ...(prep.avertissement ? { avertissement: prep.avertissement } : {}),
    }
  },
  execute: async (args) => {
    const prep = await preparerModifClient(args)
    if (prep.erreur) return { erreur: prep.erreur, candidats: prep.candidats }
    const data = prep.data!
    if (Object.keys(data).length === 0) {
      return { erreur: 'Aucun champ à modifier : fournis au moins une valeur.' }
    }

    const maj = await prisma.client.update({
      where: { id: prep.clientId! },
      data: { ...data, updatedAt: new Date() }, // Client n'a pas @updatedAt
      select: { id: true, nom: true, email: true, telephone: true, adresse: true, numeroTva: true },
    })

    return {
      succes: true,
      client: maj,
      champsModifies: Object.keys(data),
      ...(prep.avertissement ? { avertissement: prep.avertissement } : {}),
    }
  },
}

interface PreparationModifClient {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  clientId?: string
  clientNom?: string
  data?: Record<string, unknown>
  avertissement?: string
}

async function preparerModifClient(args: Record<string, unknown>): Promise<PreparationModifClient> {
  const res = await resolveClient(String(args.client || ''))
  if (!res.ok || !res.value) {
    return { erreur: res.message || 'Client introuvable.', candidats: res.candidats }
  }

  const data: Record<string, unknown> = {}
  for (const cle of CHAMPS_TEXTE_CLIENT) {
    if (champFourni(args, cle)) data[cle] = valeurTexte(args, cle)
  }

  // Une TVA déjà portée par un AUTRE client signale un doublon probable.
  // La colonne n'étant pas unique, rien ne l'empêcherait en base.
  let avertissement: string | undefined
  if (typeof data.numeroTva === 'string' && data.numeroTva) {
    const cible = normalizeTva(data.numeroTva)
    const tous = await prisma.client.findMany({ select: { id: true, nom: true, numeroTva: true } })
    const collision = tous.filter((c) => c.id !== res.value!.id && normalizeTva(c.numeroTva) === cible)
    if (collision.length > 0) {
      avertissement =
        `Cette TVA est déjà portée par : ${collision.map((c) => c.nom).join(', ')}. ` +
        `Vérifie qu'il ne s'agit pas d'un doublon à fusionner.`
    }
  }

  return { clientId: res.value.id, clientNom: res.value.nom, data, avertissement }
}

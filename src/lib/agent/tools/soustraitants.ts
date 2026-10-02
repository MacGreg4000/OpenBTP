// Création et modification de sous-traitants.
//
// Mêmes règles que l'application (POST /api/sous-traitants, PUT /api/sous-traitants/[id]) :
//  - nom et email obligatoires ; l'email n'est PAS unique (une même personne
//    peut gérer plusieurs sociétés) ;
//  - représentant légal validé par normaliserRepresentant (format + domaine
//    email, GSM normalisé E.164) — exigé ensuite pour générer un contrat.
// Pas de suppression (aucun outil MCP ne supprime).

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveSousTraitant, normalizeTva, normalizeNomEntreprise } from './helpers'
import { normaliserRepresentant } from '@/lib/soustraitants/representant-serveur'
import { emailFormatValide, champsRepresentantManquants } from '@/lib/soustraitants/representant'

const CHAMPS_TEXTE = ['contact', 'telephone', 'adresse', 'tva'] as const
const CHAMPS_REPRESENTANT: Record<string, string> = {
  representantPrenom: 'representantPrenom',
  representantNom: 'representantNom',
  representantFonction: 'representantFonction',
  representantEmail: 'representantEmail',
  representantGsm: 'representantGsm',
}

const proprietesCommunes = {
  contact: { type: 'string', description: 'Personne de contact (si différente du représentant)' },
  telephone: { type: 'string', description: 'Téléphone de la société' },
  adresse: { type: 'string', description: 'Adresse complète' },
  tva: { type: 'string', description: 'Numéro de TVA / BCE (ex. BE0123456789, PT123456789)' },
  representantPrenom: { type: 'string', description: 'Prénom du représentant légal (signataire du contrat-cadre)' },
  representantNom: { type: 'string', description: 'Nom du représentant légal' },
  representantFonction: { type: 'string', description: 'Fonction du représentant (ex. Gérant)' },
  representantEmail: { type: 'string', description: 'Email du représentant — reçoit le contrat et les rappels Checkinatwork' },
  representantGsm: { type: 'string', description: 'GSM du représentant (format international accepté, ex. +351 912 345 678)' },
}

/** Texte : chaîne vide ignorée, null = vider le champ, sinon valeur nettoyée. */
function texte(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  const s = String(v).trim()
  return s === '' ? undefined : s
}

interface Preparation {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  data?: Record<string, unknown>
  avertissements?: string[]
  libelle?: string
  id?: string
}

/** Champs représentant fournis → validés et normalisés (null = vider). */
async function representantDepuis(args: Record<string, unknown>): Promise<{ erreur?: string; data: Record<string, unknown> }> {
  const brut: Record<string, unknown> = {}
  for (const k of Object.keys(CHAMPS_REPRESENTANT)) {
    const v = texte(args[k])
    if (v !== undefined) brut[k] = v ?? ''
  }
  if (!Object.keys(brut).length) return { data: {} }
  const r = await normaliserRepresentant(brut)
  if (r.erreur) return { erreur: r.erreur, data: {} }
  return { data: { ...(r.data || {}) } }
}

async function preparerCreation(args: Record<string, unknown>): Promise<Preparation> {
  const nom = texte(args.nom)
  const email = texte(args.email)?.toLowerCase()
  if (!nom) return { erreur: 'Le nom du sous-traitant est obligatoire.' }
  if (!email) return { erreur: 'L’email du sous-traitant est obligatoire.' }
  if (!emailFormatValide(email)) return { erreur: `Email invalide : « ${email} ».` }

  const data: Record<string, unknown> = { nom, email }
  for (const k of CHAMPS_TEXTE) {
    const v = texte(args[k])
    if (v) data[k] = v
  }
  const rep = await representantDepuis(args)
  if (rep.erreur) return { erreur: rep.erreur }
  Object.assign(data, rep.data)

  // Doublons probables : même TVA (bloquant sauf forcer) ou même nom (avertissement)
  const avertissements: string[] = []
  const existants = await prisma.soustraitant.findMany({ select: { id: true, nom: true, tva: true } })
  const tva = data.tva ? normalizeTva(String(data.tva)) : ''
  const memeTva = tva ? existants.filter((s) => s.tva && normalizeTva(s.tva) === tva) : []
  if (memeTva.length && args.forcer !== true) {
    return {
      erreur: `Un sous-traitant avec ce numéro de TVA existe déjà : ${memeTva.map((s) => s.nom).join(', ')}. ` +
        'Utiliser modifier_sous_traitant, ou forcer: true si c’est bien une autre fiche.',
      candidats: memeTva.map((s) => ({ id: s.id, nom: s.nom })),
    }
  }
  const nomNorm = normalizeNomEntreprise(nom)
  const memeNom = existants.filter((s) => normalizeNomEntreprise(s.nom) === nomNorm)
  if (memeNom.length) avertissements.push(`Nom identique à une fiche existante : ${memeNom.map((s) => `${s.nom} (${s.id})`).join(', ')}.`)

  const manquants = champsRepresentantManquants({
    representantPrenom: (data.representantPrenom as string) ?? null,
    representantNom: (data.representantNom as string) ?? null,
    representantFonction: (data.representantFonction as string) ?? null,
    representantEmail: (data.representantEmail as string) ?? null,
    representantGsm: (data.representantGsm as string) ?? null,
  })
  if (manquants.length) avertissements.push(`Représentant incomplet (${manquants.join(', ')}) : aucun contrat ne pourra être généré tant que ce n’est pas complété.`)

  return { data, avertissements, libelle: nom }
}

export const creerSousTraitant: ToolDefinition = {
  name: 'creer_sous_traitant',
  description:
    'Crée une fiche sous-traitant (société). Nom et email obligatoires ; renseigner aussi le représentant légal ' +
    '(prénom, nom, fonction, email, GSM), indispensable pour générer et faire signer le contrat-cadre. ' +
    'Un même email peut servir à plusieurs sociétés. Refuse un numéro de TVA déjà connu (sauf forcer: true). ' +
    'Faire un dryRun avant.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      nom: { type: 'string', description: 'Raison sociale du sous-traitant' },
      email: { type: 'string', description: 'Email principal de la société' },
      ...proprietesCommunes,
      forcer: { type: 'boolean', description: 'Créer même si le numéro de TVA existe déjà (deux fiches distinctes voulues)' },
    },
    required: ['nom', 'email'],
  },
  summarize: async (args) => {
    const p = await preparerCreation(args)
    if (p.erreur) return `Création impossible : ${p.erreur}`
    return `Créer le sous-traitant « ${p.libelle} » (${p.data!.email}).${p.avertissements?.length ? ` ${p.avertissements.join(' ')}` : ''}`
  },
  preview: async (args) => {
    const p = await preparerCreation(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return { action: 'creation', champs: p.data, ...(p.avertissements?.length ? { avertissements: p.avertissements } : {}) }
  },
  execute: async (args) => {
    const p = await preparerCreation(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const id = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    const st = await prisma.soustraitant.create({
      data: { id, ...(p.data as { nom: string; email: string }), updatedAt: new Date() },
      select: { id: true, nom: true },
    })
    return {
      succes: true,
      soustraitantId: st.id,
      nom: st.nom,
      ...(p.avertissements?.length ? { avertissements: p.avertissements } : {}),
      prochaineEtape: 'Envoyer le contrat-cadre depuis la liste des sous-traitants (représentant complet requis).',
    }
  },
}

async function preparerModification(args: Record<string, unknown>): Promise<Preparation> {
  const r = await resolveSousTraitant(String(args.sous_traitant || ''))
  if (!r.ok || !r.value) return { erreur: r.message || 'Sous-traitant introuvable.', candidats: r.candidats }
  const actuel = await prisma.soustraitant.findUnique({ where: { id: r.value.id } })
  if (!actuel) return { erreur: 'Sous-traitant introuvable.' }

  const data: Record<string, unknown> = {}
  const nom = texte(args.nom)
  if (nom === null) return { erreur: 'Le nom ne peut pas être vidé.' }
  if (nom && nom !== actuel.nom) data.nom = nom
  const email = texte(args.email)
  if (email === null) return { erreur: 'L’email ne peut pas être vidé.' }
  if (email) {
    const e = email.toLowerCase()
    if (!emailFormatValide(e)) return { erreur: `Email invalide : « ${e} ».` }
    if (e !== actuel.email) data.email = e
  }
  for (const k of CHAMPS_TEXTE) {
    const v = texte(args[k])
    if (v !== undefined && v !== actuel[k]) data[k] = v
  }
  const rep = await representantDepuis(args)
  if (rep.erreur) return { erreur: rep.erreur }
  for (const [k, v] of Object.entries(rep.data)) {
    if (v !== (actuel as Record<string, unknown>)[k]) data[k] = v
  }
  for (const k of ['actif', 'rappelCheckinActif'] as const) {
    if (typeof args[k] === 'boolean' && args[k] !== actuel[k]) data[k] = args[k]
  }

  const apres = { ...actuel, ...data } as typeof actuel
  const avertissements: string[] = []
  const manquants = champsRepresentantManquants(apres)
  if (manquants.length) avertissements.push(`Représentant toujours incomplet : ${manquants.join(', ')}.`)

  return { id: actuel.id, libelle: actuel.nom, data, avertissements }
}

export const modifierSousTraitant: ToolDefinition = {
  name: 'modifier_sous_traitant',
  description:
    'Complète ou corrige une fiche sous-traitant : coordonnées, TVA, représentant légal (prénom, nom, fonction, ' +
    'email, GSM), actif / inactif, rappel Checkinatwork. Fusion partielle : seuls les champs fournis changent ; ' +
    'chaîne vide ignorée, null pour vider un champ facultatif. Faire un dryRun avant.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sous_traitant: { type: 'string', description: 'Identifiant (ST-…) ou nom du sous-traitant' },
      nom: { type: 'string', description: 'Nouvelle raison sociale' },
      email: { type: 'string', description: 'Email principal' },
      ...proprietesCommunes,
      actif: { type: 'boolean', description: 'false = sous-traitant inactif (plus de rappels ni de renouvellement)' },
      rappelCheckinActif: { type: 'boolean', description: 'Recevoir le rappel Checkinatwork quotidien' },
    },
    required: ['sous_traitant'],
  },
  summarize: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return `Modification impossible : ${p.erreur}`
    const champs = Object.keys(p.data!)
    if (!champs.length) return `Aucun changement sur « ${p.libelle} ».`
    return `Modifier le sous-traitant « ${p.libelle} » : ${champs.join(', ')}.`
  },
  preview: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    if (!Object.keys(p.data!).length) return { action: 'aucune', raison: 'aucun changement' }
    return { action: 'mise_a_jour', sousTraitant: p.libelle, champsModifies: p.data, ...(p.avertissements?.length ? { avertissements: p.avertissements } : {}) }
  },
  execute: async (args) => {
    const p = await preparerModification(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    if (!Object.keys(p.data!).length) return { succes: true, info: 'Aucun changement.' }
    await prisma.soustraitant.update({ where: { id: p.id }, data: { ...p.data, updatedAt: new Date() } })
    return {
      succes: true,
      sousTraitant: p.libelle,
      champsModifies: Object.keys(p.data!),
      ...(p.avertissements?.length ? { avertissements: p.avertissements } : {}),
    }
  },
}

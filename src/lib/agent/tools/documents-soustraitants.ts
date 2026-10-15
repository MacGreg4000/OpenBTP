// Ouvriers et documents de société des sous-traitants — outils pour le
// rangement des documents par Claude (skill « ranger les documents des
// sous-traitants ») et le suivi de conformité.
//
// Pas de suppression : un ouvrier parti est marqué inactif, un document
// remplacé est archivé.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveSousTraitant, resolveOuvrier } from './helpers'
import { decoderFichier, parseDateExpiration } from './ouvriers'
import { CODES_SOCIETE, TYPES_DOCUMENT_SOCIETE, CODES_OUVRIER, libelleType } from '@/lib/documents/types'
import { enregistrerDocumentSociete } from '@/lib/documents/stockage'
import { conformiteSousTraitants } from '@/lib/documents/conformite'

const cle = (s: string | null | undefined) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

function texte(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  const s = String(v).trim()
  return s || undefined
}

// ─── Ouvriers ────────────────────────────────────────────────────────────────

export const listeOuvriers: ToolDefinition = {
  name: 'liste_ouvriers',
  description:
    'Liste les ouvriers (personnes) d’un sous-traitant avec l’état de leurs documents : pour chaque type exigé, ' +
    'ok / expire bientôt / expiré / manquant. inclureInactifs pour voir aussi les personnes parties.',
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      inclureInactifs: { type: 'boolean', description: 'Inclure les ouvriers marqués partis' },
    },
    required: ['sousTraitant'],
  },
  execute: async (args) => {
    const st = await resolveSousTraitant(String(args.sousTraitant || ''))
    if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
    const [conf] = await conformiteSousTraitants({ soustraitantId: st.value.id })
    const inactifs = args.inclureInactifs
      ? await prisma.ouvrier.findMany({ where: { sousTraitantId: st.value.id, actif: false }, select: { id: true, prenom: true, nom: true } })
      : []
    return {
      sousTraitant: conf.nom,
      documentsExiges: conf.requisOuvrier.map(libelleType),
      ouvriers: conf.ouvriers.map((o) => ({
        id: o.id,
        nom: `${o.prenom} ${o.nom}`.trim(),
        poste: o.poste,
        documents: Object.fromEntries(
          Object.entries(o.documents)
            .filter(([, c]) => c.statut !== 'absent')
            .map(([code, c]) => [code, c.dateExpiration ? `${c.statut} (${c.dateExpiration})` : c.statut])
        ),
      })),
      ...(inactifs.length ? { partis: inactifs.map((o) => ({ id: o.id, nom: `${o.prenom} ${o.nom}`.trim() })) } : {}),
    }
  },
}

async function preparerOuvrier(args: Record<string, unknown>) {
  const st = await resolveSousTraitant(String(args.sousTraitant || ''))
  if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
  const prenom = texte(args.prenom)
  const nom = texte(args.nom)
  if (!nom) return { erreur: 'Le nom de l’ouvrier est obligatoire.' }
  const existants = await prisma.ouvrier.findMany({
    where: { sousTraitantId: st.value.id },
    select: { id: true, prenom: true, nom: true, actif: true },
  })
  const k = cle(`${prenom || ''}${nom}`)
  const doublon = existants.find((o) => cle(`${o.prenom}${o.nom}`) === k || cle(`${o.nom}${o.prenom}`) === k)
  if (doublon) {
    return {
      erreur:
        `${doublon.prenom} ${doublon.nom} existe déjà chez ${st.value.nom}` +
        (doublon.actif ? '.' : ' (marqué parti — utiliser modifier_ouvrier avec actif: true pour le réactiver).'),
      candidats: [{ id: doublon.id, nom: `${doublon.prenom} ${doublon.nom}` }],
    }
  }
  return {
    sousTraitantId: st.value.id,
    sousTraitantNom: st.value.nom,
    data: {
      prenom: prenom || '',
      nom,
      poste: texte(args.poste) || 'Ouvrier',
      telephone: texte(args.telephone) || null,
      email: texte(args.email) || null,
    },
  }
}

export const creerOuvrier: ToolDefinition = {
  name: 'creer_ouvrier',
  description:
    'Ajoute une personne (ouvrier, associé, gérant…) à un sous-traitant, avant d’y ranger ses documents. ' +
    'Refuse un doublon (même prénom + nom, insensible aux accents) et signale une personne marquée partie.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      prenom: { type: 'string' },
      nom: { type: 'string' },
      poste: { type: 'string', description: 'Ex. Carreleur, Gérant, Associé (défaut : Ouvrier)' },
      telephone: { type: 'string' },
      email: { type: 'string' },
    },
    required: ['sousTraitant', 'nom'],
  },
  summarize: async (args) => {
    const p = await preparerOuvrier(args)
    if (p.erreur) return `Création impossible : ${p.erreur}`
    return `Ajouter ${p.data!.prenom} ${p.data!.nom} (${p.data!.poste}) chez ${p.sousTraitantNom}.`
  },
  preview: async (args) => {
    const p = await preparerOuvrier(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return { action: 'creation', sousTraitant: p.sousTraitantNom, ouvrier: p.data }
  },
  execute: async (args) => {
    const p = await preparerOuvrier(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const o = await prisma.ouvrier.create({
      data: {
        id: `OUV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        ...p.data!,
        dateEntree: new Date(),
        sousTraitantId: p.sousTraitantId!,
        updatedAt: new Date(),
      },
      select: { id: true, prenom: true, nom: true },
    })
    return { succes: true, ouvrierId: o.id, ouvrier: `${o.prenom} ${o.nom}`.trim(), sousTraitant: p.sousTraitantNom }
  },
}

async function preparerModifOuvrier(args: Record<string, unknown>) {
  const st = await resolveSousTraitant(String(args.sousTraitant || ''))
  if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
  const o = await resolveOuvrier(st.value.id, String(args.ouvrier || ''))
  if (!o.ok || !o.value) return { erreur: o.message, candidats: o.candidats }
  const actuel = await prisma.ouvrier.findUnique({ where: { id: o.value.id } })
  if (!actuel) return { erreur: 'Ouvrier introuvable.' }
  const data: Record<string, unknown> = {}
  for (const k of ['prenom', 'nom', 'poste', 'telephone', 'email'] as const) {
    const v = texte(args[k])
    if (v !== undefined && v !== actuel[k]) data[k] = v
  }
  if (typeof args.actif === 'boolean' && args.actif !== actuel.actif) data.actif = args.actif
  return { id: actuel.id, libelle: `${actuel.prenom} ${actuel.nom}`.trim(), sousTraitantNom: st.value.nom, data }
}

export const modifierOuvrier: ToolDefinition = {
  name: 'modifier_ouvrier',
  description:
    'Corrige une personne d’un sous-traitant (prénom, nom, poste, téléphone, email) ou la marque partie (actif: false) / ' +
    'de retour (actif: true). Une personne partie disparaît du tableau des documents ; ses documents sont conservés.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      ouvrier: { type: 'string', description: 'Identifiant, nom ou prénom de l’ouvrier' },
      prenom: { type: 'string' },
      nom: { type: 'string' },
      poste: { type: 'string' },
      telephone: { type: 'string' },
      email: { type: 'string' },
      actif: { type: 'boolean', description: 'false = ne travaille plus pour ce sous-traitant' },
    },
    required: ['sousTraitant', 'ouvrier'],
  },
  summarize: async (args) => {
    const p = await preparerModifOuvrier(args)
    if (p.erreur) return `Modification impossible : ${p.erreur}`
    const champs = Object.keys(p.data!)
    return champs.length ? `Modifier ${p.libelle} (${p.sousTraitantNom}) : ${champs.join(', ')}.` : `Aucun changement sur ${p.libelle}.`
  },
  preview: async (args) => {
    const p = await preparerModifOuvrier(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return { action: Object.keys(p.data!).length ? 'mise_a_jour' : 'aucune', ouvrier: p.libelle, changements: p.data }
  },
  execute: async (args) => {
    const p = await preparerModifOuvrier(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    if (!Object.keys(p.data!).length) return { succes: true, info: 'Aucun changement.' }
    await prisma.ouvrier.update({ where: { id: p.id }, data: { ...p.data, updatedAt: new Date() } })
    return { succes: true, ouvrier: p.libelle, champsModifies: Object.keys(p.data!) }
  },
}

// ─── Documents de société ────────────────────────────────────────────────────

function doitRemplacerSociete(type: string, args: Record<string, unknown>) {
  if (typeof args.remplacer === 'boolean') return args.remplacer
  return TYPES_DOCUMENT_SOCIETE.find((t) => t.code === type)?.unique ?? false
}

async function preparerDocSociete(args: Record<string, unknown>) {
  if (args.cheminFichier && !args.fichierBase64) {
    return { erreur: 'Le serveur MCP local n’a pas transmis le fichier : mettre à jour/redémarrer le serveur MCP OpenBTP.' }
  }
  const st = await resolveSousTraitant(String(args.sousTraitant || ''))
  if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
  const type = String(args.type || '')
  if (!CODES_SOCIETE.includes(type)) return { erreur: `Type invalide. Valeurs : ${CODES_SOCIETE.join(', ')}.` }
  const decode = decoderFichier(String(args.fichierBase64 || ''), args.mime ? String(args.mime) : undefined)
  if (!decode.ok) return { erreur: decode.erreur }
  const date = parseDateExpiration(args.dateExpiration)
  if (!date.ok) return { erreur: date.erreur }
  const remplacer = doitRemplacerSociete(type, args)
  const ancien = remplacer
    ? await prisma.documentSousTraitant.findFirst({
        where: { soustraitantId: st.value.id, type, archive: false },
        select: { nom: true, dateExpiration: true },
        orderBy: { createdAt: 'desc' },
      })
    : null
  return { st: st.value, type, decode, date: date.date, remplacer, ancien }
}

export const ajouterDocumentSociete: ToolDefinition = {
  name: 'ajouter_document_societe',
  description:
    'Ajoute un document de la SOCIÉTÉ sous-traitante (extrait BCE, attestation ONSS / fiscale, assurance RC, contrat-cadre ' +
    'papier signé, statuts…). Fichier par cheminFichier (préféré, lu par le serveur MCP local) ou fichierBase64. ' +
    'Pour les types uniques, le document en vigueur est archivé (jamais supprimé). Rangé aussi sur le NAS.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      type: { type: 'string', enum: [...CODES_SOCIETE] },
      cheminFichier: { type: 'string', description: 'Chemin absolu du fichier sur cet ordinateur (préféré)' },
      fichierBase64: { type: 'string', description: 'Contenu base64 (data URI de préférence) si cheminFichier impossible' },
      mime: { type: 'string' },
      nomFichier: { type: 'string', description: "Nom d'origine du fichier" },
      dateExpiration: { type: 'string', description: 'Fin de validité, AAAA-MM-JJ' },
      remplacer: { type: 'boolean', description: 'Archiver le document en vigueur du même type (défaut : selon le type)' },
    },
    required: ['sousTraitant', 'type'],
  },
  summarize: async (args) => {
    const p = await preparerDocSociete(args)
    if (p.erreur) return `Ajout impossible : ${p.erreur}`
    return `Ajouter « ${libelleType(p.type!)} » au dossier société de ${p.st!.nom}${p.ancien ? ` — l'ancien (${p.ancien.nom}) sera archivé` : ''}.`
  },
  preview: async (args) => {
    const p = await preparerDocSociete(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      action: 'ajout',
      sousTraitant: p.st!.nom,
      type: libelleType(p.type!),
      dateExpiration: p.date ? p.date.toISOString().slice(0, 10) : null,
      ...(p.ancien ? { archivera: p.ancien.nom } : {}),
    }
  },
  execute: async (args) => {
    const p = await preparerDocSociete(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    const d = await enregistrerDocumentSociete(p.st!.id, {
      type: p.type!,
      contenu: p.decode!.buffer!,
      extension: p.decode!.extension!,
      nomOriginal: args.nomFichier ? String(args.nomFichier) : `${p.type}.${p.decode!.extension}`,
      dateExpiration: p.date,
      remplacer: p.remplacer,
    })
    return { succes: true, sousTraitant: p.st!.nom, documentId: d.id, documentsArchives: d.archives, nas: d.cheminNas || 'miroir NAS non configuré ou indisponible' }
  },
}

export const listeDocumentsSociete: ToolDefinition = {
  name: 'liste_documents_societe',
  description: 'Documents de la société sous-traitante : en vigueur et historique archivé.',
  parameters: {
    type: 'object',
    properties: { sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' } },
    required: ['sousTraitant'],
  },
  execute: async (args) => {
    const st = await resolveSousTraitant(String(args.sousTraitant || ''))
    if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
    const docs = await prisma.documentSousTraitant.findMany({
      where: { soustraitantId: st.value.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, type: true, nom: true, dateExpiration: true, archive: true, archiveLe: true },
    })
    const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)
    return {
      sousTraitant: st.value.nom,
      enVigueur: docs.filter((d) => !d.archive).map((d) => ({ id: d.id, type: libelleType(d.type), nom: d.nom, dateExpiration: jour(d.dateExpiration) })),
      archives: docs.filter((d) => d.archive).map((d) => ({ id: d.id, type: libelleType(d.type), nom: d.nom, archiveLe: jour(d.archiveLe) })),
    }
  },
}

// ─── Conformité ──────────────────────────────────────────────────────────────

export const conformiteDocuments: ToolDefinition = {
  name: 'conformite_documents',
  description:
    'Bilan des documents manquants ou expirés des sous-traitants actifs (ou d’un seul) : par personne et pour la société, ' +
    'selon les documents exigés pour chaque sous-traitant.',
  parameters: {
    type: 'object',
    properties: { sousTraitant: { type: 'string', description: 'Limiter à un sous-traitant (facultatif)' } },
  },
  execute: async (args) => {
    let soustraitantId: string | undefined
    if (args.sousTraitant) {
      const st = await resolveSousTraitant(String(args.sousTraitant))
      if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }
      soustraitantId = st.value.id
    }
    const conf = await conformiteSousTraitants({ soustraitantId })
    const probleme = (s: string) => s === 'manquant' || s === 'expire' || s === 'bientot'
    return {
      sousTraitants: conf.map((st) => ({
        nom: st.nom,
        contratCadre: st.contratSigne.statut === 'ok' ? `signé (fin ${st.contratSigne.dateFin})` : st.contratSigne.statut,
        societe: Object.entries(st.documentsSociete)
          .filter(([, c]) => c.requis && probleme(c.statut))
          .map(([code, c]) => `${libelleType(code)} : ${c.statut}`),
        personnes: st.ouvriers
          .map((o) => ({
            nom: `${o.prenom} ${o.nom}`.trim(),
            aCorriger: Object.entries(o.documents)
              .filter(([code, c]) => (c.requis || CODES_OUVRIER.includes(code)) && probleme(c.statut))
              .map(([code, c]) => `${libelleType(code)} : ${c.statut}${c.dateExpiration ? ` (${c.dateExpiration})` : ''}`),
          }))
          .filter((o) => o.aCorriger.length),
      })),
    }
  },
}

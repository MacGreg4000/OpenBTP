// Contacts des clients (interlocuteurs : conducteurs de travaux, acheteurs,
// comptabilité…).
//
// Usage visé : « mets à jour les contacts de Reco+ d'après mes emails et
// contrats » — Claude extrait les interlocuteurs de ses sources et envoie la
// liste en un appel à mettre_a_jour_contacts_client, qui reconnaît les
// contacts existants (email, sinon prénom + nom), complète/corrige et ajoute.
// Pas de suppression : un contact obsolète se corrige ou se note.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveClient } from './helpers'
import { emailFormatValide } from '@/lib/soustraitants/representant'

const CHAMPS = ['prenom', 'nom', 'fonction', 'email', 'telephone', 'notes'] as const
type Champ = (typeof CHAMPS)[number]
const MAX_CONTACTS = 50

/** Comparaison de noms insensible à la casse, aux accents et aux espaces. */
const cle = (s: string | null | undefined) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')

function texte(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  const s = String(v).trim()
  return s === '' ? undefined : s
}

interface ContactBD {
  id: string
  prenom: string
  nom: string
  fonction: string | null
  email: string | null
  telephone: string | null
  notes: string | null
}

/** Contact existant correspondant : même email, sinon même prénom + nom. */
function trouver(existants: ContactBD[], c: { prenom?: string | null; nom?: string | null; email?: string | null }) {
  if (c.email) {
    const e = c.email.toLowerCase()
    const parEmail = existants.find((x) => x.email && x.email.toLowerCase() === e)
    if (parEmail) return parEmail
  }
  if (c.nom) {
    const k = cle(`${c.prenom || ''}${c.nom}`)
    return existants.find((x) => cle(`${x.prenom}${x.nom}`) === k)
  }
  return undefined
}

async function clientEtContacts(ref: unknown) {
  const r = await resolveClient(String(ref || ''))
  if (!r.ok || !r.value) return { erreur: r.message || 'Client introuvable.', candidats: r.candidats }
  const contacts = await prisma.contact.findMany({
    where: { clientId: r.value.id },
    select: { id: true, prenom: true, nom: true, fonction: true, email: true, telephone: true, notes: true },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })
  return { client: r.value, contacts }
}

/** Résout un contact d'un client par id, email ou « prénom nom ». */
export async function resolveContactClient(
  clientId: string,
  ref: string
): Promise<{ contact?: ContactBD; erreur?: string; candidats?: { id: string; nom: string }[] }> {
  const r = String(ref || '').trim()
  if (!r) return { erreur: 'Contact non précisé.' }
  const contacts = await prisma.contact.findMany({
    where: { clientId },
    select: { id: true, prenom: true, nom: true, fonction: true, email: true, telephone: true, notes: true },
  })
  const parId = contacts.find((c) => c.id === r)
  if (parId) return { contact: parId }
  const parEmail = contacts.find((c) => c.email && c.email.toLowerCase() === r.toLowerCase())
  if (parEmail) return { contact: parEmail }
  const k = cle(r)
  const exacts = contacts.filter((c) => cle(`${c.prenom}${c.nom}`) === k || cle(`${c.nom}${c.prenom}`) === k)
  if (exacts.length === 1) return { contact: exacts[0] }
  const partiels = exacts.length ? exacts : contacts.filter((c) => cle(`${c.prenom} ${c.nom}`).includes(k))
  if (partiels.length === 1) return { contact: partiels[0] }
  if (partiels.length > 1) {
    return {
      erreur: `Plusieurs contacts correspondent à « ${r} ». Préciser.`,
      candidats: partiels.map((c) => ({ id: c.id, nom: `${c.prenom} ${c.nom}`.trim() })),
    }
  }
  return { erreur: `Aucun contact « ${r} » pour ce client.` }
}

// ─────────────────────────────────────────────────────────────────────────────

export const listeContactsClient: ToolDefinition = {
  name: 'liste_contacts_client',
  description: 'Liste les contacts (interlocuteurs) d’un client : prénom, nom, fonction, email, téléphone, notes.',
  parameters: {
    type: 'object',
    properties: { client: { type: 'string', description: 'Identifiant ou nom du client' } },
    required: ['client'],
  },
  execute: async (args) => {
    const r = await clientEtContacts(args.client)
    if ('erreur' in r) return { erreur: r.erreur, candidats: r.candidats }
    return { client: r.client.nom, total: r.contacts.length, contacts: r.contacts }
  },
}

// ─────────────────────────────────────────────────────────────────────────────

interface Operation {
  action: 'creation' | 'mise_a_jour' | 'inchange'
  contact: string
  id?: string
  data: Partial<Record<Champ, string | null>>
  avant?: Partial<Record<Champ, string | null>>
}

interface PreparationMaj {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  clientId?: string
  clientNom?: string
  operations?: Operation[]
}

async function preparerMaj(args: Record<string, unknown>): Promise<PreparationMaj> {
  const r = await clientEtContacts(args.client)
  if ('erreur' in r) return { erreur: r.erreur, candidats: r.candidats }
  const brutes = Array.isArray(args.contacts) ? (args.contacts as Record<string, unknown>[]) : []
  if (!brutes.length) return { erreur: 'Aucun contact fourni.' }
  if (brutes.length > MAX_CONTACTS) return { erreur: `Trop de contacts (${brutes.length}). Maximum ${MAX_CONTACTS} par appel.` }

  const existants = [...r.contacts]
  const operations: Operation[] = []
  for (let i = 0; i < brutes.length; i++) {
    const b = brutes[i] || {}
    const v: Partial<Record<Champ, string | null>> = {}
    for (const k of CHAMPS) {
      const t = texte(b[k])
      if (t !== undefined) v[k] = t
    }
    if (v.email) {
      v.email = v.email.toLowerCase()
      if (!emailFormatValide(v.email)) return { erreur: `Contact ${i + 1} : email invalide « ${v.email} ».` }
    }
    const libelle = [v.prenom, v.nom].filter(Boolean).join(' ') || v.email || `contact ${i + 1}`

    const existant = trouver(existants, v)
    if (!existant) {
      if (!v.nom) return { erreur: `Contact ${i + 1} (${libelle}) : nom obligatoire pour un nouveau contact.` }
      const data = { ...v, prenom: v.prenom ?? '' }
      operations.push({ action: 'creation', contact: libelle, data })
      // Évite un doublon si le même contact apparaît deux fois dans la liste
      existants.push({ id: `nouveau-${i}`, prenom: data.prenom || '', nom: data.nom!, fonction: data.fonction ?? null, email: data.email ?? null, telephone: data.telephone ?? null, notes: data.notes ?? null })
      continue
    }
    if (existant.id.startsWith('nouveau-')) continue

    const data: Partial<Record<Champ, string | null>> = {}
    const avant: Partial<Record<Champ, string | null>> = {}
    for (const k of CHAMPS) {
      if (v[k] === undefined) continue
      // Notes : ajoutées à la suite (jamais écrasées) ; autres champs : remplacés
      if (k === 'notes') {
        const ancien = existant.notes || ''
        if (v.notes && !ancien.includes(v.notes)) {
          data.notes = ancien ? `${ancien}\n${v.notes}` : v.notes
          avant.notes = existant.notes
        }
        continue
      }
      // Prénom / nom : une simple différence de casse ou d'accents (« HERION »
      // dans une signature d'email) ne doit pas écraser la graphie existante
      if ((k === 'prenom' || k === 'nom') && v[k] && cle(existant[k]) === cle(v[k])) continue
      if ((existant[k] ?? null) !== v[k]) {
        data[k] = v[k] as string | null
        avant[k] = existant[k] ?? null
      }
    }
    operations.push({
      action: Object.keys(data).length ? 'mise_a_jour' : 'inchange',
      contact: `${existant.prenom} ${existant.nom}`.trim(),
      id: existant.id,
      data,
      avant,
    })
  }
  return { clientId: r.client.id, clientNom: r.client.nom, operations }
}

function resume(ops: Operation[]) {
  const n = (a: Operation['action']) => ops.filter((o) => o.action === a).length
  return `${n('creation')} ajout(s), ${n('mise_a_jour')} mise(s) à jour, ${n('inchange')} inchangé(s)`
}

export const mettreAJourContactsClient: ToolDefinition = {
  name: 'mettre_a_jour_contacts_client',
  description:
    'Met à jour les contacts d’un client à partir d’une liste (par ex. extraite d’emails, de contrats, de signatures). ' +
    'Chaque contact est reconnu s’il existe déjà (même email, sinon même prénom + nom) : ses champs sont complétés ou ' +
    'corrigés avec les valeurs fournies (les notes sont ajoutées à la suite) ; sinon il est créé. Champ absent = inchangé, ' +
    'null = vider. Ne supprime jamais. Faire un dryRun pour montrer ajouts et modifications avant d’écrire. ' +
    'Ne fournir que des informations trouvées dans les sources, sans en inventer.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Identifiant ou nom du client (ex. Reco+)' },
      contacts: {
        type: 'array',
        description: `Contacts à ajouter ou mettre à jour (max ${MAX_CONTACTS}).`,
        items: {
          type: 'object',
          properties: {
            prenom: { type: 'string' },
            nom: { type: 'string', description: 'Obligatoire pour un nouveau contact' },
            fonction: { type: 'string', description: 'Ex. Conducteur de travaux, Acheteur, Comptabilité' },
            email: { type: 'string' },
            telephone: { type: 'string', description: 'GSM ou téléphone fixe' },
            notes: { type: 'string', description: 'Ex. chantiers suivis, source de l’information' },
          },
        },
      },
    },
    required: ['client', 'contacts'],
  },
  summarize: async (args) => {
    const p = await preparerMaj(args)
    if (p.erreur) return `Mise à jour impossible : ${p.erreur}`
    return `Contacts de « ${p.clientNom} » : ${resume(p.operations!)}.`
  },
  preview: async (args) => {
    const p = await preparerMaj(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return {
      client: p.clientNom,
      resume: resume(p.operations!),
      operations: p.operations!.filter((o) => o.action !== 'inchange'),
    }
  },
  execute: async (args) => {
    const p = await preparerMaj(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    await prisma.$transaction(async (tx) => {
      for (const o of p.operations!) {
        if (o.action === 'creation') {
          await tx.contact.create({
            data: {
              clientId: p.clientId!,
              prenom: o.data.prenom || '',
              nom: o.data.nom!,
              fonction: o.data.fonction ?? null,
              email: o.data.email ?? null,
              telephone: o.data.telephone ?? null,
              notes: o.data.notes ?? null,
            },
          })
        } else if (o.action === 'mise_a_jour') {
          // prénom / nom ne peuvent pas être vidés (colonnes obligatoires)
          const data = { ...o.data }
          if (data.prenom === null) data.prenom = ''
          if (data.nom === null) delete data.nom
          await tx.contact.update({ where: { id: o.id }, data: data as Record<string, string | null> })
        }
      }
    })
    return { succes: true, client: p.clientNom, resume: resume(p.operations!) }
  },
}

// ─────────────────────────────────────────────────────────────────────────────

async function preparerModif(args: Record<string, unknown>) {
  const r = await resolveClient(String(args.client || ''))
  if (!r.ok || !r.value) return { erreur: r.message || 'Client introuvable.', candidats: r.candidats }
  const c = await resolveContactClient(r.value.id, String(args.contact || ''))
  if (!c.contact) return { erreur: c.erreur, candidats: c.candidats }
  const data: Partial<Record<Champ, string | null>> = {}
  for (const k of CHAMPS) {
    const t = texte(args[k])
    if (t === undefined) continue
    if (k === 'nom' && t === null) return { erreur: 'Le nom du contact ne peut pas être vidé.' }
    if (k === 'email' && t) {
      if (!emailFormatValide(t.toLowerCase())) return { erreur: `Email invalide « ${t} ».` }
      data.email = t.toLowerCase()
      continue
    }
    if ((c.contact[k] ?? null) !== t) data[k] = k === 'prenom' && t === null ? '' : t
  }
  return { clientNom: r.value.nom, contact: c.contact, data }
}

export const modifierContactClient: ToolDefinition = {
  name: 'modifier_contact_client',
  description:
    'Corrige un contact précis d’un client (désigné par son id, son email ou « prénom nom »). Seuls les champs fournis ' +
    'changent ; null pour vider un champ (sauf le nom). Les notes fournies REMPLACENT les notes existantes.',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      client: { type: 'string', description: 'Identifiant ou nom du client' },
      contact: { type: 'string', description: 'Id, email ou « prénom nom » du contact' },
      prenom: { type: 'string' },
      nom: { type: 'string' },
      fonction: { type: 'string' },
      email: { type: 'string' },
      telephone: { type: 'string' },
      notes: { type: 'string' },
    },
    required: ['client', 'contact'],
  },
  summarize: async (args) => {
    const p = await preparerModif(args)
    if (p.erreur) return `Modification impossible : ${p.erreur}`
    const champs = Object.keys(p.data!)
    const nom = `${p.contact!.prenom} ${p.contact!.nom}`.trim()
    return champs.length ? `Modifier le contact « ${nom} » (${p.clientNom}) : ${champs.join(', ')}.` : `Aucun changement sur « ${nom} ».`
  },
  preview: async (args) => {
    const p = await preparerModif(args)
    if (p.erreur) return { action: 'aucune', erreur: p.erreur, candidats: p.candidats }
    return { action: Object.keys(p.data!).length ? 'mise_a_jour' : 'aucune', contact: p.contact, changements: p.data }
  },
  execute: async (args) => {
    const p = await preparerModif(args)
    if (p.erreur) return { erreur: p.erreur, candidats: p.candidats }
    if (!Object.keys(p.data!).length) return { succes: true, info: 'Aucun changement.' }
    await prisma.contact.update({ where: { id: p.contact!.id }, data: p.data as Record<string, string | null> })
    return { succes: true, contact: `${p.contact!.prenom} ${p.contact!.nom}`.trim(), champsModifies: Object.keys(p.data!) }
  },
}

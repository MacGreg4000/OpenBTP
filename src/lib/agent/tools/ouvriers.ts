// Documents d'ouvriers (carte d'identité, LIMOSA, A1, attestations…).
//
// Volontairement SANS outil de suppression : le registre (src/lib/agent/
// tools/index.ts) pose comme principe qu'aucun outil d'écriture ne détruit
// de données — décision prise tôt dans ce projet et gardée ici aussi, alors
// même qu'un document mal uploadé est plus facilement remplaçable qu'un
// chantier ou une commande. La suppression reste un geste humain, dans
// l'interface.
//
// Le fichier lui-même n'est PAS remplaçable via `modifier` — seuls le type et
// la date d'expiration le sont, à l'image de la seule correction qu'un
// formulaire web permettrait sans tout ré-uploader. Un fichier erroné se
// corrige en ajoutant le bon document ; l'ancien reste jusqu'à suppression
// manuelle par un humain.

import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveOuvrier, resolveSousTraitant } from './helpers'

// Identique à src/app/api/sous-traitants/[id]/ouvriers/[ouvrierId]/documents/route.ts —
// deux listes qui divergeraient rendraient un document valide dans un sens,
// refusé dans l'autre, selon qu'il a été créé par l'agent ou par l'interface.
const TYPES_AUTORISES = [
  'carte_identite',
  'limosa',
  'a1',
  'livre_parts',
  'attestation_onss',
  'permis_travail',
  'diplome',
  'certificat_medical',
  'autre',
] as const

const EXTENSIONS_AUTORISEES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
}

// 10 Mo décodés : largement suffisant pour un scan ou une photo de document,
// et une limite dure évite qu'un envoi malformé n'épuise la mémoire du
// conteneur avant même d'atteindre l'écriture disque.
const TAILLE_MAX_OCTETS = 10 * 1024 * 1024

interface FichierDecode {
  ok: boolean
  buffer?: Buffer
  extension?: string
  erreur?: string
}

/**
 * Décode un `data:<mime>;base64,<...>` ou un base64 nu (mime fourni à part).
 *
 * Type à champs optionnels plutôt qu'union discriminée `{ok:true,...}|{ok:false,...}` :
 * ce projet compile avec `strict: false` (donc `strictNullChecks` désactivé), qui
 * empêche TypeScript de rétrécir correctement une union sur un littéral booléen —
 * `if (!x.ok) x.erreur` échoue alors à la compilation. Même convention que
 * `ResolveResult` dans helpers.ts.
 */
function decoderFichier(fichierBase64: string, mimeExplicite?: string): FichierDecode {
  const brut = String(fichierBase64 || '').trim()
  if (!brut) return { ok: false, erreur: 'fichierBase64 est vide.' }

  // [\s\S] plutôt que le flag /s (dotAll) : la cible TS du projet est ES2017.
  const matchDataUri = brut.match(/^data:([^;]+);base64,([\s\S]+)$/)
  const mime = (matchDataUri ? matchDataUri[1] : mimeExplicite || '').toLowerCase().trim()
  const donnees = matchDataUri ? matchDataUri[2] : brut

  const extension = EXTENSIONS_AUTORISEES[mime]
  if (!extension) {
    return {
      ok: false,
      erreur: mime
        ? `Type de fichier non accepté : « ${mime} ». Formats acceptés : PDF, JPEG, PNG, HEIC.`
        : "Impossible de déterminer le type du fichier : fournis-le en data URI (« data:application/pdf;base64,... ») ou précise le paramètre mime.",
    }
  }

  let buffer: Buffer
  try {
    buffer = Buffer.from(donnees, 'base64')
  } catch {
    return { ok: false, erreur: 'Contenu base64 invalide.' }
  }
  if (buffer.length === 0) return { ok: false, erreur: 'Le fichier décodé est vide.' }
  if (buffer.length > TAILLE_MAX_OCTETS) {
    return {
      ok: false,
      erreur: `Fichier trop volumineux (${(buffer.length / 1024 / 1024).toFixed(1)} Mo, maximum 10 Mo).`,
    }
  }

  return { ok: true, buffer, extension }
}

interface DateExpirationParsee {
  ok: boolean
  /** Résultat valide : Date pour une échéance fournie, `null` si absente/effacée. */
  date?: Date | null
  erreur?: string
}

/** Valide « AAAA-MM-JJ » sans dépendre du fuseau du serveur pour l'interprétation. */
function parseDateExpiration(valeur: unknown): DateExpirationParsee {
  if (valeur === undefined || valeur === null || valeur === '') return { ok: true, date: null }
  const s = String(valeur).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, erreur: `dateExpiration invalide : « ${s} ». Format attendu AAAA-MM-JJ.` }
  }
  const date = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return { ok: false, erreur: `dateExpiration invalide : « ${s} ».` }
  return { ok: true, date }
}

interface CibleOuvrier {
  erreur?: string
  candidats?: { id: string; nom: string }[]
  sousTraitantId?: string
  sousTraitantNom?: string
  ouvrierId?: string
  ouvrierNom?: string
}

async function resoudreOuvrierCible(args: Record<string, unknown>): Promise<CibleOuvrier> {
  const st = await resolveSousTraitant(String(args.sousTraitant || ''))
  if (!st.ok || !st.value) return { erreur: st.message, candidats: st.candidats }

  const ouv = await resolveOuvrier(st.value.id, String(args.ouvrier || ''))
  if (!ouv.ok || !ouv.value) return { erreur: ouv.message, candidats: ouv.candidats }

  return {
    sousTraitantId: st.value.id,
    sousTraitantNom: st.value.nom,
    ouvrierId: ouv.value.id,
    ouvrierNom: `${ouv.value.prenom} ${ouv.value.nom}`,
  }
}

export const ajouterDocumentOuvrier: ToolDefinition = {
  name: 'ajouter_document_ouvrier',
  description:
    "Ajoute un document (carte d'identité, LIMOSA, A1, attestation ONSS, permis de travail, diplôme, certificat médical…) au dossier d'un ouvrier d'un sous-traitant. Le fichier est fourni en base64.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      ouvrier: { type: 'string', description: "Identifiant, nom ou prénom de l'ouvrier" },
      type: { type: 'string', description: 'Type de document', enum: [...TYPES_AUTORISES] },
      fichierBase64: {
        type: 'string',
        description:
          'Contenu du fichier encodé en base64. Idéalement en data URI (« data:application/pdf;base64,... ») ; sinon préciser « mime ».',
      },
      mime: {
        type: 'string',
        description:
          'Type MIME du fichier (application/pdf, image/jpeg, image/png, image/heic) — requis seulement si fichierBase64 n’est pas une data URI.',
      },
      nomFichier: {
        type: 'string',
        description: "Nom d'origine du fichier, pour affichage (ex. carte-identite.pdf)",
      },
      dateExpiration: {
        type: 'string',
        description: "Date d'expiration du document, format AAAA-MM-JJ (facultatif)",
      },
    },
    required: ['sousTraitant', 'ouvrier', 'type', 'fichierBase64'],
  },
  summarize: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return `Ajout de document — ${cible.erreur}`
    return `Ajouter un document « ${String(args.type)} » au dossier de ${cible.ouvrierNom} (${cible.sousTraitantNom})`
  },
  preview: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { action: 'aucune', erreur: cible.erreur, candidats: cible.candidats }

    const type = String(args.type || '')
    if (!TYPES_AUTORISES.includes(type as (typeof TYPES_AUTORISES)[number])) {
      return { action: 'aucune', erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
    }

    const decode = decoderFichier(String(args.fichierBase64 || ''), args.mime ? String(args.mime) : undefined)
    if (!decode.ok) return { action: 'aucune', erreur: decode.erreur }

    const dateRes = parseDateExpiration(args.dateExpiration)
    if (!dateRes.ok) return { action: 'aucune', erreur: dateRes.erreur }

    return {
      action: 'ajout',
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      type,
      tailleFichier: `${((decode.buffer?.length ?? 0) / 1024).toFixed(1)} Ko`,
      extensionDetectee: decode.extension,
      dateExpiration: dateRes.date ? dateRes.date.toISOString().slice(0, 10) : null,
    }
  },
  execute: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { erreur: cible.erreur, candidats: cible.candidats }

    const type = String(args.type || '')
    if (!TYPES_AUTORISES.includes(type as (typeof TYPES_AUTORISES)[number])) {
      return { erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
    }

    const decode = decoderFichier(String(args.fichierBase64 || ''), args.mime ? String(args.mime) : undefined)
    if (!decode.ok) return { erreur: decode.erreur }

    const dateRes = parseDateExpiration(args.dateExpiration)
    if (!dateRes.ok) return { erreur: dateRes.erreur }

    // Même arborescence que l'upload web : un document créé par l'agent doit
    // être indiscernable, au même endroit, d'un document créé depuis l'interface.
    const dossier = join(process.cwd(), 'public', 'uploads', 'documents', 'ouvriers', cible.ouvrierId!)
    if (!existsSync(dossier)) await mkdir(dossier, { recursive: true })

    const nomFichier = `${type}_${Date.now()}.${decode.extension}`
    await writeFile(join(dossier, nomFichier), decode.buffer!)

    const document = await prisma.documentOuvrier.create({
      data: {
        id: randomUUID(),
        nom: args.nomFichier ? String(args.nomFichier) : nomFichier,
        type,
        url: `/uploads/documents/ouvriers/${cible.ouvrierId}/${nomFichier}`,
        dateExpiration: dateRes.date,
        ouvrierId: cible.ouvrierId!,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      select: { id: true, url: true },
    })

    return {
      succes: true,
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      documentId: document.id,
      url: document.url,
    }
  },
}

export const modifierDocumentOuvrier: ToolDefinition = {
  name: 'modifier_document_ouvrier',
  description:
    "Corrige le type ou la date d'expiration d'un document déjà existant dans le dossier d'un ouvrier. Ne remplace PAS le fichier — pour ça, ajouter un nouveau document. Fusion partielle : un champ non fourni reste inchangé.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      ouvrier: { type: 'string', description: "Identifiant, nom ou prénom de l'ouvrier" },
      documentId: {
        type: 'string',
        description: "Identifiant du document à modifier (obtenu via liste_documents_ouvrier)",
      },
      type: { type: 'string', description: 'Nouveau type de document (facultatif)', enum: [...TYPES_AUTORISES] },
      dateExpiration: {
        type: 'string',
        description:
          "Nouvelle date d'expiration, format AAAA-MM-JJ. Envoyer null pour l'effacer (facultatif).",
      },
    },
    required: ['sousTraitant', 'ouvrier', 'documentId'],
  },
  summarize: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return `Modification de document — ${cible.erreur}`
    return `Modifier le document ${String(args.documentId)} de ${cible.ouvrierNom} (${cible.sousTraitantNom})`
  },
  preview: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { action: 'aucune', erreur: cible.erreur, candidats: cible.candidats }

    const document = await prisma.documentOuvrier.findFirst({
      where: { id: String(args.documentId || ''), ouvrierId: cible.ouvrierId },
    })
    if (!document) return { action: 'aucune', erreur: "Document introuvable pour cet ouvrier." }

    if (args.type !== undefined && !TYPES_AUTORISES.includes(String(args.type) as (typeof TYPES_AUTORISES)[number])) {
      return { action: 'aucune', erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
    }
    let nouvelleDateExpiration: string | null | undefined
    if (args.dateExpiration !== undefined) {
      const dateRes = parseDateExpiration(args.dateExpiration)
      if (!dateRes.ok) return { action: 'aucune', erreur: dateRes.erreur }
      nouvelleDateExpiration = dateRes.date ? dateRes.date.toISOString().slice(0, 10) : null
    }

    return {
      action: 'modification',
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      document: document.nom,
      avant: {
        type: document.type,
        dateExpiration: document.dateExpiration ? document.dateExpiration.toISOString().slice(0, 10) : null,
      },
      apres: {
        type: args.type !== undefined ? String(args.type) : document.type,
        dateExpiration:
          nouvelleDateExpiration !== undefined
            ? nouvelleDateExpiration
            : document.dateExpiration
              ? document.dateExpiration.toISOString().slice(0, 10)
              : null,
      },
    }
  },
  execute: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { erreur: cible.erreur, candidats: cible.candidats }

    const document = await prisma.documentOuvrier.findFirst({
      where: { id: String(args.documentId || ''), ouvrierId: cible.ouvrierId },
    })
    if (!document) return { erreur: "Document introuvable pour cet ouvrier." }

    const data: { type?: string; dateExpiration?: Date | null } = {}

    if (args.type !== undefined) {
      const type = String(args.type)
      if (!TYPES_AUTORISES.includes(type as (typeof TYPES_AUTORISES)[number])) {
        return { erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
      }
      data.type = type
    }

    if (args.dateExpiration !== undefined) {
      const dateRes = parseDateExpiration(args.dateExpiration)
      if (!dateRes.ok) return { erreur: dateRes.erreur }
      data.dateExpiration = dateRes.date
    }

    if (Object.keys(data).length === 0) {
      return { erreur: 'Aucun champ à modifier (type ou dateExpiration).' }
    }

    await prisma.documentOuvrier.update({ where: { id: document.id }, data })

    return {
      succes: true,
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      documentId: document.id,
      champsModifies: Object.keys(data),
    }
  },
}

export const listeDocumentsOuvrier: ToolDefinition = {
  name: 'liste_documents_ouvrier',
  description:
    "Liste les documents déjà déposés dans le dossier d'un ouvrier d'un sous-traitant (type, date d'expiration, identifiant du document).",
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      ouvrier: { type: 'string', description: "Identifiant, nom ou prénom de l'ouvrier" },
    },
    required: ['sousTraitant', 'ouvrier'],
  },
  execute: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { erreur: cible.erreur, candidats: cible.candidats }

    const documents = await prisma.documentOuvrier.findMany({
      where: { ouvrierId: cible.ouvrierId },
      select: { id: true, nom: true, type: true, dateExpiration: true, url: true },
      orderBy: { createdAt: 'desc' },
    })

    return {
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      documents: documents.map((d) => ({
        id: d.id,
        nom: d.nom,
        type: d.type,
        dateExpiration: d.dateExpiration ? d.dateExpiration.toISOString().slice(0, 10) : null,
        url: d.url,
      })),
    }
  },
}

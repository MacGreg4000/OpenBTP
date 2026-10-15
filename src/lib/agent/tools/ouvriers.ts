// Documents d'ouvriers (carte d'identité, LIMOSA, A1, attestations…).
//
// Volontairement SANS outil de suppression : le registre (src/lib/agent/
// tools/index.ts) pose comme principe qu'aucun outil d'écriture ne détruit
// de données — décision prise tôt dans ce projet et gardée ici aussi, alors
// même qu'un document mal uploadé est plus facilement remplaçable qu'un
// chantier ou une commande. La suppression reste un geste humain, dans
// l'interface.
//
// Remplacement : un nouveau document d'un type « unique » (carte d'identité,
// A1, Limosa…) ARCHIVE le précédent — jamais de suppression, l'historique
// reste consultable et sert de preuve. Tout passe par
// src/lib/documents/stockage.ts, qui recopie aussi le document sur le NAS.
//
// Fichier : soit `cheminFichier` (chemin sur l'ordinateur de l'utilisateur,
// lu et transmis par le serveur MCP local — pas de base64 dans la
// conversation), soit `fichierBase64`.

import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveOuvrier, resolveSousTraitant } from './helpers'
import { CODES_OUVRIER, TYPES_DOCUMENT_OUVRIER } from '@/lib/documents/types'
import { enregistrerDocumentOuvrier, renommerDocumentOuvrierNas } from '@/lib/documents/stockage'

const TYPES_AUTORISES = CODES_OUVRIER

const EXTENSIONS_AUTORISEES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
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
export function decoderFichier(fichierBase64: string, mimeExplicite?: string): FichierDecode {
  const brut = String(fichierBase64 || '').trim()
  if (!brut) return { ok: false, erreur: 'Aucun fichier : fournir cheminFichier (chemin local) ou fichierBase64.' }

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
export function parseDateExpiration(valeur: unknown): DateExpirationParsee {
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

/** Document en vigueur du même type (sera archivé si le type est « unique »). */
async function documentRemplace(ouvrierId: string, type: string, remplacer: boolean) {
  if (!remplacer) return null
  return prisma.documentOuvrier.findFirst({
    where: { ouvrierId, type, archive: false },
    select: { id: true, nom: true, dateExpiration: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

function doitRemplacer(type: string, args: Record<string, unknown>): boolean {
  if (typeof args.remplacer === 'boolean') return args.remplacer
  return TYPES_DOCUMENT_OUVRIER.find((t) => t.code === type)?.unique ?? false
}

export const ajouterDocumentOuvrier: ToolDefinition = {
  name: 'ajouter_document_ouvrier',
  description:
    "Ajoute un document au dossier d'un ouvrier d'un sous-traitant (carte d'identité / titre de séjour, A1, Limosa, " +
    'attestation ONSS, formation sécurité, permis de travail, certificat médical, livre des parts…). ' +
    'Fournir de préférence cheminFichier (chemin du fichier sur cet ordinateur, ex. /Volumes/Secotech/...) — le serveur MCP ' +
    'le lit lui-même ; sinon fichierBase64. Pour les types uniques (ID, A1, Limosa…), le document en vigueur est ARCHIVÉ ' +
    '(jamais supprimé). Le document est aussi rangé automatiquement sur le NAS. Toujours renseigner dateExpiration quand ' +
    'le document en porte une (Limosa : date de fin de la période ; A1 : date de fin de validité).',
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      sousTraitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      ouvrier: { type: 'string', description: "Identifiant, nom ou prénom de l'ouvrier (voir liste_ouvriers ; creer_ouvrier s'il n'existe pas)" },
      type: { type: 'string', description: 'Type de document', enum: [...TYPES_AUTORISES] },
      cheminFichier: {
        type: 'string',
        description: 'Chemin absolu du fichier sur cet ordinateur (lu par le serveur MCP local). Préféré à fichierBase64.',
      },
      fichierBase64: {
        type: 'string',
        description: 'Contenu du fichier en base64 (data URI de préférence) — seulement si cheminFichier est impossible.',
      },
      mime: { type: 'string', description: 'Type MIME si fichierBase64 n’est pas une data URI' },
      nomFichier: { type: 'string', description: "Nom d'origine du fichier (affichage)" },
      dateExpiration: { type: 'string', description: "Date d'expiration / fin de validité, AAAA-MM-JJ" },
      remplacer: {
        type: 'boolean',
        description: 'Archiver le document en vigueur du même type (défaut : oui pour les types uniques, non pour diplôme / autre)',
      },
      precision: {
        type: 'string',
        description: 'Précision dans le nom de fichier : « recto », « verso », « annexe 8 », « carte belge E », « page 2 »… Obligatoire quand plusieurs fichiers du même type coexistent (recto / verso).',
      },
    },
    required: ['sousTraitant', 'ouvrier', 'type'],
  },
  summarize: async (args) => {
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return `Ajout de document — ${cible.erreur}`
    const type = String(args.type || '')
    const ancien = await documentRemplace(cible.ouvrierId!, type, doitRemplacer(type, args))
    return (
      `Ajouter « ${type} » au dossier de ${cible.ouvrierNom} (${cible.sousTraitantNom})` +
      (args.dateExpiration ? `, valable jusqu'au ${String(args.dateExpiration)}` : '') +
      (ancien ? ` — l'ancien document (${ancien.nom}) sera archivé.` : '.')
    )
  },
  preview: async (args) => {
    if (args.cheminFichier && !args.fichierBase64) {
      return { action: 'aucune', erreur: 'Le serveur MCP local n’a pas transmis le fichier : mettre à jour/redémarrer le serveur MCP OpenBTP.' }
    }
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { action: 'aucune', erreur: cible.erreur, candidats: cible.candidats }
    const type = String(args.type || '')
    if (!TYPES_AUTORISES.includes(type)) return { action: 'aucune', erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
    const decode = decoderFichier(String(args.fichierBase64 || ''), args.mime ? String(args.mime) : undefined)
    if (!decode.ok) return { action: 'aucune', erreur: decode.erreur }
    const dateRes = parseDateExpiration(args.dateExpiration)
    if (!dateRes.ok) return { action: 'aucune', erreur: dateRes.erreur }
    const ancien = await documentRemplace(cible.ouvrierId!, type, doitRemplacer(type, args))
    return {
      action: 'ajout',
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      type,
      fichier: args.nomFichier || null,
      tailleFichier: `${((decode.buffer?.length ?? 0) / 1024).toFixed(1)} Ko`,
      dateExpiration: dateRes.date ? dateRes.date.toISOString().slice(0, 10) : null,
      ...(ancien
        ? { archivera: { nom: ancien.nom, dateExpiration: ancien.dateExpiration?.toISOString().slice(0, 10) ?? null } }
        : {}),
    }
  },
  execute: async (args) => {
    if (args.cheminFichier && !args.fichierBase64) {
      return { erreur: 'Le serveur MCP local n’a pas transmis le fichier : mettre à jour/redémarrer le serveur MCP OpenBTP.' }
    }
    const cible = await resoudreOuvrierCible(args)
    if (cible.erreur) return { erreur: cible.erreur, candidats: cible.candidats }
    const type = String(args.type || '')
    if (!TYPES_AUTORISES.includes(type)) return { erreur: `Type invalide. Valeurs : ${TYPES_AUTORISES.join(', ')}.` }
    const decode = decoderFichier(String(args.fichierBase64 || ''), args.mime ? String(args.mime) : undefined)
    if (!decode.ok) return { erreur: decode.erreur }
    const dateRes = parseDateExpiration(args.dateExpiration)
    if (!dateRes.ok) return { erreur: dateRes.erreur }

    const document = await enregistrerDocumentOuvrier(cible.ouvrierId!, {
      type,
      contenu: decode.buffer!,
      extension: decode.extension!,
      nomOriginal: args.nomFichier ? String(args.nomFichier) : `${type}.${decode.extension}`,
      dateExpiration: dateRes.date,
      remplacer: doitRemplacer(type, args),
      precision: args.precision ? String(args.precision) : null,
    })
    return {
      succes: true,
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      documentId: document.id,
      documentsArchives: document.archives,
      nas: document.cheminNas || 'miroir NAS non configuré ou indisponible',
    }
  },
}

export const modifierDocumentOuvrier: ToolDefinition = {
  name: 'modifier_document_ouvrier',
  description:
    "Corrige le type, la date d'expiration ou la précision du nom (recto, verso…) d'un document existant ; le fichier est renommé sur le NAS. Ne remplace PAS le fichier — pour ça, ajouter un nouveau document. Fusion partielle : un champ non fourni reste inchangé.",
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
      precision: {
        type: 'string',
        description: 'Précision du nom de fichier sur le NAS : « recto », « verso », « annexe 8 », « carte belge E »… (le fichier est renommé)',
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

    const data: { type?: string; dateExpiration?: Date | null; precision?: string | null } = {}
    if (args.precision !== undefined) data.precision = args.precision ? String(args.precision).trim() : null

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
      return { erreur: 'Aucun champ à modifier (type, dateExpiration ou precision).' }
    }

    await prisma.documentOuvrier.update({ where: { id: document.id }, data })
    // Le nom du fichier sur le NAS reflète type, précision et date : le renommer
    const nas = await renommerDocumentOuvrierNas(document.id)

    return {
      succes: true,
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      documentId: document.id,
      champsModifies: Object.keys(data),
      ...(nas ? { nas } : {}),
    }
  },
}

export const listeDocumentsOuvrier: ToolDefinition = {
  name: 'liste_documents_ouvrier',
  description:
    "Liste les documents du dossier d'un ouvrier : ceux en vigueur et l'historique archivé (type, date d'expiration, identifiant).",
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
      select: { id: true, nom: true, type: true, dateExpiration: true, url: true, archive: true, archiveLe: true },
      orderBy: { createdAt: 'desc' },
    })
    const jour = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

    return {
      sousTraitant: cible.sousTraitantNom,
      ouvrier: cible.ouvrierNom,
      enVigueur: documents
        .filter((d) => !d.archive)
        .map((d) => ({ id: d.id, nom: d.nom, type: d.type, dateExpiration: jour(d.dateExpiration), url: d.url })),
      archives: documents
        .filter((d) => d.archive)
        .map((d) => ({ id: d.id, nom: d.nom, type: d.type, dateExpiration: jour(d.dateExpiration), archiveLe: jour(d.archiveLe) })),
    }
  },
}

import { prisma } from '@/lib/prisma/client'
import { readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { generateRapportPdfBuffer } from '@/lib/pdf/rapport-pdf'
import { canonicalTagName, dedupeTags, normalizeTagKey } from '@/lib/utils/tags'

const PUBLIC_DIR = join(process.cwd(), 'public')

export interface RapportChantier {
  id: number
  chantierId: string
  nomChantier: string
  clientNom: string | null
  adresseChantier: string | null
}

export interface RapportNoteInput {
  contenu: string
  tags?: string[]
}

export interface RapportPhotoInput {
  /** URL source de la photo déjà uploadée (/uploads/...). */
  url: string
  annotation?: string
  tags?: string[]
  documentId?: number | null
}

export interface RapportPersonne {
  id?: string
  nom: string
  fonction: string
}

/** Supprime le fichier public correspondant à une URL /uploads/… (absent = ignoré). */
export async function supprimerFichierPublic(url: string | null | undefined) {
  if (!url || !url.startsWith('/uploads/') || url.includes('..')) return
  try {
    await unlink(join(PUBLIC_DIR, url))
  } catch {
    // fichier déjà absent : ignorer
  }
}

/**
 * Copie une photo (déjà uploadée sous /uploads/...) vers l'emplacement durable
 * du rapport et renvoie l'URL publique durable. Une photo déjà rangée dans le
 * dossier du rapport est gardée telle quelle (modification d'un rapport). Le
 * nom de fichier est unique : on n'écrase jamais une photo existante. En cas
 * d'échec de lecture, on conserve l'URL source (le PDF la sautera).
 */
export async function persistRapportPhoto(
  rapportId: string,
  sourceUrl: string,
  ordre: number
): Promise<string> {
  try {
    if (!sourceUrl || !sourceUrl.startsWith('/uploads/') || sourceUrl.includes('..')) return sourceUrl
    if (sourceUrl.startsWith(`/uploads/rapports/${rapportId}/`)) return sourceUrl
    const buffer = await readFile(join(PUBLIC_DIR, sourceUrl))
    const ext = (sourceUrl.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const dir = join(PUBLIC_DIR, 'uploads', 'rapports', rapportId)
    await mkdir(dir, { recursive: true })
    const filename = `photo_${ordre + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`
    await writeFile(join(dir, filename), buffer)
    return `/uploads/rapports/${rapportId}/${filename}`
  } catch (err) {
    console.warn(`⚠️ persistRapportPhoto: copie durable impossible pour ${sourceUrl}:`, err)
    return sourceUrl
  }
}

/**
 * Union normalisée (dédupliquée, insensible casse/accents) de tous les tags
 * portés par les notes et les photos d'un rapport.
 */
export function collectRapportTags(
  notes: RapportNoteInput[],
  photos: RapportPhotoInput[]
): string[] {
  const all: string[] = []
  for (const n of notes) all.push(...(n.tags || []))
  for (const p of photos) all.push(...(p.tags || []))
  return dedupeTags(all)
}

/**
 * Clé de fichier « sûre » pour une variante par tag (nom de fichier).
 */
function safeTagSlug(tag: string): string {
  return normalizeTagKey(tag).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'tag'
}

interface GenerateDocsArgs {
  rapportId: string
  chantier: RapportChantier
  createdBy: string
  date: string
  personnes: RapportPersonne[]
  notes: Array<{ contenu: string; tags: string[] }>
  photos: Array<{ url: string; annotation: string; tags: string[] }>
}

/**
 * Génère le PDF général + un PDF par tag et crée les `Document` correspondants
 * (liés au rapport via `rapportId`, chaque variante portant son `tagKey`).
 * Tout ou rien : si un PDF échoue, ceux déjà créés sont retirés avant de
 * relancer l'erreur. Renvoie les documents créés.
 */
export async function generateRapportDocuments(args: GenerateDocsArgs) {
  const { rapportId, chantier, createdBy, date, personnes, notes, photos } = args

  const notesForPdf = notes.map((n, i) => ({ id: String(i + 1), contenu: n.contenu, tags: n.tags }))
  const photosForPdf = photos.map(p => ({ preview: p.url, url: p.url, annotation: p.annotation, tags: p.tags }))
  const chantierPdf = {
    id: chantier.id,
    chantierId: chantier.chantierId,
    nomChantier: chantier.nomChantier,
    clientNom: chantier.clientNom || 'Client non spécifié',
    adresseChantier: chantier.adresseChantier || '',
  }

  const docsDir = join(PUBLIC_DIR, 'uploads', 'documents', chantier.chantierId)
  await mkdir(docsDir, { recursive: true })

  const dateStr = date.split('T')[0]
  const safeNom = chantier.nomChantier.replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '-').replace(/-+/g, '-')

  const created: Array<{ id: number; type: string; url: string; tagKey: string | null }> = []

  const writePdf = async (opts: {
    type: string
    tagFilter?: string
    tagKey?: string | null
    filenameSuffix: string
  }) => {
    const buffer = await generateRapportPdfBuffer({
      chantier: chantierPdf, date, personnes, notes: notesForPdf, photos: photosForPdf, tagFilter: opts.tagFilter,
    })
    const filename = `rapport-visite-${safeNom}-${opts.filenameSuffix}-${dateStr}-${Date.now()}.pdf`
    const url = `/uploads/documents/${chantier.chantierId}/${filename}`
    await writeFile(join(docsDir, filename), buffer)
    try {
      const doc = await prisma.document.create({
        data: {
          nom: filename,
          type: opts.type,
          url,
          taille: buffer.length,
          mimeType: 'application/pdf',
          chantierId: chantier.chantierId,
          createdBy,
          rapportId,
          tagKey: opts.tagKey ?? null,
          updatedAt: new Date(),
        },
        select: { id: true, type: true, url: true, tagKey: true },
      })
      created.push(doc)
    } catch (err) {
      await supprimerFichierPublic(url)
      throw err
    }
  }

  try {
    // PDF général
    await writePdf({ type: 'rapport-visite-general', filenameSuffix: 'general' })

    // Une variante par tag
    const tags = collectRapportTags(
      notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
      photos.map(p => ({ url: p.url, tags: p.tags }))
    )
    for (const tag of tags) {
      await writePdf({
        type: `rapport-visite-tag-${safeTagSlug(tag)}`,
        tagFilter: tag,
        tagKey: normalizeTagKey(tag),
        filenameSuffix: `tag-${safeTagSlug(tag)}`,
      })
    }
  } catch (err) {
    await prisma.document.deleteMany({ where: { id: { in: created.map(d => d.id) } } }).catch(() => {})
    for (const d of created) await supprimerFichierPublic(d.url)
    throw err
  }

  return created
}

/**
 * Normalise/canonicalise les tags d'entrée d'une note ou photo.
 */
export function cleanTags(tags?: string[]): string[] {
  return dedupeTags((tags || []).map(canonicalTagName))
}

export interface EnregistrerRapportArgs {
  /** Absent = création d'un nouveau rapport. */
  rapportId?: string
  chantier: RapportChantier
  createdBy: string
  date: string
  personnes: RapportPersonne[]
  notes: RapportNoteInput[]
  photos: RapportPhotoInput[]
  /**
   * Anciens rapports « documents » (avant le modèle Rapport) que celui-ci
   * remplace : retirés seulement une fois le nouveau rapport enregistré.
   */
  remplaceDocuments?: number[]
}

export class RapportInvalideError extends Error {}

function nettoyerEntrees(args: EnregistrerRapportArgs) {
  const personnes = (args.personnes || [])
    .filter(p => p && typeof p.nom === 'string' && p.nom.trim())
    .map(p => ({ id: p.id, nom: p.nom.trim(), fonction: (p.fonction || '').trim() }))
  const notes = (args.notes || [])
    .filter(n => n && typeof n.contenu === 'string' && n.contenu.trim())
    .map((n, i) => ({ contenu: n.contenu.trim(), tags: cleanTags(n.tags), ordre: i }))
  const photos = (args.photos || []).filter(p => p && typeof p.url === 'string' && p.url.startsWith('/uploads/'))
  if (notes.length === 0 && photos.length === 0) {
    throw new RapportInvalideError('Ajoutez au moins une note ou une photo')
  }
  const date = new Date(args.date)
  if (Number.isNaN(date.getTime())) throw new RapportInvalideError('Date du rapport invalide')
  return { personnes, notes, photos, date }
}

/**
 * Crée ou met à jour un rapport de visite et (re)génère ses PDF.
 *
 * L'ancien contenu n'est retiré qu'après la génération réussie des nouveaux
 * PDF : un échec (PDF, base) laisse le rapport existant intact, et une
 * création ratée ne laisse pas de rapport à moitié fait.
 */
export async function enregistrerRapport(args: EnregistrerRapportArgs) {
  const { personnes, notes, photos: photosInput, date } = nettoyerEntrees(args)
  const { chantier, createdBy } = args

  const existant = args.rapportId
    ? await prisma.rapport.findUnique({
        where: { id: args.rapportId },
        include: {
          documents: { select: { id: true, url: true } },
          photos: { select: { url: true } },
        },
      })
    : null
  if (args.rapportId && !existant) throw new RapportInvalideError('Rapport non trouvé')
  if (existant && existant.chantierId !== chantier.chantierId) throw new RapportInvalideError('Rapport non trouvé')

  const rapportId: string = existant
    ? existant.id
    : (await prisma.rapport.create({
        data: { chantierId: chantier.chantierId, date, createdBy, personnes: personnes as unknown as object },
        select: { id: true },
      })).id

  const photosCopiees: string[] = []
  try {
    // 1) Photos : copie durable dans le dossier du rapport
    const photos: Array<{ url: string; annotation: string; tags: string[]; ordre: number; documentId: number | null }> = []
    for (let i = 0; i < photosInput.length; i++) {
      const p = photosInput[i]
      const url = await persistRapportPhoto(rapportId, p.url, i)
      if (url !== p.url) photosCopiees.push(url)
      photos.push({ url, annotation: p.annotation || '', tags: cleanTags(p.tags), ordre: i, documentId: p.documentId ?? null })
    }

    // 2) Nouveaux PDF (tout ou rien)
    const nouveauxDocs = await generateRapportDocuments({
      rapportId,
      chantier,
      createdBy,
      date: date.toISOString(),
      personnes,
      notes: notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
      photos,
    })

    // 3) Bascule du contenu en une transaction
    const anciensDocIds = (existant?.documents || []).map(d => d.id)
    try {
      await prisma.$transaction(async (tx: typeof prisma) => {
        if (anciensDocIds.length > 0) await tx.document.deleteMany({ where: { id: { in: anciensDocIds } } })
        await tx.rapportNote.deleteMany({ where: { rapportId } })
        await tx.rapportPhoto.deleteMany({ where: { rapportId } })
        await tx.rapport.update({ where: { id: rapportId }, data: { date, personnes: personnes as unknown as object } })
        if (notes.length > 0) {
          await tx.rapportNote.createMany({
            data: notes.map(n => ({ rapportId, contenu: n.contenu, tags: n.tags, ordre: n.ordre })),
          })
        }
        if (photos.length > 0) {
          await tx.rapportPhoto.createMany({
            data: photos.map(p => ({ rapportId, url: p.url, annotation: p.annotation, tags: p.tags, ordre: p.ordre, documentId: p.documentId })),
          })
        }
      })
    } catch (err) {
      await prisma.document.deleteMany({ where: { id: { in: nouveauxDocs.map(d => d.id) } } }).catch(() => {})
      for (const d of nouveauxDocs) await supprimerFichierPublic(d.url)
      throw err
    }

    // 4) Ménage des anciens fichiers (après coup : un échec ici est sans gravité)
    if (existant) {
      for (const d of existant.documents) await supprimerFichierPublic(d.url)
      const gardees = new Set(photos.map(p => p.url))
      for (const ph of existant.photos) {
        if (!gardees.has(ph.url) && ph.url.startsWith(`/uploads/rapports/${rapportId}/`)) await supprimerFichierPublic(ph.url)
      }
    }
    if (args.remplaceDocuments && args.remplaceDocuments.length > 0) {
      await retirerAnciensRapportsDocuments(chantier.chantierId, args.remplaceDocuments)
    }

    return rapportId
  } catch (err) {
    for (const url of photosCopiees) await supprimerFichierPublic(url)
    if (!existant) await prisma.rapport.delete({ where: { id: rapportId } }).catch(() => {})
    throw err
  }
}

/**
 * Retire d'anciens rapports enregistrés comme simples documents (format
 * d'avant le modèle Rapport), une fois remplacés par un rapport durable.
 * Seuls les PDF de rapport de visite du chantier, non liés à un Rapport,
 * sont concernés.
 */
async function retirerAnciensRapportsDocuments(chantierId: string, ids: number[]) {
  try {
    const docs = await prisma.document.findMany({
      where: { id: { in: ids.map(Number).filter(Number.isFinite) }, chantierId, rapportId: null },
      select: { id: true, url: true, type: true },
    })
    const cibles = docs.filter((d: { type: string | null }) => typeof d.type === 'string' && d.type.startsWith('rapport-visite'))
    if (cibles.length === 0) return
    await prisma.document.deleteMany({ where: { id: { in: cibles.map((d: { id: number }) => d.id) } } })
    for (const d of cibles) await supprimerFichierPublic(d.url)
  } catch (err) {
    console.warn('⚠️ Retrait des anciens rapports impossible :', err)
  }
}

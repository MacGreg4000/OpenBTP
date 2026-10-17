// Photos et fichiers joints à un état d'avancement client. Stockés sous
// public/uploads/etats-avancement/<id état>/ (servis par la route authentifiée
// /api/documents/serve via la réécriture /uploads), joignables au mail d'envoi.

import { mkdir, readFile, unlink, writeFile } from 'fs/promises'
import { randomUUID } from 'crypto'
import { extname, join } from 'path'
import { prisma } from '@/lib/prisma/client'

const RACINE = join(process.cwd(), 'public')
export const TAILLE_MAX_FICHIER = 25 * 1024 * 1024
/** Total joint au mail (PDF de l'état compris) au-delà duquel les serveurs refusent souvent le message. */
export const TAILLE_MAX_MAIL = 20 * 1024 * 1024

const EXTENSIONS: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.heic': 'image/heic', '.heif': 'image/heif', '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain', '.csv': 'text/csv',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime',
}
export const EXTENSIONS_ACCEPTEES = Object.keys(EXTENSIONS)

/** État client à partir de l'identifiant lisible du chantier et du numéro de l'état. */
export async function trouverEtat(chantierLisible: string, numero: string) {
  const chantier = await prisma.chantier.findUnique({ where: { chantierId: chantierLisible }, select: { id: true } })
  if (!chantier) return null
  const n = parseInt(numero, 10)
  if (!Number.isFinite(n)) return null
  return prisma.etatAvancement.findFirst({
    where: { chantierId: chantier.id, numero: n },
    select: { id: true, numero: true, estFinalise: true },
  })
}

export function listerPieces(etatAvancementId: number) {
  return prisma.pieceJointeEtatAvancement.findMany({
    where: { etatAvancementId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, nom: true, url: true, mime: true, taille: true, ajoutePar: true, createdAt: true },
  })
}

export async function ajouterPiece(etatAvancementId: number, fichier: File, ajoutePar?: string) {
  const ext = extname(fichier.name || '').toLowerCase()
  const mime = EXTENSIONS[ext]
  if (!mime) throw new ErreurPiece(`Type de fichier non accepté : ${fichier.name}`)
  if (fichier.size > TAILLE_MAX_FICHIER) throw new ErreurPiece(`${fichier.name} dépasse ${TAILLE_MAX_FICHIER / 1048576} Mo`)
  const dossier = join('uploads', 'etats-avancement', String(etatAvancementId))
  await mkdir(join(RACINE, dossier), { recursive: true })
  const nomFichier = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`
  await writeFile(join(RACINE, dossier, nomFichier), Buffer.from(await fichier.arrayBuffer()))
  return prisma.pieceJointeEtatAvancement.create({
    data: {
      etatAvancementId,
      nom: (fichier.name || `fichier${ext}`).slice(0, 190),
      url: `/${dossier.split('\\').join('/')}/${nomFichier}`,
      mime,
      taille: fichier.size,
      ajoutePar: ajoutePar || null,
    },
    select: { id: true, nom: true, url: true, mime: true, taille: true, ajoutePar: true, createdAt: true },
  })
}

export async function supprimerPiece(etatAvancementId: number, pieceId: number): Promise<boolean> {
  const piece = await prisma.pieceJointeEtatAvancement.findFirst({ where: { id: pieceId, etatAvancementId } })
  if (!piece) return false
  await prisma.pieceJointeEtatAvancement.delete({ where: { id: piece.id } })
  await unlink(join(RACINE, piece.url.replace(/^\//, ''))).catch(() => undefined)
  return true
}

/** Pièces choisies pour le mail, lues sur disque (les fichiers absents sont ignorés et signalés). */
export async function piecesPourMail(etatAvancementId: number, ids: number[]) {
  if (!ids.length) return { attachments: [], manquants: [] as string[] }
  const pieces = await prisma.pieceJointeEtatAvancement.findMany({
    where: { etatAvancementId, id: { in: ids } },
    orderBy: { createdAt: 'asc' },
  })
  const attachments: { filename: string; content: Buffer; contentType: string }[] = []
  const manquants: string[] = []
  for (const p of pieces) {
    try {
      attachments.push({ filename: p.nom, content: await readFile(join(RACINE, p.url.replace(/^\//, ''))), contentType: p.mime })
    } catch {
      manquants.push(p.nom)
    }
  }
  return { attachments, manquants }
}

export class ErreurPiece extends Error {}

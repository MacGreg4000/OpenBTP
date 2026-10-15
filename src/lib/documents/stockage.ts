// Enregistrement centralisé des documents des sous-traitants (ouvriers et
// sociétés) : TOUTES les entrées (bureau, portail, MCP / Claude) passent ici.
//
//  1. fichier écrit dans public/uploads (servi par OpenBTP) ;
//  2. si le type est « unique », le document en vigueur du même type est
//     ARCHIVÉ (jamais supprimé — preuve en cas de contrôle) ;
//  3. copie miroir sur le NAS, structure lisible :
//       <Société (TVA)>/Ouvriers/<Prénom Nom>/<Type> - <Prénom Nom> - valable jusqu'au AAAA-MM-JJ.pdf
//       <Société (TVA)>/Société/<Type> - … .pdf
//     et l'ancien fichier déplacé dans le sous-dossier _Archives.
//
// Le miroir est actif si NAS_DOCUMENTS_PATH est défini (dossier monté dans le
// conteneur). Une erreur de miroir n'empêche jamais l'enregistrement dans
// OpenBTP : elle est journalisée et rattrapable (resynchroniserMiroirNas).

import { mkdir, writeFile, rename, copyFile, access } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma/client'
import { TYPES_DOCUMENT_OUVRIER, TYPES_DOCUMENT_SOCIETE } from './types'

const RACINE_UPLOADS = join(process.cwd(), 'public')
const racineNas = () => (process.env.NAS_DOCUMENTS_PATH || '').trim()

/** Nom de fichier / dossier sûr sur le NAS (Windows et macOS compris). */
export function nettoyerNom(s: string): string {
  return String(s || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/, '')
    .trim()
    .slice(0, 120) || 'Sans nom'
}

const isoJour = (d: Date) => d.toISOString().slice(0, 10)
const typeOuvrier = (code: string) => TYPES_DOCUMENT_OUVRIER.find((t) => t.code === code)
const typeSociete = (code: string) => TYPES_DOCUMENT_SOCIETE.find((t) => t.code === code)

function dossierSociete(st: { nom: string; tva: string | null }): string {
  return nettoyerNom(st.tva ? `${st.nom} (${st.tva.replace(/\s+/g, '')})` : st.nom)
}

async function existe(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

/** Chemin libre : ajoute « (2) », « (3) »… si le nom est déjà pris. */
async function cheminLibre(p: string): Promise<string> {
  if (!(await existe(p))) return p
  const ext = extname(p)
  const base = p.slice(0, -ext.length || undefined)
  for (let i = 2; i < 100; i++) {
    const c = `${base} (${i})${ext}`
    if (!(await existe(c))) return c
  }
  return `${base} (${Date.now()})${ext}`
}

/** Copie un fichier d'OpenBTP vers le NAS. Renvoie le chemin relatif NAS, ou null. */
async function copierVersNas(urlOpenBtp: string, relatif: string): Promise<string | null> {
  const racine = racineNas()
  if (!racine) return null
  try {
    const cible = await cheminLibre(join(racine, relatif))
    await mkdir(dirname(cible), { recursive: true })
    await copyFile(join(RACINE_UPLOADS, urlOpenBtp.replace(/^\//, '')), cible)
    return cible.slice(racine.length).replace(/^[/\\]+/, '')
  } catch (e) {
    console.error(`⚠️ [MIROIR NAS] Copie impossible (${relatif}) :`, e)
    return null
  }
}

/** Déplace un fichier du NAS dans le _Archives de son dossier, préfixé de la date. */
async function archiverSurNas(cheminNas: string | null | undefined): Promise<void> {
  const racine = racineNas()
  if (!racine || !cheminNas) return
  try {
    const source = join(racine, cheminNas)
    if (!(await existe(source))) return
    const cible = await cheminLibre(join(dirname(source), '_Archives', `${isoJour(new Date())} - ${basename(source)}`))
    await mkdir(dirname(cible), { recursive: true })
    await rename(source, cible)
  } catch (e) {
    console.error(`⚠️ [MIROIR NAS] Archivage impossible (${cheminNas}) :`, e)
  }
}

function nomFichierNas(libelleCourt: string, titulaire: string, dateExpiration: Date | null, ext: string) {
  const fin = dateExpiration ? ` - valable jusqu'au ${isoJour(dateExpiration)}` : ''
  return nettoyerNom(`${libelleCourt} - ${titulaire}${fin}`) + `.${ext}`
}

interface EntreeDocument {
  type: string
  contenu: Buffer
  /** Extension sûre (déjà validée par l'appelant) : pdf, jpg, png, heic… */
  extension: string
  nomOriginal: string
  dateExpiration?: Date | null
  /** Remplacer (archiver) le document en vigueur du même type. Défaut : selon le type. */
  remplacer?: boolean
}

// ─── Ouvriers ────────────────────────────────────────────────────────────────

export async function enregistrerDocumentOuvrier(ouvrierId: string, e: EntreeDocument) {
  const ouvrier = await prisma.ouvrier.findUnique({
    where: { id: ouvrierId },
    select: { id: true, nom: true, prenom: true, sousTraitantId: true },
  })
  if (!ouvrier) throw new Error('Ouvrier introuvable')
  const st = await prisma.soustraitant.findUnique({ where: { id: ouvrier.sousTraitantId }, select: { nom: true, tva: true } })
  const def = typeOuvrier(e.type)
  if (!def) throw new Error(`Type de document inconnu : ${e.type}`)
  const remplacer = e.remplacer ?? def.unique

  const dossier = join('uploads', 'documents', 'ouvriers', ouvrierId)
  await mkdir(join(RACINE_UPLOADS, dossier), { recursive: true })
  const fichier = `${e.type}_${Date.now()}.${e.extension}`
  await writeFile(join(RACINE_UPLOADS, dossier, fichier), e.contenu)
  const url = `/${dossier}/${fichier}`.replace(/\\/g, '/')

  const anciens = remplacer
    ? await prisma.documentOuvrier.findMany({ where: { ouvrierId, type: e.type, archive: false }, select: { id: true, cheminNas: true } })
    : []
  const maintenant = new Date()
  const document = await prisma.$transaction(async (tx) => {
    if (anciens.length) {
      await tx.documentOuvrier.updateMany({ where: { id: { in: anciens.map((a) => a.id) } }, data: { archive: true, archiveLe: maintenant } })
    }
    return tx.documentOuvrier.create({
      data: {
        id: crypto.randomUUID(),
        nom: e.nomOriginal,
        type: e.type,
        url,
        dateExpiration: e.dateExpiration ?? null,
        ouvrierId,
        createdAt: maintenant,
        updatedAt: maintenant,
      },
    })
  })

  // Miroir NAS (best effort)
  for (const a of anciens) await archiverSurNas(a.cheminNas)
  const titulaire = `${ouvrier.prenom} ${ouvrier.nom}`.trim()
  const relatif = join(
    st ? dossierSociete(st) : 'Sans société',
    'Ouvriers',
    nettoyerNom(titulaire),
    nomFichierNas(def.court === 'ID' ? "Carte d'identité" : def.libelle.split(/ \(| \//)[0], titulaire, document.dateExpiration, e.extension)
  )
  const cheminNas = await copierVersNas(url, relatif)
  if (cheminNas) await prisma.documentOuvrier.update({ where: { id: document.id }, data: { cheminNas } })

  return { ...document, cheminNas, archives: anciens.length }
}

/** Archive un document (au lieu de le supprimer). */
export async function archiverDocumentOuvrier(documentId: string) {
  const d = await prisma.documentOuvrier.update({
    where: { id: documentId },
    data: { archive: true, archiveLe: new Date() },
    select: { id: true, cheminNas: true },
  })
  await archiverSurNas(d.cheminNas)
  return d
}

// ─── Sociétés ────────────────────────────────────────────────────────────────

export async function enregistrerDocumentSociete(soustraitantId: string, e: EntreeDocument) {
  const st = await prisma.soustraitant.findUnique({ where: { id: soustraitantId }, select: { id: true, nom: true, tva: true } })
  if (!st) throw new Error('Sous-traitant introuvable')
  const def = typeSociete(e.type)
  if (!def) throw new Error(`Type de document société inconnu : ${e.type}`)
  const remplacer = e.remplacer ?? def.unique

  const dossier = join('uploads', 'documents', 'soustraitants', soustraitantId)
  await mkdir(join(RACINE_UPLOADS, dossier), { recursive: true })
  const fichier = `${e.type}_${Date.now()}.${e.extension}`
  await writeFile(join(RACINE_UPLOADS, dossier, fichier), e.contenu)
  const url = `/${dossier}/${fichier}`.replace(/\\/g, '/')

  const anciens = remplacer
    ? await prisma.documentSousTraitant.findMany({ where: { soustraitantId, type: e.type, archive: false }, select: { id: true, cheminNas: true } })
    : []
  const maintenant = new Date()
  const document = await prisma.$transaction(async (tx) => {
    if (anciens.length) {
      await tx.documentSousTraitant.updateMany({ where: { id: { in: anciens.map((a) => a.id) } }, data: { archive: true, archiveLe: maintenant } })
    }
    return tx.documentSousTraitant.create({
      data: { soustraitantId, type: e.type, nom: e.nomOriginal, url, dateExpiration: e.dateExpiration ?? null },
    })
  })

  for (const a of anciens) await archiverSurNas(a.cheminNas)
  const relatif = join(dossierSociete(st), 'Société', nomFichierNas(def.libelle.split(/ \(| \//)[0], st.nom, document.dateExpiration, e.extension))
  const cheminNas = await copierVersNas(url, relatif)
  if (cheminNas) await prisma.documentSousTraitant.update({ where: { id: document.id }, data: { cheminNas } })

  return { ...document, cheminNas, archives: anciens.length }
}

export async function archiverDocumentSociete(documentId: string) {
  const d = await prisma.documentSousTraitant.update({
    where: { id: documentId },
    data: { archive: true, archiveLe: new Date() },
    select: { id: true, cheminNas: true },
  })
  await archiverSurNas(d.cheminNas)
  return d
}

// ─── Rattrapage ──────────────────────────────────────────────────────────────

/**
 * Copie sur le NAS les documents en vigueur qui n'y sont pas encore (premier
 * démarrage du miroir, NAS momentanément indisponible…).
 */
export async function resynchroniserMiroirNas(): Promise<{ copies: number; echecs: number; actif: boolean }> {
  if (!racineNas()) return { copies: 0, echecs: 0, actif: false }
  let copies = 0
  let echecs = 0
  const docsOuvriers = await prisma.documentOuvrier.findMany({
    where: { archive: false, cheminNas: null },
    select: {
      id: true, type: true, url: true, dateExpiration: true,
      Ouvrier: { select: { nom: true, prenom: true, sousTraitantId: true } },
    },
  })
  const societes = new Map<string, { nom: string; tva: string | null }>(
    (await prisma.soustraitant.findMany({ select: { id: true, nom: true, tva: true } })).map((x) => [x.id, { nom: x.nom, tva: x.tva }])
  )
  for (const d of docsOuvriers) {
    const st = societes.get(d.Ouvrier.sousTraitantId)
    const def = typeOuvrier(d.type)
    const titulaire = `${d.Ouvrier.prenom} ${d.Ouvrier.nom}`.trim()
    const ext = (extname(d.url).slice(1) || 'pdf').toLowerCase()
    const relatif = join(
      st ? dossierSociete(st) : 'Sans société',
      'Ouvriers',
      nettoyerNom(titulaire),
      nomFichierNas(def ? (def.court === 'ID' ? "Carte d'identité" : def.libelle.split(/ \(| \//)[0]) : d.type, titulaire, d.dateExpiration, ext)
    )
    const c = await copierVersNas(d.url, relatif)
    if (c) {
      await prisma.documentOuvrier.update({ where: { id: d.id }, data: { cheminNas: c } })
      copies++
    } else echecs++
  }
  const docsSociete = await prisma.documentSousTraitant.findMany({
    where: { archive: false, cheminNas: null },
    select: { id: true, type: true, url: true, dateExpiration: true, soustraitant: { select: { nom: true, tva: true } } },
  })
  for (const d of docsSociete) {
    const def = typeSociete(d.type)
    const ext = (extname(d.url).slice(1) || 'pdf').toLowerCase()
    const relatif = join(dossierSociete(d.soustraitant), 'Société', nomFichierNas(def ? def.libelle.split(/ \(| \//)[0] : d.type, d.soustraitant.nom, d.dateExpiration, ext))
    const c = await copierVersNas(d.url, relatif)
    if (c) {
      await prisma.documentSousTraitant.update({ where: { id: d.id }, data: { cheminNas: c } })
      copies++
    } else echecs++
  }
  return { copies, echecs, actif: true }
}

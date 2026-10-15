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

/** Nom du type tel qu'il apparaît dans les noms de fichiers du NAS. */
const NOMS_NAS: Record<string, string> = {
  carte_identite: "Carte d'identité",
  attestation_onss: 'Sécurité sociale',
  certificat_medical: 'Formation sécurité',
  a1: 'A1',
  limosa: 'Limosa L-1',
}
function nomType(code: string): string {
  if (NOMS_NAS[code]) return NOMS_NAS[code]
  const def = typeOuvrier(code) || typeSociete(code)
  return def ? def.libelle.split(/ \(| \//)[0] : code
}

/** « Carte d'identité (verso) - Lair Roque - valable jusqu'au 2029-04-04.jpg » */
function nomFichierNas(type: string, titulaire: string, dateExpiration: Date | null, ext: string, precision?: string | null) {
  const fin = dateExpiration ? ` - valable jusqu'au ${isoJour(dateExpiration)}` : ''
  const prec = precision && precision.trim() ? ` (${precision.trim()})` : ''
  return nettoyerNom(`${nomType(type)}${prec} - ${titulaire}${fin}`) + `.${ext}`
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
  /** Précision ajoutée au nom de fichier : « recto », « verso », « annexe 8 »… */
  precision?: string | null
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
        precision: e.precision?.trim() || null,
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
    nomFichierNas(e.type, titulaire, document.dateExpiration, e.extension, e.precision)
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
      data: { soustraitantId, type: e.type, nom: e.nomOriginal, url, dateExpiration: e.dateExpiration ?? null, precision: e.precision?.trim() || null },
    })
  })

  for (const a of anciens) await archiverSurNas(a.cheminNas)
  const relatif = join(dossierSociete(st), 'Société', nomFichierNas(e.type, st.nom, document.dateExpiration, e.extension, e.precision))
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
      id: true, type: true, url: true, dateExpiration: true, precision: true,
      Ouvrier: { select: { nom: true, prenom: true, sousTraitantId: true } },
    },
  })
  const societes = new Map<string, { nom: string; tva: string | null }>(
    (await prisma.soustraitant.findMany({ select: { id: true, nom: true, tva: true } })).map((x) => [x.id, { nom: x.nom, tva: x.tva }])
  )
  for (const d of docsOuvriers) {
    const st = societes.get(d.Ouvrier.sousTraitantId)
    const titulaire = `${d.Ouvrier.prenom} ${d.Ouvrier.nom}`.trim()
    const ext = (extname(d.url).slice(1) || 'pdf').toLowerCase()
    const relatif = join(
      st ? dossierSociete(st) : 'Sans société',
      'Ouvriers',
      nettoyerNom(titulaire),
      nomFichierNas(d.type, titulaire, d.dateExpiration, ext, d.precision)
    )
    const c = await copierVersNas(d.url, relatif)
    if (c) {
      await prisma.documentOuvrier.update({ where: { id: d.id }, data: { cheminNas: c } })
      copies++
    } else echecs++
  }
  const docsSociete = await prisma.documentSousTraitant.findMany({
    where: { archive: false, cheminNas: null },
    select: { id: true, type: true, url: true, dateExpiration: true, precision: true, soustraitant: { select: { nom: true, tva: true } } },
  })
  for (const d of docsSociete) {
    const ext = (extname(d.url).slice(1) || 'pdf').toLowerCase()
    const relatif = join(dossierSociete(d.soustraitant), 'Société', nomFichierNas(d.type, d.soustraitant.nom, d.dateExpiration, ext, d.precision))
    const c = await copierVersNas(d.url, relatif)
    if (c) {
      await prisma.documentSousTraitant.update({ where: { id: d.id }, data: { cheminNas: c } })
      copies++
    } else echecs++
  }
  return { copies, echecs, actif: true }
}

// ─── Renommage (précision, type ou date corrigés) ────────────────────────────

/**
 * Recalcule le nom NAS d'un document de personne en vigueur (après correction
 * de la précision, du type ou de la date) et renomme le fichier dans son dossier.
 */
export async function renommerDocumentOuvrierNas(documentId: string): Promise<string | null> {
  const racine = racineNas()
  const d = await prisma.documentOuvrier.findUnique({
    where: { id: documentId },
    select: { id: true, type: true, url: true, dateExpiration: true, precision: true, cheminNas: true, archive: true,
      Ouvrier: { select: { nom: true, prenom: true } } },
  })
  if (!racine || !d || !d.cheminNas || d.archive) return d?.cheminNas ?? null
  try {
    const source = join(racine, d.cheminNas)
    if (!(await existe(source))) return d.cheminNas
    const ext = (extname(d.url).slice(1) || 'pdf').toLowerCase()
    const titulaire = `${d.Ouvrier.prenom} ${d.Ouvrier.nom}`.trim()
    const nom = nomFichierNas(d.type, titulaire, d.dateExpiration, ext, d.precision)
    if (basename(source) === nom) return d.cheminNas
    const cible = await cheminLibre(join(dirname(source), nom))
    await rename(source, cible)
    const cheminNas = cible.slice(racine.length).replace(/^[/\\]+/, '')
    await prisma.documentOuvrier.update({ where: { id: d.id }, data: { cheminNas } })
    return cheminNas
  } catch (e) {
    console.error(`⚠️ [MIROIR NAS] Renommage impossible (${d.cheminNas}) :`, e)
    return d.cheminNas
  }
}

// Déclaration de sous-traitance au client, depuis la fiche d'un chantier.
//
// Deux modes, au choix de l'utilisateur selon les exigences du client :
//  - « simple »    : mail de demande de déclaration (nom + n° d'entreprise de
//                    chaque sous-traitant) ;
//  - « documents » : même mail, avec en pièces jointes les documents EN VIGUEUR
//                    (non archivés, non expirés) exigés de chaque personne active
//                    du sous-traitant (règles ONSS/ADEB, voir documents/types.ts)
//                    et les attestations de la société.
//
// Les pièces sont choisies automatiquement : ce qui manque ou est expiré est
// signalé dans la modale avant l'envoi, jamais joint en silence. Par défaut,
// elles partent dans UN fichier ZIP (un dossier par société, puis par personne)
// plutôt qu'en dizaines de pièces jointes.

import { readFile, stat } from 'fs/promises'
import { extname, join } from 'path'
import JSZip from 'jszip'
import { prisma } from '@/lib/prisma/client'
import { envoyerEmailRappel } from '@/lib/email-sender'
import { echapperHtml, encadre, ficheInfos, gabaritEmail, liste, paragraphe, sousTitre } from '@/lib/email/gabarit'
import { societeEmail } from '@/lib/email/societe'
import { documentsRequisPersonne, libelleType } from '@/lib/documents/types'

export type ModeDeclaration = 'simple' | 'documents'

const REPLY_TO = 'info@secotech.be'
const RACINE_UPLOADS = join(process.cwd(), 'public')
/** Au-delà, la plupart des serveurs de messagerie refusent le mail. */
export const TAILLE_MAX_PIECES = 20 * 1024 * 1024

/** Documents de la société joints en mode « documents » (le contrat-cadre et « autre » restent internes). */
const TYPES_SOCIETE_JOINTS = ['extrait_bce', 'attestation_onss_societe', 'attestation_fiscale', 'assurance_rc']

export interface PieceJointe {
  soustraitantId: string
  personne: string | null
  type: string
  libelle: string
  url: string
  nomFichier: string
  taille: number
}

export interface Manque {
  soustraitantId: string
  personne: string | null
  libelle: string
  raison: 'manquant' | 'expire' | 'fichier_introuvable'
}

export interface PiecesSousTraitant {
  id: string
  nom: string
  tva: string | null
  personnes: string[]
  pieces: PieceJointe[]
  manques: Manque[]
}

const nettoyer = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim()

async function tailleFichier(url: string): Promise<number | null> {
  try {
    return (await stat(join(RACINE_UPLOADS, url.replace(/^\//, '')))).size
  } catch {
    return null
  }
}

/**
 * Pièces qui seraient jointes pour chaque sous-traitant, et ce qui manque.
 * Sert à l'aperçu de la modale et à l'envoi (même calcul des deux côtés).
 */
export async function piecesDeclaration(soustraitantIds: string[]): Promise<PiecesSousTraitant[]> {
  if (!soustraitantIds.length) return []
  const maintenant = Date.now()
  const valide = (d: { dateExpiration: Date | null }) => !d.dateExpiration || d.dateExpiration.getTime() >= maintenant

  const societes = await prisma.soustraitant.findMany({
    where: { id: { in: soustraitantIds } },
    select: {
      id: true, nom: true, tva: true, documentsRequisOuvrier: true,
      documentsSociete: {
        where: { archive: false, type: { in: TYPES_SOCIETE_JOINTS } },
        select: { id: true, type: true, url: true, dateExpiration: true, precision: true },
      },
    },
  })
  const ouvriers = await prisma.ouvrier.findMany({
    where: { sousTraitantId: { in: soustraitantIds }, actif: true },
    select: {
      id: true, nom: true, prenom: true, statut: true, nationalite: true, sousTraitantId: true,
      DocumentOuvrier: {
        where: { archive: false },
        select: { id: true, type: true, url: true, dateExpiration: true, precision: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  const resultat: PiecesSousTraitant[] = []
  // Respecter l'ordre de sélection
  for (const id of soustraitantIds) {
    const st = societes.find((s) => s.id === id)
    if (!st) continue
    const pieces: PieceJointe[] = []
    const manques: Manque[] = []
    const nomSte = nettoyer(st.nom)

    const ajouter = async (
      d: { type: string; url: string; precision: string | null },
      personne: string | null
    ) => {
      const taille = await tailleFichier(d.url)
      const libelle = libelleType(d.type)
      if (taille === null) {
        manques.push({ soustraitantId: st.id, personne, libelle, raison: 'fichier_introuvable' })
        return
      }
      const court = libelle.split(' (')[0].split(' / ')[0]
      const nomFichier = nettoyer(
        `${nomSte}${personne ? ` - ${personne}` : ''} - ${court}${d.precision ? ` (${d.precision})` : ''}`
      ) + (extname(d.url) || '.pdf')
      pieces.push({ soustraitantId: st.id, personne, type: d.type, libelle, url: d.url, nomFichier, taille })
    }

    // Documents de la société : ceux qui existent et sont valables
    for (const code of TYPES_SOCIETE_JOINTS) {
      for (const d of st.documentsSociete.filter((x) => x.type === code)) {
        if (valide(d)) await ajouter(d, null)
        else manques.push({ soustraitantId: st.id, personne: null, libelle: libelleType(code), raison: 'expire' })
      }
    }

    const personnes: string[] = []
    for (const o of ouvriers.filter((x) => x.sousTraitantId === st.id)) {
      const personne = nettoyer(`${o.prenom} ${o.nom}`)
      personnes.push(personne)
      for (const code of documentsRequisPersonne(st, o)) {
        const docs = o.DocumentOuvrier.filter((d) => d.type === code)
        const valables = docs.filter(valide)
        if (!docs.length) manques.push({ soustraitantId: st.id, personne, libelle: libelleType(code), raison: 'manquant' })
        else if (!valables.length) manques.push({ soustraitantId: st.id, personne, libelle: libelleType(code), raison: 'expire' })
        // Toutes les faces en vigueur (recto, verso…)
        for (const d of valables) await ajouter(d, personne)
      }
    }

    resultat.push({ id: st.id, nom: st.nom, tva: st.tva, personnes, pieces, manques })
  }
  return resultat
}

export interface EnvoiDeclaration {
  chantierId: string
  mode: ModeDeclaration
  soustraitantIds: string[]
  destinataire: string
  /** Mode « documents » : regrouper les pièces dans un seul fichier ZIP (défaut : oui) */
  zip?: boolean
  userId?: string
  userNom?: string
}

/** ok : envoyé (pieces, taille) · sinon status HTTP + erreur lisible */
export interface ResultatDeclaration {
  ok: boolean
  pieces?: number
  /** Pièces envoyées dans un seul fichier ZIP */
  zip?: boolean
  taille?: number
  status?: number
  erreur?: string
}

export async function envoyerDeclaration(p: EnvoiDeclaration): Promise<ResultatDeclaration> {
  const chantier = await prisma.chantier.findUnique({
    where: { chantierId: p.chantierId },
    select: { chantierId: true, nomChantier: true, adresseChantier: true, villeChantier: true, numeroIdentification: true },
  })
  if (!chantier) return { ok: false, status: 404, erreur: 'Chantier non trouvé' }
  if (!p.soustraitantIds.length) return { ok: false, status: 400, erreur: 'Sélectionnez au moins un sous-traitant' }

  const societes = await piecesDeclaration(p.soustraitantIds)
  if (societes.length !== p.soustraitantIds.length) {
    return { ok: false, status: 404, erreur: "Un ou plusieurs sous-traitants n'ont pas été trouvés" }
  }

  const avecDocuments = p.mode === 'documents'
  const pieces = avecDocuments ? societes.flatMap((s) => s.pieces) : []
  const taille = pieces.reduce((t, x) => t + x.taille, 0)
  if (taille > TAILLE_MAX_PIECES) {
    return {
      ok: false,
      status: 413,
      erreur: `Pièces jointes trop lourdes (${(taille / 1048576).toFixed(1)} Mo, maximum ${TAILLE_MAX_PIECES / 1048576} Mo). Envoyez les sous-traitants en plusieurs fois.`,
    }
  }
  const fichiers = await Promise.all(
    pieces.map(async (x) => ({ piece: x, content: await readFile(join(RACINE_UPLOADS, x.url.replace(/^\//, ''))) }))
  )
  const enZip = avecDocuments && p.zip !== false && fichiers.length > 1
  const nomZip = `${nettoyer(`Déclaration sous-traitance - ${chantier.nomChantier}`)}.zip`
  const attachments = enZip
    ? [{ filename: nomZip, content: await creerZip(fichiers, societes) }]
    : fichiers.map((f) => ({ filename: f.piece.nomFichier, content: f.content }))

  const adresse = [chantier.adresseChantier, chantier.villeChantier].filter(Boolean).join(', ')
  const pluriel = societes.length > 1
  const demande = pluriel
    ? 'Pourriez-vous déclarer les sous-traitants suivants sur le chantier ci-dessous ?'
    : 'Pourriez-vous déclarer le sous-traitant suivant sur le chantier ci-dessous ?'
  const lignesChantier: [string, string][] = [
    ['Chantier', echapperHtml(chantier.nomChantier)],
    ...(adresse ? [['Adresse', echapperHtml(adresse)] as [string, string]] : []),
    ...(chantier.numeroIdentification ? [['Référence', echapperHtml(chantier.numeroIdentification)] as [string, string]] : []),
  ]
  const blocSte = (s: PiecesSousTraitant) =>
    encadre(
      `<strong>${echapperHtml(s.nom)}</strong><br>N° d'entreprise / TVA : ${echapperHtml(s.tva || 'non communiqué')}` +
        (avecDocuments && s.personnes.length
          ? `<br>Personnes : ${s.personnes.map(echapperHtml).join(', ')}`
          : '')
    )
  const societe = await societeEmail()
  const html = gabaritEmail({
    titre: 'Déclaration de sous-traitance',
    apercu: `${chantier.nomChantier} — ${societes.map((s) => s.nom).join(', ')}`,
    contenuHtml:
      paragraphe('Bonjour,') +
      paragraphe(demande) +
      ficheInfos(lignesChantier) +
      sousTitre(pluriel ? 'Sous-traitants' : 'Sous-traitant') +
      societes.map(blocSte).join('') +
      (avecDocuments && pieces.length
        ? paragraphe(
            enZip
              ? `Vous trouverez dans le fichier ZIP joint (${echapperHtml(nomZip)}) les documents ${pluriel ? 'de ces sociétés' : 'de cette société'} et de leurs travailleurs, classés par société et par personne (${pieces.length} fichiers) :`
              : `Vous trouverez en pièces jointes les documents ${pluriel ? 'de ces sociétés' : 'de cette société'} et de leurs travailleurs (${pieces.length} fichier${pieces.length > 1 ? 's' : ''}) :`
          ) + liste(pieces.map((x) => echapperHtml(x.nomFichier)))
        : '') +
      paragraphe('Je vous remercie par avance.') +
      paragraphe(`Cordialement,<br>${echapperHtml(societe.nom)}`),
    societe,
  })
  const texte = [
    'Bonjour,',
    '',
    demande,
    '',
    `Chantier : ${chantier.nomChantier}`,
    adresse ? `Adresse : ${adresse}` : '',
    chantier.numeroIdentification ? `Référence : ${chantier.numeroIdentification}` : '',
    '',
    ...societes.map((s) =>
      `- ${s.nom} — N° d'entreprise / TVA : ${s.tva || 'non communiqué'}` +
      (avecDocuments && s.personnes.length ? ` — Personnes : ${s.personnes.join(', ')}` : '')
    ),
    '',
    avecDocuments && pieces.length
      ? enZip
        ? `Documents dans le fichier ZIP joint : ${nomZip} (${pieces.length} fichiers).`
        : `Documents en pièces jointes (${pieces.length}).`
      : '',
    'Je vous remercie par avance.',
    '',
    'Cordialement,',
    societe.nom,
  ].filter((l, i, t) => l !== '' || t[i - 1] !== '').join('\n')

  const objet = `Déclaration de sous-traitance — ${chantier.nomChantier}`
  const envoi = await envoyerEmailRappel({
    to: p.destinataire,
    // Copie visible : la demande et la réponse de l'entreprise générale restent dans la boîte info@
    cc: p.destinataire.toLowerCase() === REPLY_TO ? undefined : REPLY_TO,
    subject: objet,
    html,
    text: texte,
    replyTo: REPLY_TO,
    attachments,
  })

  // Registre : chaque tentative est conservée (preuve en cas de contrôle)
  await prisma.declarationSousTraitance
    .create({
      data: {
        chantierId: chantier.chantierId,
        chantierNom: chantier.nomChantier,
        mode: avecDocuments ? 'DOCUMENTS' : 'SIMPLE',
        destinataire: p.destinataire,
        objet,
        contenuTexte: texte,
        contenuHtml: html,
        soustraitants: JSON.stringify(societes.map((s) => ({ id: s.id, nom: s.nom, tva: s.tva, personnes: s.personnes }))),
        pieces: JSON.stringify(pieces.map((x) => ({ nomFichier: x.nomFichier, libelle: x.libelle, personne: x.personne, taille: x.taille, url: x.url }))),
        messageId: envoi.messageId || null,
        statut: envoi.ok ? 'ENVOYE' : 'ECHEC',
        erreur: envoi.ok ? null : envoi.erreur || null,
        envoyePar: p.userId || null,
        envoyeParNom: p.userNom || null,
      },
    })
    .catch((e) => console.error('[DECLARATION] Registre non enregistré :', e))

  if (!envoi.ok) return { ok: false, status: 502, erreur: `Envoi impossible : ${envoi.erreur}` }

  await cocherTacheDeclaration(chantier.chantierId, p.userId).catch((e) =>
    console.error('[DECLARATION] Tâche administrative non cochée :', e)
  )
  return { ok: true, pieces: pieces.length, zip: enZip, taille }
}

/** Un dossier par société, puis « Société » et un sous-dossier par personne. */
async function creerZip(
  fichiers: { piece: PieceJointe; content: Buffer }[],
  societes: PiecesSousTraitant[]
): Promise<Buffer> {
  const zip = new JSZip()
  const utilises = new Set<string>()
  for (const { piece, content } of fichiers) {
    const ste = nettoyer(societes.find((s) => s.id === piece.soustraitantId)?.nom || 'Sous-traitant')
    const dossier = `${ste}/${piece.personne || 'Société'}`
    // Deux fichiers du même nom (ex. deux faces sans précision) : suffixe (2), (3)…
    let chemin = `${dossier}/${piece.nomFichier}`
    for (let i = 2; utilises.has(chemin.toLowerCase()); i++) {
      const ext = extname(piece.nomFichier)
      chemin = `${dossier}/${piece.nomFichier.slice(0, piece.nomFichier.length - ext.length)} (${i})${ext}`
    }
    utilises.add(chemin.toLowerCase())
    zip.file(chemin, content, { date: new Date() })
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

/** Coche la tâche administrative « Déclaration de sous-traitance » du chantier. */
async function cocherTacheDeclaration(chantierId: string, userId?: string) {
  const taskType = 'declaration_sous_traitance'
  const existante = await prisma.admintask.findUnique({ where: { chantierId_taskType: { chantierId, taskType } } })
  if (existante?.completed) return
  const maintenant = new Date()
  if (existante) {
    await prisma.admintask.update({
      where: { id: existante.id },
      data: { completed: true, completedAt: maintenant, completedBy: userId || null, updatedAt: maintenant },
    })
    return
  }
  const typeTache = await prisma.adminTaskType.findUnique({ where: { taskType } })
  if (!typeTache) return
  await prisma.admintask.create({
    data: {
      chantierId, taskType, title: typeTache.label, completed: true,
      completedAt: maintenant, completedBy: userId || null, updatedAt: maintenant,
    },
  })
}

// ─── Registre ────────────────────────────────────────────────────────────────

export interface EntreeRegistre {
  id: number
  chantierId: string
  chantierNom: string
  mode: string
  destinataire: string
  soustraitants: { id: string; nom: string; tva: string | null; personnes: string[] }[]
  pieces: { nomFichier: string; libelle: string; personne: string | null; taille: number; url: string }[]
  statut: string
  erreur: string | null
  envoyeParNom: string | null
  createdAt: string
}

const lireJson = <T>(s: string, defaut: T): T => {
  try {
    return JSON.parse(s) as T
  } catch {
    return defaut
  }
}

/** Déclarations envoyées, plus récentes d'abord (filtre facultatif par chantier ou sous-traitant). */
export async function listerRegistre(opts: { chantierId?: string; soustraitantId?: string; limite?: number } = {}): Promise<EntreeRegistre[]> {
  const lignes = await prisma.declarationSousTraitance.findMany({
    where: {
      ...(opts.chantierId ? { chantierId: opts.chantierId } : {}),
      // Recherche dans le JSON des sous-traitants (identifiant entre guillemets)
      ...(opts.soustraitantId ? { soustraitants: { contains: `"${opts.soustraitantId}"` } } : {}),
    },
    select: {
      id: true, chantierId: true, chantierNom: true, mode: true, destinataire: true, soustraitants: true,
      pieces: true, statut: true, erreur: true, envoyeParNom: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(opts.limite || 200, 500),
  })
  return lignes.map((l) => ({
    ...l,
    soustraitants: lireJson(l.soustraitants, []),
    pieces: lireJson(l.pieces, []),
    createdAt: l.createdAt.toISOString(),
  }))
}

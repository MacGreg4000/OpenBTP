// Exécution des rappels Checkinatwork quotidiens.
//
// Appelé par le cron (toutes les 15 min en matinée, jours ouvrables) et par le
// bouton « Envoyer maintenant ». Chaque tentative — réussie ou non — est
// inscrite dans `rappel_checkin_log` avec le texte exact et la liste des
// chantiers du jour : c'est la preuve remise à l'inspection.
//
// Modes (réglages) :
//  - DESACTIVE : rien ne part, ni par le cron ni manuellement ;
//  - TEST      : chaque rappel part à l'adresse de test, objet préfixé
//                [TEST], destinataire réel noté dans le journal ;
//  - ACTIF     : envoi réel au représentant de chaque sous-traitant.

import { prisma } from '@/lib/prisma/client'
import { envoyerEmailRappel } from '@/lib/email-sender'
import { referenceContrat } from '@/lib/contract-generator-puppeteer'
import { listerChantiersCheckin, lienCheckin } from './chantiers'
import { construireRappel } from './rappel'
import { jourFerieBelge } from './jours-feries'

const FUSEAU = 'Europe/Brussels'
const REPLY_TO = 'info@secotech.be'
/** Rattrapage du cron : au-delà, plus d'envoi automatique ce jour-là. */
const HEURE_LIMITE_CRON = '11:00'
/** Échecs tolérés par sous-traitant et par jour avant d'arrêter de réessayer. */
const MAX_ECHECS_JOUR = 3
const PAUSE_ENTRE_EMAILS_MS = 1500

export type ModeRappel = 'DESACTIVE' | 'TEST' | 'ACTIF'
export const MODES_RAPPEL: ModeRappel[] = ['DESACTIVE', 'TEST', 'ACTIF']

export interface ResultatRappels {
  execute: boolean
  /** Raison de non-exécution (mode désactivé, week-end, jour férié…) */
  raison?: string
  mode?: ModeRappel
  dateRappel?: string
  envoyes: { soustraitant: string; destinataire: string }[]
  echecs: { soustraitant: string; erreur: string }[]
  /** Sous-traitants actifs non contactés, avec la raison (sans contrat signé, sans email…) */
  ignores: { soustraitant: string; raison: string }[]
  dejaEnvoyes: number
}

/** Date, heure et jour de semaine à Bruxelles (indépendant du fuseau du serveur). */
export function maintenantBruxelles(d = new Date()): { date: string; heure: string; jourSemaine: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSEAU,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  }).formatToParts(d)
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const jours: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 }
  return {
    date: `${v('year')}-${v('month')}-${v('day')}`,
    heure: `${v('hour')}:${v('minute')}`,
    jourSemaine: jours[v('weekday')] ?? -1,
  }
}

/**
 * Jours sans rappel SUPPLÉMENTAIRES (les week-ends et fériés légaux belges
 * sont exclus d'office) : une date AAAA-MM-JJ ou une période AAAA-MM-JJ:AAAA-MM-JJ
 * par ligne ; le texte après un # est un commentaire. Les lignes illisibles
 * sont ignorées (elles sont signalées dans l'écran des réglages).
 */
export function lireJoursSansRappel(texte: string | null | undefined): { debut: string; fin: string }[] {
  const res: { debut: string; fin: string }[] = []
  for (const brut of (texte || '').split(/\r?\n/)) {
    const ligne = brut.split('#')[0].trim()
    const m = ligne.match(/^(\d{4}-\d{2}-\d{2})(?:\s*[:→-]{1}\s*(\d{4}-\d{2}-\d{2}))?$/)
    if (!m) continue
    const debut = m[1]
    const fin = m[2] || m[1]
    res.push(debut <= fin ? { debut, fin } : { debut: fin, fin: debut })
  }
  return res
}

export function estJourSansRappel(date: string, texte: string | null | undefined): boolean {
  return lireJoursSansRappel(texte).some((p) => date >= p.debut && date <= p.fin)
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Un seul passage à la fois dans ce processus : un clic sur « Envoyer
// maintenant » pendant un passage du cron ne doit pas doubler les envois.
let enCours = false

export async function executerRappels(opts: {
  declencheur: 'CRON' | 'MANUEL'
  /** Limiter à un sous-traitant (bouton sur une fiche) */
  soustraitantId?: string
  maintenant?: Date
}): Promise<ResultatRappels> {
  const res: ResultatRappels = { execute: false, envoyes: [], echecs: [], ignores: [], dejaEnvoyes: 0 }
  if (enCours) return { ...res, raison: 'Un envoi de rappels est déjà en cours.' }
  enCours = true
  try {
    return await executer(opts, res)
  } finally {
    enCours = false
  }
}

async function executer(
  opts: { declencheur: 'CRON' | 'MANUEL'; soustraitantId?: string; maintenant?: Date },
  res: ResultatRappels
): Promise<ResultatRappels> {
  const settings = await prisma.companysettings.findFirst()
  const mode = (MODES_RAPPEL.includes(settings?.rappelCheckinMode as ModeRappel)
    ? settings.rappelCheckinMode
    : 'DESACTIVE') as ModeRappel
  res.mode = mode
  if (!settings || mode === 'DESACTIVE') return { ...res, raison: 'Rappels désactivés dans les réglages.' }

  const { date, heure, jourSemaine } = maintenantBruxelles(opts.maintenant)
  res.dateRappel = date

  if (opts.declencheur === 'CRON') {
    if (jourSemaine < 1 || jourSemaine > 5) return { ...res, raison: 'Week-end.' }
    const ferie = jourFerieBelge(date)
    if (ferie) return { ...res, raison: `Jour férié (${ferie}).` }
    if (estJourSansRappel(date, settings.rappelCheckinJoursFeries)) {
      return { ...res, raison: 'Jour de congé (liste des réglages).' }
    }
    if (heure < (settings.rappelCheckinHeure || '06:30')) return { ...res, raison: 'Heure d\'envoi pas encore atteinte.' }
    if (heure >= HEURE_LIMITE_CRON) return { ...res, raison: 'Fenêtre d\'envoi automatique dépassée.' }
  }

  const emailTest = settings.rappelCheckinEmailTest?.trim()
  if (mode === 'TEST' && !emailTest) {
    return { ...res, raison: 'Mode test sans adresse de test configurée.' }
  }
  const lien = lienCheckin(settings.checkinToken)
  if (!lien) return { ...res, raison: 'Aucun lien de page Checkinatwork généré (Configuration).' }

  const sousTraitants = await prisma.soustraitant.findMany({
    where: {
      actif: true,
      rappelCheckinActif: true,
      ...(opts.soustraitantId ? { id: opts.soustraitantId } : {}),
    },
    select: {
      id: true,
      nom: true,
      representantEmail: true,
      contrats: {
        where: { estSigne: true },
        orderBy: { dateSignature: 'desc' },
        take: 1,
        select: { dateGeneration: true, templateVersion: true },
      },
    },
    orderBy: { nom: 'asc' },
  })
  if (opts.soustraitantId && sousTraitants.length === 0) {
    return { ...res, raison: 'Sous-traitant inactif ou rappel désactivé sur sa fiche.' }
  }

  res.execute = true
  // Liste des chantiers figée une fois pour tout le passage : c'est celle
  // que la page affichait au moment de l'envoi.
  const chantiers = await listerChantiersCheckin()
  const snapshot = JSON.stringify(chantiers)
  const societe = {
    nom: settings.name,
    adresse: [settings.address, [settings.zipCode, settings.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    tva: settings.tva,
  }
  // Contrat v2 = template contenant l'art. 8.6.3 (clauses Checkinatwork).
  const v2ParTemplate = new Map<string, boolean>()
  const estV2 = async (nom: string | null) => {
    if (!nom) return false
    if (!v2ParTemplate.has(nom)) {
      const t = await prisma.contractTemplate.findUnique({ where: { name: nom }, select: { htmlContent: true } })
      v2ParTemplate.set(nom, !!t?.htmlContent?.includes('8.6.3'))
    }
    return v2ParTemplate.get(nom)
  }

  let premier = true
  for (const st of sousTraitants) {
    const contrat = st.contrats[0]
    const emailReel = st.representantEmail?.trim()
    if (!contrat) {
      res.ignores.push({ soustraitant: st.nom, raison: 'Aucun contrat-cadre signé.' })
      continue
    }
    if (!emailReel) {
      res.ignores.push({ soustraitant: st.nom, raison: 'Email du représentant manquant.' })
      continue
    }

    // Idempotence du cron : un rappel par sous-traitant et par jour (dans le
    // mode courant). L'envoi manuel, lui, part toujours — il sert justement
    // aux démarrages imprévus en cours de journée.
    if (opts.declencheur === 'CRON') {
      const dejaDuJour = await prisma.rappelCheckinLog.findMany({
        where: { soustraitantId: st.id, dateRappel: date, modeTest: mode === 'TEST' },
        select: { statut: true },
      })
      if (dejaDuJour.some((l) => l.statut === 'ENVOYE')) {
        res.dejaEnvoyes++
        continue
      }
      if (dejaDuJour.filter((l) => l.statut === 'ECHEC').length >= MAX_ECHECS_JOUR) {
        res.echecs.push({ soustraitant: st.nom, erreur: `${MAX_ECHECS_JOUR} échecs aujourd'hui, plus de nouvel essai.` })
        continue
      }
    }

    const reference = referenceContrat(contrat.dateGeneration)
    const contenu = construireRappel({
      dateRappel: date,
      soustraitantNom: st.nom,
      contratReference: reference,
      contratV2: await estV2(contrat.templateVersion),
      lien,
      societe,
    })
    const destinataire = mode === 'TEST' ? emailTest : emailReel
    const objet = mode === 'TEST' ? `[TEST → ${emailReel}] ${contenu.objet}` : contenu.objet

    if (!premier) await pause(PAUSE_ENTRE_EMAILS_MS)
    premier = false

    const envoi = await envoyerEmailRappel({
      to: destinataire,
      subject: objet,
      html: contenu.html,
      text: contenu.texte,
      replyTo: REPLY_TO,
    })

    try {
      await prisma.rappelCheckinLog.create({
        data: {
          canal: 'EMAIL',
          dateRappel: date,
          declencheur: opts.declencheur,
          modeTest: mode === 'TEST',
          soustraitantId: st.id,
          soustraitantNom: st.nom,
          destinataire,
          destinataireReel: mode === 'TEST' ? emailReel : null,
          contratReference: reference,
          contratVersion: contrat.templateVersion,
          objet,
          contenuTexte: contenu.texte,
          contenuHtml: contenu.html,
          chantiersSnapshot: snapshot,
          lien,
          messageId: envoi.messageId ?? null,
          statut: envoi.ok ? 'ENVOYE' : 'ECHEC',
          erreur: envoi.erreur ?? null,
        },
      })
    } catch (e) {
      // L'email est parti mais la preuve n'est pas écrite : à signaler
      // bruyamment, sans interrompre les envois suivants.
      console.error(`❌ [RAPPEL CHECKIN] Journal non écrit pour ${st.nom}:`, e)
    }

    if (envoi.ok) res.envoyes.push({ soustraitant: st.nom, destinataire })
    else res.echecs.push({ soustraitant: st.nom, erreur: envoi.erreur || 'Erreur inconnue' })
  }

  return res
}

// ─── Alerte du matin ────────────────────────────────────────────────────────
//
// Une fois par jour ouvrable, au plus tôt à 7h00 et au moins 30 min après
// l'heure d'envoi, contrôle la situation et envoie un email à Secotech
// UNIQUEMENT s'il y a un problème :
//  - rappels en échec aujourd'hui, ou sous-traitants pas encore contactés ;
//  - sous-traitants actifs sans contrat-cadre signé ou sans email représentant ;
//  - chantiers publiés sur la page sans numéro Checkinatwork.

export interface ProblemesRappel {
  echecs: { soustraitant: string; erreur: string }[]
  nonEnvoyes: string[]
  nonContactables: { soustraitant: string; raison: string }[]
  chantiersSansNumero: { chantier: string; client: string }[]
}

function ajouterMinutes(heure: string, minutes: number): string {
  const [h, m] = heure.split(':').map(Number)
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 59)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export async function releverProblemes(date: string, modeTest: boolean): Promise<ProblemesRappel> {
  const sousTraitants = await prisma.soustraitant.findMany({
    where: { actif: true, rappelCheckinActif: true },
    select: {
      id: true,
      nom: true,
      representantEmail: true,
      contrats: { where: { estSigne: true }, select: { id: true }, take: 1 },
    },
    orderBy: { nom: 'asc' },
  })
  const logs = await prisma.rappelCheckinLog.findMany({
    where: { dateRappel: date, modeTest },
    select: { soustraitantId: true, statut: true, erreur: true },
    orderBy: { createdAt: 'asc' },
  })

  const p: ProblemesRappel = { echecs: [], nonEnvoyes: [], nonContactables: [], chantiersSansNumero: [] }
  for (const st of sousTraitants) {
    if (!st.contrats.length) {
      p.nonContactables.push({ soustraitant: st.nom, raison: 'Aucun contrat-cadre signé' })
      continue
    }
    if (!st.representantEmail) {
      p.nonContactables.push({ soustraitant: st.nom, raison: 'Email du représentant manquant' })
      continue
    }
    const siens = logs.filter((l) => l.soustraitantId === st.id)
    if (siens.some((l) => l.statut === 'ENVOYE')) continue
    const echec = siens.filter((l) => l.statut === 'ECHEC').pop()
    if (echec) p.echecs.push({ soustraitant: st.nom, erreur: echec.erreur || 'Erreur inconnue' })
    else p.nonEnvoyes.push(st.nom)
  }
  p.chantiersSansNumero = (await listerChantiersCheckin())
    .filter((c) => !c.numero)
    .map((c) => ({ chantier: c.chantier, client: c.client }))
  return p
}

export function aDesProblemes(p: ProblemesRappel): boolean {
  return !!(p.echecs.length || p.nonEnvoyes.length || p.nonContactables.length || p.chantiersSansNumero.length)
}

export async function executerAlerte(maintenant?: Date): Promise<{ envoyee: boolean; raison?: string }> {
  const settings = await prisma.companysettings.findFirst()
  const mode = settings?.rappelCheckinMode as ModeRappel
  if (!settings || (mode !== 'TEST' && mode !== 'ACTIF')) return { envoyee: false, raison: 'Rappels désactivés.' }

  const { date, heure, jourSemaine } = maintenantBruxelles(maintenant)
  if (jourSemaine < 1 || jourSemaine > 5 || jourFerieBelge(date) || estJourSansRappel(date, settings.rappelCheckinJoursFeries)) {
    return { envoyee: false, raison: 'Jour sans rappel.' }
  }
  const seuil = [ajouterMinutes(settings.rappelCheckinHeure || '06:30', 30), '07:00'].sort()[1]
  if (heure < seuil) return { envoyee: false, raison: 'Trop tôt.' }
  if (settings.rappelCheckinAlerteVerifiee === date) return { envoyee: false, raison: 'Déjà contrôlé aujourd\'hui.' }

  // Marqué AVANT l'envoi : en cas de plantage, pas d'alerte en boucle.
  await prisma.companysettings.update({ where: { id: settings.id }, data: { rappelCheckinAlerteVerifiee: date } })

  const p = await releverProblemes(date, mode === 'TEST')
  if (!aDesProblemes(p)) return { envoyee: false, raison: 'Aucun problème.' }

  const destinataire = settings.rappelCheckinEmailAlerte?.trim() || settings.email
  if (!destinataire) return { envoyee: false, raison: 'Aucune adresse d\'alerte.' }

  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const sections: { titre: string; lignes: string[] }[] = [
    { titre: 'Rappels en échec', lignes: p.echecs.map((x) => `${x.soustraitant} — ${x.erreur}`) },
    { titre: 'Rappels pas encore partis', lignes: p.nonEnvoyes },
    { titre: 'Sous-traitants actifs non contactés', lignes: p.nonContactables.map((x) => `${x.soustraitant} — ${x.raison}`) },
    {
      titre: 'Chantiers sans numéro Checkinatwork (fiche chantier → Numéro d\'identification)',
      lignes: p.chantiersSansNumero.map((x) => (x.client ? `${x.chantier} (${x.client})` : x.chantier)),
    },
  ].filter((s) => s.lignes.length)

  const dateFr = date.split('-').reverse().join('/')
  const prefixe = mode === 'TEST' ? '[TEST] ' : ''
  const texte = [
    `Contrôle des rappels Checkinatwork du ${dateFr}${mode === 'TEST' ? ' (mode test)' : ''} :`,
    '',
    ...sections.flatMap((s) => [`${s.titre} (${s.lignes.length}) :`, ...s.lignes.map((l) => `- ${l}`), '']),
    'Réglages : Configuration → Rappel Checkinatwork quotidien.',
  ].join('\n')
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
<p>Contrôle des rappels Checkinatwork du ${dateFr}${mode === 'TEST' ? ' (mode test)' : ''} :</p>
${sections.map((s) => `<h3 style="font-size:15px;margin:16px 0 4px">${e(s.titre)} (${s.lignes.length})</h3><ul>${s.lignes.map((l) => `<li>${e(l)}</li>`).join('')}</ul>`).join('\n')}
<p style="color:#555">Réglages : Configuration → Rappel Checkinatwork quotidien.</p></div>`

  const envoi = await envoyerEmailRappel({
    to: destinataire,
    subject: `${prefixe}⚠️ Rappels Checkinatwork – ${dateFr} – à vérifier`,
    html,
    text: texte,
  })
  if (!envoi.ok) console.error(`❌ [ALERTE CHECKIN] Envoi impossible à ${destinataire}: ${envoi.erreur}`)
  return { envoyee: envoi.ok, raison: envoi.erreur }
}

// Renouvellement automatique des contrats-cadres arrivant à échéance.
//
// Chaque matin ouvrable (cron), si l'option est activée dans Configuration :
//  - contrat signé expirant dans les 30 jours (ou déjà expiré) d'un
//    sous-traitant actif → un nouveau contrat (template actif) est généré et
//    envoyé au représentant, exactement comme le bouton « Renouveler » ;
//  - renouvellement déjà envoyé mais pas signé → relance tous les 7 jours ;
//  - représentant incomplet → rien n'est envoyé, signalé dans le récapitulatif.
// Un récapitulatif est envoyé à l'adresse d'alerte quand il y a du nouveau.

import { prisma } from '@/lib/prisma/client'
import { envoyerEmailRappel } from '@/lib/email-sender'
import { champsRepresentantManquants } from '@/lib/soustraitants/representant'
import { joursAvantEcheance, renouvellementConseille } from './echeance'
import { envoyerContratEnSignature } from './envoi-signature'

export const RELANCE_JOURS = 7
const JOUR_MS = 24 * 60 * 60 * 1000
const PAUSE_ENTRE_EMAILS_MS = 1500

export type StatutRenouvellement = 'A_ENVOYER' | 'RELANCE' | 'EN_ATTENTE' | 'BLOQUE'

export interface EcheanceContrat {
  soustraitantId: string
  soustraitant: string
  dateFin: Date
  joursRestants: number
  statut: StatutRenouvellement
  /** Dernier envoi du renouvellement (EN_ATTENTE / RELANCE) */
  dernierEnvoi?: Date
  /** BLOQUE : champs du représentant manquants */
  manquants?: string[]
}

/**
 * Situation des sous-traitants actifs dont le contrat signé expire dans les
 * 30 jours ou est expiré. Lecture seule.
 */
export async function listerEcheances(maintenant = new Date()): Promise<EcheanceContrat[]> {
  const sousTraitants = await prisma.soustraitant.findMany({
    where: { actif: true },
    select: {
      id: true,
      nom: true,
      representantNom: true,
      representantPrenom: true,
      representantFonction: true,
      representantEmail: true,
      representantGsm: true,
      contrats: {
        select: { estSigne: true, dateGeneration: true, dateSignature: true, dateFin: true, dateEnvoi: true },
        orderBy: { dateGeneration: 'desc' },
      },
    },
    orderBy: { nom: 'asc' },
  })

  const res: EcheanceContrat[] = []
  for (const st of sousTraitants) {
    // Le contrat en vigueur = le plus récemment signé (même règle que le tableau)
    const signe = st.contrats
      .filter((c) => c.estSigne)
      .sort((a, b) => (b.dateSignature?.getTime() ?? 0) - (a.dateSignature?.getTime() ?? 0))[0]
    if (!signe?.dateFin || !renouvellementConseille(signe.dateFin)) continue

    const base = {
      soustraitantId: st.id,
      soustraitant: st.nom,
      dateFin: signe.dateFin,
      joursRestants: joursAvantEcheance(signe.dateFin) ?? 0,
    }

    // Un renouvellement déjà ENVOYÉ = un contrat plus récent que le contrat
    // en vigueur, avec une date d'envoi. (Un contrat simplement « généré »
    // sans envoi ne compte pas : il sera réutilisé et envoyé.)
    const renouvellement = st.contrats.find(
      (c) => !c.estSigne && c.dateEnvoi && c.dateGeneration > signe.dateGeneration
    )
    if (renouvellement?.dateEnvoi) {
      const depuis = (maintenant.getTime() - renouvellement.dateEnvoi.getTime()) / JOUR_MS
      res.push({ ...base, statut: depuis >= RELANCE_JOURS ? 'RELANCE' : 'EN_ATTENTE', dernierEnvoi: renouvellement.dateEnvoi })
      continue
    }

    const manquants = champsRepresentantManquants(st)
    res.push(manquants.length ? { ...base, statut: 'BLOQUE', manquants } : { ...base, statut: 'A_ENVOYER' })
  }
  return res
}

export interface ResultatRenouvellements {
  execute: boolean
  raison?: string
  envoyes: { soustraitant: string; destinataire: string; relance: boolean }[]
  echecs: { soustraitant: string; erreur: string }[]
  bloques: { soustraitant: string; manquants: string[]; joursRestants: number }[]
  enAttente: number
}

let enCours = false

export async function executerRenouvellements(opts: { forcer?: boolean } = {}): Promise<ResultatRenouvellements> {
  const res: ResultatRenouvellements = { execute: false, envoyes: [], echecs: [], bloques: [], enAttente: 0 }
  if (enCours) return { ...res, raison: 'Un renouvellement est déjà en cours.' }
  enCours = true
  try {
    const settings = await prisma.companysettings.findFirst({
      select: { renouvellementContratAuto: true, rappelCheckinEmailAlerte: true, email: true },
    })
    if (!settings?.renouvellementContratAuto && !opts.forcer) {
      return { ...res, raison: 'Renouvellement automatique désactivé.' }
    }
    res.execute = true

    let premier = true
    for (const e of await listerEcheances()) {
      if (e.statut === 'EN_ATTENTE') {
        res.enAttente++
        continue
      }
      if (e.statut === 'BLOQUE') {
        res.bloques.push({ soustraitant: e.soustraitant, manquants: e.manquants || [], joursRestants: e.joursRestants })
        continue
      }
      if (!premier) await new Promise((r) => setTimeout(r, PAUSE_ENTRE_EMAILS_MS))
      premier = false
      const r = await envoyerContratEnSignature(e.soustraitantId, 'RENOUVELLEMENT-AUTO')
      if (r.ok) res.envoyes.push({ soustraitant: e.soustraitant, destinataire: r.destinataire || '', relance: e.statut === 'RELANCE' })
      else res.echecs.push({ soustraitant: e.soustraitant, erreur: r.erreur || 'Erreur inconnue' })
    }

    if (res.envoyes.length || res.echecs.length || res.bloques.length) {
      await envoyerRecapitulatif(res, settings?.rappelCheckinEmailAlerte?.trim() || settings?.email)
    }
    return res
  } finally {
    enCours = false
  }
}

async function envoyerRecapitulatif(r: ResultatRenouvellements, destinataire: string | null | undefined) {
  if (!destinataire) return
  const echeance = (j: number) => (j < 0 ? `expiré depuis ${-j} j` : `échéance dans ${j} j`)
  const sections = [
    {
      titre: 'Contrats envoyés en signature',
      lignes: r.envoyes.filter((x) => !x.relance).map((x) => `${x.soustraitant} → ${x.destinataire}`),
    },
    {
      titre: `Relances (non signé depuis ${RELANCE_JOURS} jours ou plus)`,
      lignes: r.envoyes.filter((x) => x.relance).map((x) => `${x.soustraitant} → ${x.destinataire}`),
    },
    { titre: 'Échecs', lignes: r.echecs.map((x) => `${x.soustraitant} — ${x.erreur}`) },
    {
      titre: 'Non envoyés — représentant incomplet sur la fiche',
      lignes: r.bloques.map((x) => `${x.soustraitant} (${echeance(x.joursRestants)}) — manque : ${x.manquants.join(', ')}`),
    },
  ].filter((s) => s.lignes.length)

  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const texte = [
    'Renouvellement automatique des contrats-cadres :',
    '',
    ...sections.flatMap((s) => [`${s.titre} (${s.lignes.length}) :`, ...s.lignes.map((l) => `- ${l}`), '']),
    r.enAttente ? `${r.enAttente} autre(s) renouvellement(s) en attente de signature (relance automatique après ${RELANCE_JOURS} jours).` : '',
    'Réglage : Configuration → Renouvellement automatique des contrats.',
  ].join('\n')
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#111">
<p>Renouvellement automatique des contrats-cadres :</p>
${sections.map((s) => `<h3 style="font-size:15px;margin:16px 0 4px">${e(s.titre)} (${s.lignes.length})</h3><ul>${s.lignes.map((l) => `<li>${e(l)}</li>`).join('')}</ul>`).join('\n')}
${r.enAttente ? `<p>${r.enAttente} autre(s) renouvellement(s) en attente de signature (relance automatique après ${RELANCE_JOURS} jours).</p>` : ''}
<p style="color:#555">Réglage : Configuration → Renouvellement automatique des contrats.</p></div>`

  const envoi = await envoyerEmailRappel({
    to: destinataire,
    subject: `Contrats sous-traitants — renouvellement automatique (${r.envoyes.length} envoyé${r.envoyes.length > 1 ? 's' : ''})`,
    html,
    text: texte,
  })
  if (!envoi.ok) console.error(`❌ [RENOUVELLEMENT] Récapitulatif non envoyé à ${destinataire}: ${envoi.erreur}`)
}

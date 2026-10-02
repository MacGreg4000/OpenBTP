// Rapport d'activité hebdomadaire (vendredi midi) : vue d'ensemble de
// l'entreprise en un seul email, pour les administrateurs.
//
//  1. Chiffres clés
//  2. États d'avancement de la période suivie (mois précédent en clôture
//     jusqu'au 20, mois en cours ensuite — voir periodes.ts), comparés au
//     dernier mois clos, chantiers en cours sans état, graphique 6 mois
//  3. États finalisés sans numéro de facture (3 derniers mois)
//  4. Chantiers en cours, à venir / en préparation, nouveaux de la semaine
//  5. Commercial : devis de la semaine, en attente, qui expirent
//  6. À traiter : métrés à valider, SAV ouverts, contrats à échéance,
//     chantiers sans numéro Checkinatwork

import { prisma } from '@/lib/prisma/client'
import { envoyerEmailRappel } from '@/lib/email-sender'
import { societeEmail } from '@/lib/email/societe'
import {
  gabaritEmail,
  paragraphe,
  sousTitre,
  liste,
  encadre,
  tuiles,
  tableau,
  note,
  echapperHtml as e,
} from '@/lib/email/gabarit'
import { getEtatsForMonth, getMonthlyTotals, getAdminEmails, generateBarChart, type EtatRow } from '@/lib/email/monthly-report'
import { periodesRapport } from './periodes'

const JOUR_MS = 24 * 60 * 60 * 1000
const STATUTS_SAV_CLOS = ['RESOLU', 'CLOS', 'ANNULE'] as const

const euro = (v: number) => new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
const dateCourte = (d: Date | null | undefined) =>
  d ? new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d) : '—'
const isoBruxelles = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
const pourcent = (actuel: number, ref: number) => (ref > 0 ? Math.round(((actuel - ref) / ref) * 1000) / 10 : null)

interface ChantierLigne {
  chantierId: string
  nom: string
  client: string
  ville: string
  dateDebut: Date | null
  marche: number
}

async function chantiers(statuts: string[]): Promise<ChantierLigne[]> {
  const rows = await prisma.chantier.findMany({
    where: { statut: { in: statuts }, NOT: { chantierId: { startsWith: 'CH-LIBRE-' } } },
    select: {
      chantierId: true,
      nomChantier: true,
      clientNom: true,
      villeChantier: true,
      dateDebut: true,
      budget: true,
      client: { select: { nom: true } },
      commandes: { select: { total: true, statut: true } },
    },
  })
  return rows.map((c) => {
    // Montant du marché : commandes validées (même règle que la liste des chantiers), sinon budget
    const commandes = c.commandes.filter((x) => x.statut !== 'BROUILLON').reduce((s, x) => s + (x.total || 0), 0)
    return {
      chantierId: c.chantierId,
      nom: c.nomChantier,
      client: c.client?.nom || c.clientNom || '',
      ville: c.villeChantier || '',
      dateDebut: c.dateDebut,
      marche: commandes > 0 ? commandes : c.budget || 0,
    }
  })
}

/** États finalisés sans numéro de facture, créés depuis `depuis`. */
async function etatsAFacturer(depuis: Date) {
  const etats = await prisma.etatAvancement.findMany({
    where: { estFinalise: true, createdAt: { gte: depuis }, OR: [{ factureNumero: null }, { factureNumero: '' }] },
    include: {
      lignes: { select: { montantActuel: true } },
      avenants: { select: { montantActuel: true } },
      Chantier: { select: { nomChantier: true, client: { select: { nom: true } } } },
    },
    orderBy: { date: 'asc' },
  })
  return etats.map((x) => ({
    chantier: x.Chantier?.nomChantier || 'Chantier',
    client: x.Chantier?.client?.nom || '',
    numero: x.numero,
    mois: x.mois || '',
    montant:
      x.lignes.reduce((s, l) => s + (Number(l.montantActuel) || 0), 0) +
      x.avenants.reduce((s, a) => s + (Number(a.montantActuel) || 0), 0),
  }))
}

export interface DonneesRapport {
  html: string
  texte: string
  objet: string
  graphique: Buffer | null
}

export async function construireRapportHebdo(maintenant = new Date()): Promise<DonneesRapport> {
  const aujourdhui = isoBruxelles(maintenant)
  const p = periodesRapport(aujourdhui)
  const ilYa7j = new Date(maintenant.getTime() - 7 * JOUR_MS)
  const dans7j = new Date(maintenant.getTime() + 7 * JOUR_MS)

  const [etatsSuivie, etatsClos, totauxClos, enCours, aVenir, nouveaux, aFacturer] = await Promise.all([
    getEtatsForMonth(p.suivie),
    getEtatsForMonth(p.dernierClos),
    getMonthlyTotals(p.derniersClos),
    chantiers(['EN_COURS']),
    chantiers(['A_VENIR', 'EN_PREPARATION']),
    prisma.chantier.findMany({
      where: { createdAt: { gte: ilYa7j }, NOT: { chantierId: { startsWith: 'CH-LIBRE-' } } },
      select: { nomChantier: true, clientNom: true, client: { select: { nom: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    etatsAFacturer(new Date(maintenant.getTime() - 92 * JOUR_MS)),
  ])

  const [devisSemaine, devisAttente, devisAcceptes, devisExpirent, metresSoumis, savOuverts, savUrgents] = await Promise.all([
    prisma.devis.findMany({ where: { dateCreation: { gte: ilYa7j } }, select: { montantHT: true } }),
    prisma.devis.findMany({ where: { statut: 'EN_ATTENTE' }, select: { montantHT: true } }),
    prisma.devis.findMany({ where: { statut: 'ACCEPTE', updatedAt: { gte: ilYa7j } }, select: { montantHT: true } }),
    prisma.devis.findMany({
      where: { statut: 'EN_ATTENTE', dateValidite: { gte: maintenant, lte: dans7j } },
      select: { numeroDevis: true, montantHT: true, dateValidite: true, client: { select: { nom: true } } },
      orderBy: { dateValidite: 'asc' },
    }),
    prisma.metreSoustraitant.findMany({
      where: { statut: 'SOUMIS' },
      select: { createdAt: true, chantier: { select: { nomChantier: true } }, soustraitant: { select: { nom: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.ticketSAV.count({ where: { statut: { notIn: [...STATUTS_SAV_CLOS] } } }),
    prisma.ticketSAV.count({ where: { statut: { notIn: [...STATUTS_SAV_CLOS] }, priorite: { in: ['CRITIQUE', 'HAUTE'] } } }),
  ])

  // Imports dynamiques : modules lourds (générateur de contrats / Checkinatwork)
  const [{ listerEcheances }, { listerChantiersCheckin }] = await Promise.all([
    import('@/lib/contrats/renouvellement'),
    import('@/lib/checkin/chantiers'),
  ])
  const [echeances, chantiersCheckin] = await Promise.all([listerEcheances(maintenant), listerChantiersCheckin()])

  const somme = (rows: { montantHT: unknown }[]) => rows.reduce((s, r) => s + (Number(r.montantHT) || 0), 0)
  const total = (rows: EtatRow[]) => rows.reduce((s, r) => s + r.montantTotal, 0)

  const totalSuivie = total(etatsSuivie)
  const totalClos = total(etatsClos)
  const evolution = pourcent(totalSuivie, totalClos)
  const finalises = etatsSuivie.filter((r) => r.estFinalise).length
  const totalAFacturer = aFacturer.reduce((s, x) => s + x.montant, 0)
  const avecEtat = new Set(etatsSuivie.map((r) => r.chantierId))
  const sansEtat = enCours.filter((c) => !avecEtat.has(c.chantierId)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  const sansNumero = chantiersCheckin.filter((c) => !c.numero).length
  const contratsAEcheance = echeances.length
  const contratsBloques = echeances.filter((x) => x.statut === 'BLOQUE').length

  // ── Graphique : 6 mois clos + période suivie (provisoire)
  let graphique: Buffer | null = null
  try {
    const data = [...totauxClos, { label: `${p.suivie.split(' ')[0]}${p.enCloture ? ' (en clôture)' : ' (en cours)'}`, total: totalSuivie }]
    graphique = Buffer.from(await generateBarChart(data, 'États d’avancement — montants mensuels'), 'base64')
  } catch (err) {
    console.warn('⚠️ [RAPPORT HEBDO] Graphique non généré :', err)
  }

  const du = dateCourte(ilYa7j)
  const au = dateCourte(maintenant)
  const lienApp = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

  // ── HTML
  const blocs: string[] = []
  blocs.push(
    tuiles([
      { valeur: String(enCours.length), libelle: 'Chantiers en cours' },
      { valeur: String(aVenir.length), libelle: 'À venir / en préparation' },
      { valeur: euro(totalSuivie), libelle: `États ${p.suivie}` },
      { valeur: euro(totalAFacturer), libelle: 'États à facturer', accent: totalAFacturer > 0 },
    ])
  )

  // États d'avancement
  blocs.push(sousTitre(`États d’avancement — ${e(p.suivie)}`))
  blocs.push(
    note(
      p.enCloture
        ? `Mois en clôture jusqu’au ${dateCourte(new Date(`${p.dateCloture}T12:00:00Z`))} — chiffres provisoires. Comparaison avec ${e(p.dernierClos)} (clos).`
        : `Mois en cours. Comparaison avec ${e(p.dernierClos)} (clos).`
    )
  )
  blocs.push(
    tuiles([
      { valeur: String(etatsSuivie.length), libelle: 'États' },
      { valeur: `${finalises} / ${etatsSuivie.length}`, libelle: 'Finalisés' },
      { valeur: euro(totalSuivie), libelle: 'Montant (base + avenants)' },
      {
        valeur: evolution === null ? '—' : `${evolution >= 0 ? '+' : ''}${evolution.toLocaleString('fr-BE')} %`,
        libelle: `vs ${p.dernierClos.split(' ')[0]} (${euro(totalClos)})`,
      },
    ])
  )
  if (sansEtat.length) {
    blocs.push(
      encadre(
        `<strong>${sansEtat.length} chantier${sansEtat.length > 1 ? 's' : ''} en cours sans état d’avancement pour ${e(p.suivie)}</strong>` +
          (p.enCloture ? ' — à établir avant la clôture.' : '.') +
          `<br>${sansEtat.map((c) => e(c.client ? `${c.nom} (${c.client})` : c.nom)).join(' · ')}`
      )
    )
  }
  if (etatsSuivie.length) {
    const tri = [...etatsSuivie].sort((a, b) => b.montantTotal - a.montantTotal)
    blocs.push(
      tableau(
        ['Chantier', 'N°', 'Montant', 'Statut'],
        tri.slice(0, 30).map((r) => [
          `${e(r.nomChantier)}${r.client ? `<br><span style="color:#6B7280;font-size:12px;">${e(r.client)}</span>` : ''}`,
          String(r.numero),
          euro(r.montantTotal),
          r.estFinalise
            ? `<span style="color:#047857;">Finalisé</span>${r.factureNumero ? `<br><span style="color:#6B7280;font-size:12px;">Fact. ${e(r.factureNumero)}</span>` : ''}`
            : '<span style="color:#B45309;">Brouillon</span>',
        ]),
        [2],
        ['Total', '', euro(totalSuivie), '']
      )
    )
    if (tri.length > 30) blocs.push(note(`+ ${tri.length - 30} autre(s) état(s).`))
  }
  if (graphique) {
    blocs.push(
      `<img src="cid:graphique-etats" alt="Montants mensuels des états d’avancement" width="536" style="display:block;width:100%;max-width:536px;height:auto;margin:0 0 16px 0;border:1px solid #E5E7EB;border-radius:8px;">`
    )
  }

  // À facturer
  if (aFacturer.length) {
    blocs.push(sousTitre(`À facturer — ${euro(totalAFacturer)}`))
    blocs.push(note('États finalisés des 3 derniers mois sans numéro de facture renseigné.'))
    blocs.push(
      tableau(
        ['Chantier', 'Période', 'N°', 'Montant'],
        aFacturer.slice(0, 25).map((x) => [
          `${e(x.chantier)}${x.client ? `<br><span style="color:#6B7280;font-size:12px;">${e(x.client)}</span>` : ''}`,
          e(x.mois),
          String(x.numero),
          euro(x.montant),
        ]),
        [3]
      )
    )
  }

  // Chantiers
  blocs.push(sousTitre(`Chantiers en cours (${enCours.length})`))
  if (enCours.length) {
    const tri = [...enCours].sort((a, b) => b.marche - a.marche)
    blocs.push(
      tableau(
        ['Chantier', 'Ville', 'Marché'],
        tri.map((c) => [
          `${e(c.nom)}${c.client ? `<br><span style="color:#6B7280;font-size:12px;">${e(c.client)}</span>` : ''}`,
          e(c.ville) || '—',
          c.marche ? euro(c.marche) : '—',
        ]),
        [2],
        ['Total', '', euro(tri.reduce((s, c) => s + c.marche, 0))]
      )
    )
  } else {
    blocs.push(paragraphe('Aucun chantier en cours.'))
  }
  blocs.push(sousTitre(`À venir et en préparation (${aVenir.length})`))
  if (aVenir.length) {
    const tri = [...aVenir].sort((a, b) => (a.dateDebut?.getTime() ?? Infinity) - (b.dateDebut?.getTime() ?? Infinity))
    blocs.push(
      tableau(
        ['Chantier', 'Début prévu', 'Marché'],
        tri.map((c) => [
          `${e(c.nom)}${c.client ? `<br><span style="color:#6B7280;font-size:12px;">${e(c.client)}</span>` : ''}`,
          dateCourte(c.dateDebut),
          c.marche ? euro(c.marche) : '—',
        ]),
        [2]
      )
    )
  } else {
    blocs.push(paragraphe('Aucun chantier à venir.'))
  }
  if (nouveaux.length) {
    blocs.push(
      paragraphe(
        `<strong>Nouveaux cette semaine (${nouveaux.length}) :</strong> ` +
          nouveaux.map((c) => e(c.client?.nom || c.clientNom ? `${c.nomChantier} (${c.client?.nom || c.clientNom})` : c.nomChantier)).join(' · ')
      )
    )
  }

  // Commercial
  blocs.push(sousTitre('Commercial'))
  blocs.push(
    tuiles([
      { valeur: String(devisSemaine.length), libelle: `Devis créés (${euro(somme(devisSemaine))})` },
      { valeur: String(devisAttente.length), libelle: `En attente (${euro(somme(devisAttente))})` },
      { valeur: String(devisAcceptes.length), libelle: `Acceptés cette semaine (${euro(somme(devisAcceptes))})` },
    ])
  )
  if (devisExpirent.length) {
    blocs.push(
      paragraphe(
        `<strong>Expirent dans les 7 jours :</strong> ` +
          devisExpirent
            .map((d) => `${e(d.numeroDevis)} — ${e(d.client?.nom || '')} — ${euro(Number(d.montantHT) || 0)} (le ${dateCourte(d.dateValidite)})`)
            .join(' · ')
      )
    )
  }

  // À traiter
  const aTraiter: string[] = []
  if (metresSoumis.length) {
    aTraiter.push(
      `<strong>${metresSoumis.length} métré${metresSoumis.length > 1 ? 's' : ''} sous-traitant à valider</strong> : ` +
        metresSoumis
          .slice(0, 10)
          .map((m) => `${e(m.soustraitant?.nom || '')} — ${e(m.chantier?.nomChantier || '')} (${dateCourte(m.createdAt)})`)
          .join(' · ') +
        (metresSoumis.length > 10 ? ` · + ${metresSoumis.length - 10}` : '')
    )
  }
  if (savOuverts) aTraiter.push(`<strong>${savOuverts} ticket${savOuverts > 1 ? 's' : ''} SAV ouvert${savOuverts > 1 ? 's' : ''}</strong>${savUrgents ? `, dont ${savUrgents} urgent${savUrgents > 1 ? 's' : ''}` : ''}`)
  if (contratsAEcheance) {
    aTraiter.push(
      `<strong>${contratsAEcheance} contrat${contratsAEcheance > 1 ? 's' : ''} sous-traitant à échéance</strong> (30 jours ou expiré)` +
        (contratsBloques ? `, dont ${contratsBloques} bloqué${contratsBloques > 1 ? 's' : ''} (représentant incomplet)` : '')
    )
  }
  if (sansNumero) aTraiter.push(`<strong>${sansNumero} chantier${sansNumero > 1 ? 's' : ''} sans numéro Checkinatwork</strong>`)
  blocs.push(sousTitre('À traiter'))
  blocs.push(aTraiter.length ? liste(aTraiter) : paragraphe('Rien en attente. 👍'))

  const societe = await societeEmail()
  const objet = `📊 Activité ${societe.nom} — semaine du ${du} au ${au}`
  const html = gabaritEmail({
    titre: `Activité de la semaine`,
    apercu: `${enCours.length} chantiers en cours · ${p.suivie} : ${euro(totalSuivie)} · à facturer : ${euro(totalAFacturer)}`,
    contenuHtml: paragraphe(`Semaine du ${du} au ${au}.`) + blocs.join('\n'),
    bouton: lienApp ? { libelle: 'Ouvrir OpenBTP', url: `${lienApp}/dashboard` } : undefined,
    mention: 'Rapport envoyé chaque vendredi à midi aux administrateurs.',
    societe,
  })

  const texte = [
    `Activité de la semaine du ${du} au ${au}`,
    '',
    `Chantiers en cours : ${enCours.length} — à venir / en préparation : ${aVenir.length}`,
    `États ${p.suivie}${p.enCloture ? ' (en clôture)' : ''} : ${etatsSuivie.length} état(s), ${finalises} finalisé(s), ${euro(totalSuivie)}` +
      (evolution === null ? '' : ` (${evolution >= 0 ? '+' : ''}${evolution} % vs ${p.dernierClos})`),
    sansEtat.length ? `Chantiers en cours sans état : ${sansEtat.map((c) => c.nom).join(', ')}` : '',
    `À facturer : ${euro(totalAFacturer)}`,
    `Devis : ${devisSemaine.length} créés, ${devisAttente.length} en attente, ${devisAcceptes.length} acceptés`,
    `Métrés à valider : ${metresSoumis.length} — SAV ouverts : ${savOuverts} — contrats à échéance : ${contratsAEcheance} — chantiers sans n° Checkinatwork : ${sansNumero}`,
  ]
    .filter(Boolean)
    .join('\n')

  return { html, texte, objet, graphique }
}

/** Construit et envoie le rapport à tous les administrateurs. */
export async function envoyerRapportHebdo(maintenant = new Date()) {
  const r = await construireRapportHebdo(maintenant)
  const destinataires = await getAdminEmails()
  if (!destinataires.length) return { success: false, message: 'Aucun administrateur trouvé', recipients: 0 }

  let envoyes = 0
  for (const to of destinataires) {
    const envoi = await envoyerEmailRappel({
      to,
      subject: r.objet,
      html: r.html,
      text: r.texte,
      attachments: r.graphique
        ? [{ filename: 'etats-avancement.png', content: r.graphique, contentType: 'image/png', cid: 'graphique-etats' }]
        : undefined,
    })
    if (envoi.ok) envoyes++
    else console.error(`❌ [RAPPORT HEBDO] Envoi impossible à ${to}: ${envoi.erreur}`)
  }
  return { success: envoyes > 0, message: `Rapport envoyé à ${envoyes}/${destinataires.length} administrateur(s)`, recipients: envoyes }
}

// HTML de l'« Attestation de rappels » (export PDF) : document remis à
// l'inspection pour un sous-traitant et une période. Module pur — les données
// viennent telles quelles du journal `rappel_checkin_log`.
//
// Les rappels du mode test n'y figurent jamais : ils ne sont pas partis chez
// le sous-traitant.

import { joursFeriesBelges } from './jours-feries'

export interface LigneJournal {
  dateRappel: string
  createdAt: Date
  destinataire: string
  contratReference: string | null
  contratVersion: string | null
  messageId: string | null
  statut: string
  erreur: string | null
  contenuTexte: string
  chantiersSnapshot: string
}

interface ChantierSnapshot {
  numero: string | null
  client: string
  chantier: string
  adresse: string
}

export interface DonneesAttestation {
  societe: { nom: string; adresse: string; tva: string; logo?: string | null }
  soustraitant: { nom: string; tva: string | null; representant: string | null }
  du: string // AAAA-MM-JJ
  au: string
  lignes: LigneJournal[] // triées par date croissante
  editeLe: Date
}

const e = (s: string | null | undefined) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const dateFr = (iso: string) => iso.split('-').reverse().join('/')
const intervalle = (du: string, au: string) => (du === au ? `le ${dateFr(du)}` : `du ${dateFr(du)} au ${dateFr(au)}`)

const heureBxl = (d: Date) =>
  new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(d)

const horodatageBxl = (d: Date) =>
  new Intl.DateTimeFormat('fr-BE', {
    timeZone: 'Europe/Brussels',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)

/** Jours ouvrables (lun.–ven., hors fériés légaux belges) de la période. */
export function joursOuvrables(du: string, au: string): string[] {
  const feries = new Set<string>()
  for (let a = Number(du.slice(0, 4)); a <= Number(au.slice(0, 4)); a++) {
    joursFeriesBelges(a).forEach((f) => feries.add(f.date))
  }
  const res: string[] = []
  const d = new Date(`${du}T12:00:00Z`)
  const fin = new Date(`${au}T12:00:00Z`)
  while (d <= fin) {
    const iso = d.toISOString().slice(0, 10)
    const j = d.getUTCDay()
    if (j >= 1 && j <= 5 && !feries.has(iso)) res.push(iso)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return res
}

/** Regroupe les valeurs identiques consécutives : [{valeur, du, au, n}]. */
function periodes<T>(lignes: LigneJournal[], cle: (l: LigneJournal) => string, valeur: (l: LigneJournal) => T) {
  const res: { valeur: T; du: string; au: string; n: number }[] = []
  let cleCourante: string | null = null
  for (const l of lignes) {
    const k = cle(l)
    if (k === cleCourante) {
      const p = res[res.length - 1]
      p.au = l.dateRappel
      p.n++
    } else {
      res.push({ valeur: valeur(l), du: l.dateRappel, au: l.dateRappel, n: 1 })
      cleCourante = k
    }
  }
  return res
}

export function construireAttestationHtml(d: DonneesAttestation): string {
  const envoyes = d.lignes.filter((l) => l.statut === 'ENVOYE')
  const joursAvecRappel = new Set(envoyes.map((l) => l.dateRappel))
  const ouvrables = joursOuvrables(d.du, d.au)
  const joursSansRappel = ouvrables.filter((j) => !joursAvecRappel.has(j))

  // Texte type : identique d'un jour à l'autre hormis la date → regroupé.
  const textes = periodes(
    envoyes,
    (l) => l.contenuTexte.split(dateFr(l.dateRappel)).join('{date}'),
    (l) => l.contenuTexte
  )
  const listes = periodes(
    envoyes,
    (l) => l.chantiersSnapshot,
    (l) => {
      try {
        return JSON.parse(l.chantiersSnapshot) as ChantierSnapshot[]
      } catch {
        return [] as ChantierSnapshot[]
      }
    }
  )

  const lignesTableau = d.lignes
    .map(
      (l) => `<tr>
  <td>${dateFr(l.dateRappel)}</td>
  <td>${heureBxl(l.createdAt)}</td>
  <td>${e(l.destinataire)}</td>
  <td>${e(l.contratReference)}</td>
  <td class="mono">${e(l.messageId)}</td>
  <td>${l.statut === 'ENVOYE' ? 'Envoyé' : `<span class="ko">Échec</span>${l.erreur ? ` — ${e(l.erreur)}` : ''}`}</td>
</tr>`
    )
    .join('\n')

  const sectionTextes = textes
    .map(
      (t, i) => `<h3>Texte ${textes.length > 1 ? `n° ${i + 1} ` : ''}— rappels ${intervalle(t.du, t.au)} (${t.n})</h3>
<p class="note">Reproduction exacte du rappel envoyé le ${dateFr(t.du)} ; les autres rappels de cette période ne diffèrent que par leur date.</p>
<pre>${e(t.valeur)}</pre>`
    )
    .join('\n')

  const sectionListes = listes
    .map(
      (p) => `<h3>Liste en vigueur ${intervalle(p.du, p.au)} — ${p.valeur.length} chantier${p.valeur.length > 1 ? 's' : ''}</h3>
<table><thead><tr><th>N° Checkinatwork</th><th>Client</th><th>Chantier</th><th>Adresse</th></tr></thead><tbody>
${p.valeur.map((c) => `<tr><td class="mono">${e(c.numero) || '—'}</td><td>${e(c.client)}</td><td>${e(c.chantier)}</td><td>${e(c.adresse)}</td></tr>`).join('\n')}
</tbody></table>`
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Attestation de rappels</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; }
  h1 { font-size: 15pt; margin: 0 0 4px; }
  h2 { font-size: 12pt; margin: 22px 0 6px; border-bottom: 1px solid #999; padding-bottom: 2px; }
  h3 { font-size: 10.5pt; margin: 14px 0 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  th, td { border: 1px solid #bbb; padding: 3px 5px; text-align: left; vertical-align: top; }
  th { background: #eee; }
  tr { page-break-inside: avoid; }
  .mono { font-family: 'Courier New', monospace; word-break: break-all; }
  .ko { color: #b91c1c; font-weight: bold; }
  .note { color: #555; font-size: 8.5pt; margin: 0 0 4px; }
  pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 8pt; border: 1px solid #ccc; padding: 8px; background: #fafafa; }
  .entete { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .entete img { max-height: 50px; max-width: 180px; }
  .parties td { border: none; padding: 1px 8px 1px 0; font-size: 10pt; }
  .resume td { font-size: 10pt; }
</style></head>
<body>
<div class="entete">
  <div>
    <h1>Attestation de rappels</h1>
    <div>Enregistrement des présences (Checkinatwork) et LIMOSA</div>
  </div>
  ${d.societe.logo ? `<img src="${e(d.societe.logo)}" alt="">` : ''}
</div>

<table class="parties">
  <tr><td><strong>Entrepreneur principal</strong></td><td>${e(d.societe.nom)} — ${e(d.societe.adresse)} — ${e(d.societe.tva)}</td></tr>
  <tr><td><strong>Sous-traitant</strong></td><td>${e(d.soustraitant.nom)}${d.soustraitant.tva ? ` — ${e(d.soustraitant.tva)}` : ''}</td></tr>
  ${d.soustraitant.representant ? `<tr><td><strong>Représentant</strong></td><td>${e(d.soustraitant.representant)}</td></tr>` : ''}
  <tr><td><strong>Période</strong></td><td>du ${dateFr(d.du)} au ${dateFr(d.au)}</td></tr>
  <tr><td><strong>Édité le</strong></td><td>${horodatageBxl(d.editeLe)}</td></tr>
</table>

<p>${e(d.societe.nom)} atteste avoir adressé au sous-traitant ci-dessus, par email, les rappels écrits
repris ci-dessous concernant l'obligation d'enregistrer toute personne dans Checkinatwork avant son entrée
sur chantier, la déclaration LIMOSA et l'interdiction d'accès au chantier de toute personne non enregistrée.
Les données proviennent du journal des envois d'OpenBTP, enregistré automatiquement au moment de chaque envoi
(texte exact, liste des chantiers communiqués et identifiant du message SMTP).</p>

<h2>Résumé</h2>
<table class="resume">
  <tr><td>Rappels envoyés</td><td><strong>${envoyes.length}</strong></td></tr>
  <tr><td>Jours ouvrables de la période (hors week-ends et jours fériés légaux)</td><td>${ouvrables.length}</td></tr>
  <tr><td>Jours ouvrables couverts par au moins un rappel</td><td>${ouvrables.length - joursSansRappel.length}</td></tr>
  ${d.lignes.length - envoyes.length ? `<tr><td>Tentatives en échec</td><td>${d.lignes.length - envoyes.length}</td></tr>` : ''}
</table>
${joursSansRappel.length ? `<p class="note">Jours ouvrables sans rappel envoyé : ${joursSansRappel.map(dateFr).join(', ')}.</p>` : ''}

<h2>Journal des rappels</h2>
${d.lignes.length ? `<table><thead><tr><th>Date</th><th>Heure</th><th>Destinataire</th><th>Contrat</th><th>Message-ID</th><th>Statut</th></tr></thead><tbody>
${lignesTableau}
</tbody></table>` : '<p>Aucun rappel sur la période.</p>'}

${sectionTextes ? `<h2>Texte des rappels</h2>\n${sectionTextes}` : ''}

${sectionListes ? `<h2>Chantiers et numéros Checkinatwork transmis avec les rappels</h2>
<p class="note">Chaque rappel contient un lien vers une page listant les chantiers en cours, à venir et en préparation,
avec leur numéro d'enregistrement Checkinatwork. Voici le contenu exact de cette page au moment des envois ; une
nouvelle liste apparaît chaque fois qu'un chantier a été ajouté, retiré ou modifié.</p>
${sectionListes}` : ''}
</body></html>`
}

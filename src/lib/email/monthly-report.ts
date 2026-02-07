import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'
import { ChartJSNodeCanvas } from 'chartjs-node-canvas'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EtatRow {
  id: number
  chantierId: string | null
  nomChantier: string
  client: string | null
  numero: number
  mois: string | null
  date: string | null
  estFinalise: boolean
  montantBase: number
  montantAvenants: number
  montantTotal: number
  factureNumero: string | null
}

interface MonthData {
  label: string // "Janvier 2026"
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MOIS_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const formatEuro = (v: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

/** Retourne "Janvier 2026" pour un objet Date */
function toMoisLabel(d: Date): string {
  return `${MOIS_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

/** Retourne les 6 derniers mois (du plus ancien au plus récent), mois courant exclu */
function getLast6Months(refDate: Date): string[] {
  const labels: string[] = []
  for (let i = 6; i >= 1; i--) {
    const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1)
    labels.push(toMoisLabel(d))
  }
  return labels
}

// ─── Récupération des données ────────────────────────────────────────────────

const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)

async function getEtatsForMonth(moisLabel: string): Promise<EtatRow[]> {
  const etats = await prisma.etatAvancement.findMany({
    where: { mois: moisLabel },
    orderBy: [{ date: 'desc' }, { numero: 'desc' }],
    include: {
      lignes: true,
      avenants: true,
      Chantier: {
        select: {
          nomChantier: true,
          chantierId: true,
          client: { select: { nom: true } }
        }
      }
    }
  })

  return etats.map((e) => {
    const totalLignes = e.lignes.reduce((sum, l) => sum + num(l.montantActuel), 0)
    const totalAvenants = e.avenants.reduce((sum, a) => sum + num(a.montantActuel), 0)
    return {
      id: e.id,
      chantierId: e.Chantier?.chantierId ?? null,
      nomChantier: e.Chantier?.nomChantier ?? 'Chantier',
      client: e.Chantier?.client?.nom ?? null,
      numero: e.numero,
      mois: e.mois ?? null,
      date: e.date ? new Date(e.date).toISOString() : null,
      estFinalise: e.estFinalise,
      montantBase: Math.round(totalLignes * 100) / 100,
      montantAvenants: Math.round(totalAvenants * 100) / 100,
      montantTotal: Math.round((totalLignes + totalAvenants) * 100) / 100,
      factureNumero: e.factureNumero ?? null
    }
  })
}

async function getMonthlyTotals(labels: string[]): Promise<MonthData[]> {
  const result: MonthData[] = []
  for (const label of labels) {
    const rows = await getEtatsForMonth(label)
    const total = rows.reduce((sum, r) => sum + r.montantTotal, 0)
    result.push({ label, total: Math.round(total * 100) / 100 })
  }
  return result
}

async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true }
  })
  return admins.map((a) => a.email).filter(Boolean)
}

// ─── Génération des graphiques ───────────────────────────────────────────────

async function generateBarChart(monthlyData: MonthData[]): Promise<string> {
  const width = 600
  const height = 300
  const chartCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#ffffff' })

  const buffer = await chartCanvas.renderToBuffer({
    type: 'bar',
    data: {
      labels: monthlyData.map((m) => m.label.split(' ')[0]), // Juste le nom du mois
      datasets: [
        {
          label: 'Montant total (€)',
          data: monthlyData.map((m) => m.total),
          backgroundColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1 ? '#4F46E5' : '#A5B4FC'
          ),
          borderColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1 ? '#3730A3' : '#6366F1'
          ),
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Évolution des montants - 6 derniers mois',
          font: { size: 16, weight: 'bold' },
          color: '#1F2937'
        },
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: string | number) =>
              new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(Number(value)) + ' €'
          }
        }
      }
    }
  })

  return buffer.toString('base64')
}

async function generateDoughnutChart(rows: EtatRow[]): Promise<string> {
  const width = 350
  const height = 350
  const chartCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#ffffff' })

  const finalises = rows.filter((r) => r.estFinalise).length
  const enCours = rows.filter((r) => !r.estFinalise).length

  const buffer = await chartCanvas.renderToBuffer({
    type: 'doughnut',
    data: {
      labels: ['Finalisés', 'En cours'],
      datasets: [
        {
          data: [finalises, enCours],
          backgroundColor: ['#10B981', '#F59E0B'],
          borderColor: ['#059669', '#D97706'],
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Répartition des statuts',
          font: { size: 14, weight: 'bold' },
          color: '#1F2937'
        },
        legend: {
          position: 'bottom',
          labels: { font: { size: 12 } }
        }
      }
    }
  })

  return buffer.toString('base64')
}

// ─── Template HTML ───────────────────────────────────────────────────────────

function buildEmailHTML(
  moisLabel: string,
  rows: EtatRow[],
  barChartBase64: string,
  doughnutBase64: string,
  monthlyData: MonthData[],
  companyName: string
): string {
  const totalBase = rows.reduce((s, r) => s + r.montantBase, 0)
  const totalAvenants = rows.reduce((s, r) => s + r.montantAvenants, 0)
  const grandTotal = rows.reduce((s, r) => s + r.montantTotal, 0)
  const totalFacture = rows
    .filter((r) => r.factureNumero != null && r.factureNumero.trim() !== '')
    .reduce((s, r) => s + r.montantTotal, 0)
  const nbFinalises = rows.filter((r) => r.estFinalise).length
  const nbEnCours = rows.filter((r) => !r.estFinalise).length

  const previousMonth = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2] : null
  const currentMonth = monthlyData[monthlyData.length - 1]
  const evolution = previousMonth && previousMonth.total > 0
    ? (((currentMonth.total - previousMonth.total) / previousMonth.total) * 100).toFixed(1)
    : null

  const tableRows = rows.map((r) => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #374151;">${r.nomChantier}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">${r.numero}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">${r.client ?? '-'}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: right; color: #374151;">${formatEuro(r.montantBase)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: right; color: #374151;">${formatEuro(r.montantAvenants)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; text-align: right; font-weight: 600; color: #111827;">${formatEuro(r.montantTotal)}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; text-align: center;">
        <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; ${
          r.estFinalise
            ? 'background-color: #D1FAE5; color: #065F46;'
            : 'background-color: #FEF3C7; color: #92400E;'
        }">
          ${r.estFinalise ? 'Finalisé' : 'En cours'}
        </span>
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #E5E7EB; font-size: 13px; color: #6B7280;">${r.factureNumero ?? '-'}</td>
    </tr>
  `).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 24px 0;">
    <tr>
      <td align="center">
        <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">
          
          <!-- En-tête -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                📊 Récapitulatif mensuel
              </h1>
              <p style="margin: 8px 0 0; color: #C7D2FE; font-size: 16px;">
                États d'avancement — ${moisLabel}
              </p>
              <p style="margin: 4px 0 0; color: #A5B4FC; font-size: 13px;">
                ${companyName} • Généré le ${new Date().toLocaleDateString('fr-FR')}
              </p>
            </td>
          </tr>

          <!-- KPIs -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="25%" style="padding: 8px;">
                    <div style="background: #EEF2FF; border-radius: 8px; padding: 16px; text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: #4F46E5;">${rows.length}</div>
                      <div style="font-size: 12px; color: #6366F1; margin-top: 4px;">États</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <div style="background: #D1FAE5; border-radius: 8px; padding: 16px; text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: #059669;">${nbFinalises}</div>
                      <div style="font-size: 12px; color: #10B981; margin-top: 4px;">Finalisés</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <div style="background: #FEF3C7; border-radius: 8px; padding: 16px; text-align: center;">
                      <div style="font-size: 24px; font-weight: 700; color: #D97706;">${nbEnCours}</div>
                      <div style="font-size: 12px; color: #F59E0B; margin-top: 4px;">En cours</div>
                    </div>
                  </td>
                  <td width="25%" style="padding: 8px;">
                    <div style="background: #F3E8FF; border-radius: 8px; padding: 16px; text-align: center;">
                      <div style="font-size: 18px; font-weight: 700; color: #7C3AED;">${formatEuro(grandTotal)}</div>
                      <div style="font-size: 12px; color: #8B5CF6; margin-top: 4px;">Total</div>
                    </div>
                  </td>
                </tr>
              </table>
              ${evolution !== null ? `
              <div style="margin-top: 12px; text-align: center;">
                <span style="font-size: 13px; color: #6B7280;">
                  Évolution vs mois précédent : 
                  <strong style="color: ${Number(evolution) >= 0 ? '#059669' : '#DC2626'};">
                    ${Number(evolution) >= 0 ? '↗' : '↘'} ${evolution}%
                  </strong>
                </span>
              </div>
              ` : ''}
            </td>
          </tr>

          <!-- Graphique barres -->
          <tr>
            <td style="padding: 24px 40px 0; text-align: center;">
              <img src="cid:barchart" alt="Graphique évolution 6 mois" width="600" style="max-width: 100%; height: auto; border-radius: 8px;" />
            </td>
          </tr>

          <!-- Graphique doughnut + légende -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="text-align: center; vertical-align: top;">
                    <img src="cid:doughnut" alt="Répartition statuts" width="280" style="max-width: 100%; height: auto;" />
                  </td>
                  <td width="50%" style="vertical-align: middle; padding-left: 16px;">
                    <h3 style="margin: 0 0 16px; font-size: 16px; color: #1F2937;">Synthèse financière</h3>
                    <table cellpadding="4" cellspacing="0" style="width: 100%;">
                      <tr>
                        <td style="font-size: 13px; color: #6B7280;">Montant base</td>
                        <td style="font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${formatEuro(totalBase)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6B7280;">Avenants</td>
                        <td style="font-size: 13px; font-weight: 600; color: #111827; text-align: right;">${formatEuro(totalAvenants)}</td>
                      </tr>
                      <tr>
                        <td style="font-size: 13px; color: #6B7280; padding-top: 8px; border-top: 1px solid #E5E7EB;">Total période</td>
                        <td style="font-size: 15px; font-weight: 700; color: #4F46E5; text-align: right; padding-top: 8px; border-top: 1px solid #E5E7EB;">${formatEuro(grandTotal)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Tableau détaillé -->
          <tr>
            <td style="padding: 24px 40px 0;">
              <h3 style="margin: 0 0 12px; font-size: 16px; color: #1F2937;">Détail des états d'avancement</h3>
              <div style="overflow-x: auto; border-radius: 8px; border: 1px solid #E5E7EB;">
                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                  <thead>
                    <tr style="background-color: #F9FAFB;">
                      <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Chantier</th>
                      <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">N°</th>
                      <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Client</th>
                      <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Base</th>
                      <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Avenants</th>
                      <th style="padding: 10px 12px; text-align: right; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Total</th>
                      <th style="padding: 10px 12px; text-align: center; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Statut</th>
                      <th style="padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 600; color: #6B7280; border-bottom: 2px solid #E5E7EB;">Facture</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rows.length > 0 ? tableRows : `
                    <tr>
                      <td colspan="8" style="padding: 24px; text-align: center; color: #9CA3AF; font-size: 14px;">
                        Aucun état d'avancement pour cette période
                      </td>
                    </tr>
                    `}
                  </tbody>
                  ${rows.length > 0 ? `
                  <tfoot>
                    <tr style="background-color: #F9FAFB;">
                      <td colspan="3" style="padding: 10px 12px; font-size: 13px; font-weight: 700; color: #111827; border-top: 2px solid #E5E7EB;">TOTAL</td>
                      <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 700; color: #111827; border-top: 2px solid #E5E7EB;">${formatEuro(totalBase)}</td>
                      <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 700; color: #111827; border-top: 2px solid #E5E7EB;">${formatEuro(totalAvenants)}</td>
                      <td style="padding: 10px 12px; text-align: right; font-size: 13px; font-weight: 700; color: #4F46E5; border-top: 2px solid #E5E7EB;">${formatEuro(grandTotal)}</td>
                      <td style="border-top: 2px solid #E5E7EB;"></td>
                      <td style="padding: 10px 12px; text-align: left; font-size: 13px; font-weight: 700; color: #059669; border-top: 2px solid #E5E7EB;">${formatEuro(totalFacture)}</td>
                    </tr>
                  </tfoot>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>

          <!-- Pied de page -->
          <tr>
            <td style="padding: 32px 40px;">
              <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 0 0 16px;" />
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
                Ce mail a été envoyé automatiquement par ${companyName}.<br/>
                Récapitulatif généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Fonction principale ─────────────────────────────────────────────────────

/**
 * Génère et envoie le rapport mensuel des états d'avancement.
 * @param targetDate Date de référence (par défaut : aujourd'hui → récap du mois précédent)
 * @returns Objet avec succès, nombre de destinataires, et période concernée
 */
export async function sendMonthlyReport(targetDate?: Date) {
  const now = targetDate ?? new Date()
  // Mois précédent
  const refDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const moisLabel = toMoisLabel(refDate)

  console.log(`📧 [RAPPORT MENSUEL] Génération du rapport pour ${moisLabel}...`)

  // Récupérer les données
  const rows = await getEtatsForMonth(moisLabel)
  const last6Labels = getLast6Months(now)
  const monthlyData = await getMonthlyTotals(last6Labels)

  // Récupérer le nom de l'entreprise
  const settings = await prisma.companysettings.findFirst() as { name?: string } | null
  const companyName = settings?.name || 'OpenBTP'

  // Générer les graphiques
  const barChartBase64 = await generateBarChart(monthlyData)
  const doughnutBase64 = await generateDoughnutChart(rows)

  // Construire le HTML
  const html = buildEmailHTML(moisLabel, rows, barChartBase64, doughnutBase64, monthlyData, companyName)

  // Récupérer les admins
  const adminEmails = await getAdminEmails()
  if (adminEmails.length === 0) {
    console.warn('⚠️ [RAPPORT MENSUEL] Aucun admin trouvé, envoi annulé.')
    return { success: false, message: 'Aucun administrateur trouvé', recipients: 0, period: moisLabel }
  }

  // Envoyer à chaque admin avec les images en pièces jointes inline (CID)
  const subject = `📊 Récapitulatif états d'avancement — ${moisLabel}`
  let sent = 0

  for (const email of adminEmails) {
    try {
      // On utilise sendEmailWithAttachment pour pouvoir attacher les images CID
      const nodemailer = await import('nodemailer')
      const settingsDb = await prisma.companysettings.findFirst() as unknown as {
        emailHost?: string; emailPort?: string; emailSecure?: boolean
        emailUser?: string; emailPassword?: string; emailFrom?: string; emailFromName?: string
      }

      const transporter = nodemailer.default.createTransport({
        host: settingsDb?.emailHost || process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(settingsDb?.emailPort || process.env.EMAIL_PORT || '587'),
        secure: settingsDb?.emailSecure || process.env.EMAIL_SECURE === 'true',
        auth: {
          user: settingsDb?.emailUser || process.env.EMAIL_USER || '',
          pass: settingsDb?.emailPassword || process.env.EMAIL_PASSWORD || ''
        }
      })

      const fromEmail = settingsDb?.emailFrom || process.env.EMAIL_FROM || 'noreply@example.com'
      const fromName = settingsDb?.emailFromName || process.env.EMAIL_FROM_NAME || 'Secotech'

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: email,
        subject,
        html,
        attachments: [
          {
            filename: 'barchart.png',
            content: Buffer.from(barChartBase64, 'base64'),
            cid: 'barchart'
          },
          {
            filename: 'doughnut.png',
            content: Buffer.from(doughnutBase64, 'base64'),
            cid: 'doughnut'
          }
        ]
      })

      sent++
      console.log(`  ✅ Email envoyé à ${email}`)
    } catch (err) {
      console.error(`  ❌ Erreur envoi à ${email}:`, err)
    }
  }

  console.log(`📧 [RAPPORT MENSUEL] ${sent}/${adminEmails.length} emails envoyés pour ${moisLabel}`)

  return {
    success: sent > 0,
    message: `Rapport ${moisLabel} envoyé à ${sent}/${adminEmails.length} administrateur(s)`,
    recipients: sent,
    period: moisLabel
  }
}

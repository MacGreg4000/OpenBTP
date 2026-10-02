// Données et graphique des états d'avancement, utilisés par le rapport
// d'activité hebdomadaire (src/lib/rapports/rapport-hebdo.ts).

import { prisma } from '@/lib/prisma/client'
import path from 'path'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EtatRow {
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

export interface MonthData {
  label: string // "Janvier 2026"
  total: number
}

// ─── Récupération des données ────────────────────────────────────────────────

const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0)

export async function getEtatsForMonth(moisLabel: string): Promise<EtatRow[]> {
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

export async function getMonthlyTotals(labels: string[]): Promise<MonthData[]> {
  const result: MonthData[] = []
  for (const label of labels) {
    const rows = await getEtatsForMonth(label)
    const total = rows.reduce((sum, r) => sum + r.montantTotal, 0)
    result.push({ label, total: Math.round(total * 100) / 100 })
  }
  return result
}

export async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true }
  })
  return admins.map((a) => a.email).filter(Boolean)
}

// ─── Génération des graphiques ───────────────────────────────────────────────

// Résoudre le chemin vers les polices (fonctionne en dev et en prod)
const fontsDir = path.join(process.cwd(), 'public', 'fonts')

async function createChartCanvas(width: number, height: number) {
  const { ChartJSNodeCanvas } = await import('chartjs-node-canvas')
  return new ChartJSNodeCanvas({
    width,
    height,
    backgroundColour: '#ffffff',
    chartCallback: (ChartJS) => {
      ChartJS.defaults.font.family = 'Roboto'
    },
    plugins: {
      requireLegacy: [],
      globalVariableLegacy: [],
      modern: [],
    }
  })
}

// Enregistrer les polices une seule fois
let fontsRegistered = false
function registerFonts(canvas: Awaited<ReturnType<typeof createChartCanvas>>) {
  if (fontsRegistered) return
  try {
    canvas.registerFont(path.join(fontsDir, 'Roboto-Regular.ttf'), { family: 'Roboto', weight: 'normal' })
    canvas.registerFont(path.join(fontsDir, 'Roboto-Bold.ttf'), { family: 'Roboto', weight: 'bold' })
    fontsRegistered = true
    console.log('✅ Polices Roboto enregistrées pour les graphiques')
  } catch (err) {
    console.warn('⚠️ Impossible d\'enregistrer les polices Roboto:', err)
  }
}

export async function generateBarChart(monthlyData: MonthData[], titre = 'Évolution des montants - 6 derniers mois'): Promise<string> {
  const width = 600
  const height = 300
  const chartCanvas = await createChartCanvas(width, height)
  registerFonts(chartCanvas)

  const buffer = await chartCanvas.renderToBuffer({
    type: 'bar',
    data: {
      labels: monthlyData.map((m) => m.label.split(' ')[0]), // Juste le nom du mois
      datasets: [
        {
          label: 'Montant total (€)',
          data: monthlyData.map((m) => m.total),
          // Couleurs OpenBTP : dernier mois en orange, les autres en bleu nuit
          backgroundColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1 ? '#FF6B00' : '#1E3A5F'
          ),
          borderColor: monthlyData.map((_, i) =>
            i === monthlyData.length - 1 ? '#E85F00' : '#05122B'
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
          text: titre,
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

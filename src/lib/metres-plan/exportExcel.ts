import ExcelJS from 'exceljs'
import type { Project, MeasurementType } from '@/types/metres-plan'

const TYPE_LABELS: Record<MeasurementType, string> = {
  length: 'Longueur',
  area: 'Surface',
  count: 'Compteur',
  roof: 'Toiture',
  subtract: 'Déduction',
  wall: 'Surface mur',
}

// ── Styles helpers ────────────────────────────────────────────────────────────
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' },
}
const STRIPE_FILL: ExcelJS.Fill = {
  type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true }

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => { cell.fill = HEADER_FILL; cell.font = HEADER_FONT })
}
function stripeRow(row: ExcelJS.Row) {
  row.eachCell(cell => { cell.fill = STRIPE_FILL })
}

function downloadBuffer(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────

export async function exportExcel(project: Project) {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MétréPlan'
  wb.created = new Date()

  // ─── Sheet 0: Bordereau de métrés (si postes) ───────────────────────────
  if (project.postes && project.postes.length > 0) {
    const ws = wb.addWorksheet('Bordereau')
    ws.columns = [
      { width: 32 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 65 },
    ]

    ws.addRow([`Bordereau de métrés — ${project.name}`]).font = { bold: true, size: 13 }
    ws.addRow(['Projet:', project.name])
    ws.addRow(['Date:', new Date().toLocaleDateString('fr-FR')])
    ws.addRow([])
    styleHeader(ws.addRow(['Désignation', 'Unité', 'Total', 'Nb mesures', 'Détail (mesures)']))

    let ri = 0
    for (const poste of project.postes) {
      const assigned = project.measurements.filter(m => m.posteId === poste.id)
      const total = assigned.reduce((sum, m) => sum + m.value, 0)
      const unit = assigned[0]?.unit ?? '—'
      const detail = assigned.map(m => `${m.name}: ${m.value.toFixed(3)} ${m.unit} (p.${m.page})`).join(' | ')
      const row = ws.addRow([poste.name, unit, parseFloat(total.toFixed(3)), assigned.length, detail])
      if (ri % 2 === 0) stripeRow(row)
      ri++
    }

    const unassigned = project.measurements.filter(m => !m.posteId)
    if (unassigned.length > 0) {
      ws.addRow([])
      ws.addRow([`${unassigned.length} mesure(s) non assignée(s) à un poste`]).font = { italic: true, color: { argb: 'FF94A3B8' } }
    }
  }

  // ─── Sheet 1: Résumé ─────────────────────────────────────────────────────
  const totals: Record<string, { type: string; unit: string; total: number; count: number }> = {}
  for (const m of project.measurements) {
    const key = m.type === 'count' ? `count:${m.name}` : m.type
    if (!totals[key]) totals[key] = { type: TYPE_LABELS[m.type], unit: m.unit, total: 0, count: 0 }
    totals[key].total += m.value
    totals[key].count++
  }

  const wsSum = wb.addWorksheet('Résumé')
  wsSum.columns = [{ width: 16 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 12 }]
  wsSum.addRow(['MétréPlan — Résumé du projet']).font = { bold: true, size: 13 }
  wsSum.addRow(['Projet:', project.name])
  wsSum.addRow(['Date:', new Date().toLocaleDateString('fr-FR')])
  wsSum.addRow(['Fichier PDF:', project.pdfFileName])
  wsSum.addRow(['Calibration:', project.calibration
    ? `1px = ${project.calibration.ratio.toFixed(5)} ${project.calibration.unit}`
    : 'Non calibré'])
  wsSum.addRow([])
  styleHeader(wsSum.addRow(['Type', 'Sous-type', 'Quantité', 'Total', 'Unité']))
  for (const [key, t] of Object.entries(totals)) {
    wsSum.addRow([
      t.type,
      key.includes(':') ? key.split(':')[1] : '',
      t.count,
      t.type === 'Compteur' ? t.count : parseFloat(t.total.toFixed(3)),
      t.type === 'Compteur' ? 'unités' : t.unit,
    ])
  }

  // ─── Sheet 2: Toutes les mesures ─────────────────────────────────────────
  const wsAll = wb.addWorksheet('Toutes les mesures')
  wsAll.columns = [
    { width: 14 }, { width: 22 }, { width: 14 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 27 }, { width: 12 }, { width: 27 },
  ]
  styleHeader(wsAll.addRow(['ID', 'Nom', 'Type', 'Page', 'Valeur', 'Unité', 'Poste', 'Pente', 'Note']))
  let ri2 = 0
  for (const m of project.measurements) {
    const posteName = project.postes?.find(p => p.id === m.posteId)?.name ?? ''
    const row = wsAll.addRow([
      m.id, m.name, TYPE_LABELS[m.type], m.page,
      m.type === 'count' ? 1 : m.value, m.unit,
      posteName,
      m.slopeFactor ? `×${m.slopeFactor.toFixed(4)}` : '',
      m.note || '',
    ])
    if (ri2 % 2 === 0) stripeRow(row)
    ri2++
  }

  // ─── One sheet per page ──────────────────────────────────────────────────
  const pages = [...new Set(project.measurements.map(m => m.page))].sort((a, b) => a - b)
  for (const page of pages) {
    const ws = wb.addWorksheet(`Page ${page}`)
    ws.columns = [{ width: 22 }, { width: 14 }, { width: 14 }, { width: 10 }, { width: 22 }, { width: 12 }]
    ws.addRow([`Page ${page}`]).font = { bold: true }
    styleHeader(ws.addRow(['Nom', 'Type', 'Valeur', 'Unité', 'Poste', 'Pente']))
    for (const m of project.measurements.filter(m => m.page === page)) {
      const posteName = project.postes?.find(p => p.id === m.posteId)?.name ?? ''
      ws.addRow([
        m.name, TYPE_LABELS[m.type],
        m.type === 'count' ? 1 : m.value,
        m.unit, posteName,
        m.slopeFactor ? `×${m.slopeFactor.toFixed(4)}` : '',
      ])
    }
  }

  // ─── Métadonnées ─────────────────────────────────────────────────────────
  const wsMeta = wb.addWorksheet('Métadonnées')
  wsMeta.addRow(['Métadonnées']).font = { bold: true }
  const metaRows: [string, string | number][] = [
    ['Généré par', 'MétréPlan'],
    ['Date export', new Date().toISOString()],
    ['Projet', project.name],
    ['Calibration ratio', project.calibration?.ratio ?? 'N/A'],
    ['Calibration unité', project.calibration?.unit ?? 'N/A'],
    ['Nombre de mesures', project.measurements.length],
    ['Nombre de postes', project.postes?.length ?? 0],
    ['Nombre de pages', pages.length],
  ]
  for (const row of metaRows) wsMeta.addRow(row)

  // ─── Download ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  downloadBuffer(buffer as ArrayBuffer, `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_métré.xlsx`)
}

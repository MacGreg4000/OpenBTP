import jsPDF from 'jspdf'
import type { Project, MeasurementType } from '@/types/metres-plan'

const TYPE_LABELS: Record<MeasurementType, string> = {
  length: 'Longueur',
  area: 'Surface',
  count: 'Compteur',
  roof: 'Toiture',
  subtract: 'Déduction',
  wall: 'Surface mur',
}

export function exportPdf(project: Project) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const pageH = 297
  const margin = 20
  const contentW = pageW - margin * 2
  let y = margin

  // ── Cover / header ─────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138)
  doc.rect(0, 0, pageW, 35, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('MétréPlan', margin, 20)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Rapport de métré', margin, 28)

  y = 55
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(project.name, margin, y)
  y += 10

  const infos = [
    ['Date:', new Date().toLocaleDateString('fr-FR')],
    ['Fichier PDF:', project.pdfFileName || 'N/A'],
    ['Calibration:', project.calibration
      ? `1px = ${project.calibration.ratio.toFixed(5)} ${project.calibration.unit}`
      : 'Non calibrée'],
    ['Nombre de mesures:', project.measurements.length.toString()],
  ]
  doc.setFontSize(10)
  for (const [label, value] of infos) {
    doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(15, 23, 42)
    doc.text(value, margin + 45, y)
    y += 7
  }

  // ── Bordereau de métrés ────────────────────────────────────────────────────
  if (project.postes && project.postes.length > 0) {
    y += 10
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138)
    doc.text('Bordereau de métrés', margin + 4, y + 5.5)
    y += 13

    // Table header
    const bCols = [contentW * 0.50, contentW * 0.15, contentW * 0.20, contentW * 0.15]
    const bHeaders = ['Désignation', 'Unité', 'Total', 'Nb mes.']
    doc.setFillColor(30, 58, 138)
    doc.rect(margin, y, contentW, 7, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    let cx = margin + 2
    for (let i = 0; i < bHeaders.length; i++) { doc.text(bHeaders[i], cx, y + 5); cx += bCols[i] }
    y += 7

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
    let rowIdx = 0
    for (const poste of project.postes) {
      if (y > pageH - 25) { doc.addPage(); y = margin }
      const assigned = project.measurements.filter(m => m.posteId === poste.id)
      const total = assigned.reduce((sum, m) => sum + m.value, 0)
      const unit = assigned[0]?.unit ?? '—'

      if (rowIdx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 7, 'F') }
      doc.setTextColor(15, 23, 42)
      cx = margin + 2
      const rowVals = [
        poste.name.substring(0, 35),
        unit,
        assigned.length > 0 ? total.toFixed(3) : '—',
        assigned.length.toString(),
      ]
      for (let i = 0; i < rowVals.length; i++) { doc.text(rowVals[i], cx, y + 5); cx += bCols[i] }
      y += 7
      rowIdx++
    }
    y += 4
  }

  // ── Executive summary ──────────────────────────────────────────────────────
  y += 6
  if (y > pageH - 60) { doc.addPage(); y = margin }
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138)
  doc.text('Résumé exécutif', margin + 4, y + 5.5)
  y += 13

  const totals: Record<string, { type: string; unit: string; total: number; count: number }> = {}
  for (const m of project.measurements) {
    const key = m.type === 'count' ? `count:${m.name}` : m.type
    if (!totals[key]) totals[key] = { type: TYPE_LABELS[m.type], unit: m.unit, total: 0, count: 0 }
    totals[key].total += m.value
    totals[key].count++
  }

  doc.setFontSize(10)
  let col = 0
  const colW = contentW / 2
  for (const [key, t] of Object.entries(totals)) {
    if (y > pageH - 60) { doc.addPage(); y = margin; col = 0 }
    const x = margin + col * colW
    doc.setFillColor(col % 2 === 0 ? 239 : 248, col % 2 === 0 ? 246 : 250, col % 2 === 0 ? 255 : 252)
    doc.roundedRect(x, y, colW - 2, 22, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138); doc.setFontSize(16)
    const displayVal = t.type === 'Compteur' ? t.count.toString() : t.total.toFixed(2)
    doc.text(displayVal, x + 4, y + 12)
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139)
    doc.text(`${t.type}${key.includes(':') ? ' (' + key.split(':')[1] + ')' : ''}`, x + 4, y + 18)
    doc.text(t.type === 'Compteur' ? 'unités' : t.unit, x + colW - 20, y + 18)
    col++
    if (col >= 2) { col = 0; y += 26 }
  }
  if (col !== 0) y += 26
  y += 8

  // ── Detailed measurements table ────────────────────────────────────────────
  if (y > pageH - 60) { doc.addPage(); y = margin }
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, contentW, 8, 2, 2, 'F')
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 58, 138)
  doc.text('Détail des mesures', margin + 4, y + 5.5)
  y += 12

  const hasPosAssign = project.measurements.some(m => m.posteId)
  const cols = hasPosAssign ? [40, 20, 28, 18, 28, 22] : [50, 25, 35, 25, 30, 0]
  const headers = hasPosAssign
    ? ['Nom', 'Type', 'Valeur', 'Unité', 'Poste', 'Page']
    : ['Nom', 'Type', 'Valeur', 'Unité', 'Page', '']
  doc.setFillColor(30, 58, 138)
  doc.rect(margin, y, contentW, 7, 'F')
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold')
  let cx2 = margin + 2
  for (let i = 0; i < headers.length; i++) { if (cols[i]) { doc.text(headers[i], cx2, y + 5); cx2 += cols[i] } }
  y += 7

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9)
  let rowIdx2 = 0
  for (const m of project.measurements) {
    if (y > pageH - 25) {
      doc.addPage(); y = margin
      doc.setFillColor(30, 58, 138); doc.rect(margin, y, contentW, 7, 'F')
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold')
      cx2 = margin + 2
      for (let i = 0; i < headers.length; i++) { if (cols[i]) { doc.text(headers[i], cx2, y + 5); cx2 += cols[i] } }
      y += 7; doc.setFont('helvetica', 'normal')
    }
    if (rowIdx2 % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y, contentW, 6, 'F') }
    doc.setTextColor(15, 23, 42)
    cx2 = margin + 2
    const posteName = project.postes?.find(p => p.id === m.posteId)?.name ?? ''
    const row = hasPosAssign
      ? [m.name.substring(0, 22), TYPE_LABELS[m.type], m.type === 'count' ? '1' : m.value.toFixed(3), m.unit, posteName.substring(0, 16), m.page.toString()]
      : [m.name.substring(0, 28), TYPE_LABELS[m.type], m.type === 'count' ? '1' : m.value.toFixed(3), m.unit, m.page.toString(), '']
    for (let i = 0; i < row.length; i++) { if (cols[i]) { doc.text(row[i], cx2, y + 4.5); cx2 += cols[i] } }
    y += 6; rowIdx2++
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    doc.setFillColor(30, 58, 138)
    doc.rect(0, pageH - 10, pageW, 10, 'F')
    doc.setTextColor(255, 255, 255); doc.setFontSize(7)
    doc.text(`MétréPlan — ${project.name} — ${new Date().toLocaleDateString('fr-FR')}`, margin, pageH - 3.5)
    doc.text(`Page ${p}/${pageCount}`, pageW - margin, pageH - 3.5, { align: 'right' })
  }

  doc.save(`${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_rapport.pdf`)
}

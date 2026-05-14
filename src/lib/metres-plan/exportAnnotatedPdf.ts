import jsPDF from 'jspdf'
import type { Measurement, Project, Poste } from '@/types/metres-plan'
import { polygonCentroid } from '@/lib/metres-plan/geometry'

// Facteur d'export : le plan est rendu à 2× pour une meilleure qualité
const EXPORT_SCALE = 2

// Convertit un hex #rrggbb en rgba(r,g,b,a) pour le canvas 2D
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Résout la couleur effective d'une mesure (poste > couleur propre)
function getColor(m: Measurement, posteMap: Map<string, Poste>): string {
  if (m.posteId) {
    const p = posteMap.get(m.posteId)
    if (p) return p.color
  }
  return m.color
}

// Rectangle arrondi compatible tous navigateurs
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Dessine une étiquette centrée en (cx, cy)
function drawLabel(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  text: string,
  bgColor: string,
  textColor = 'white',
  fontSize = 11
) {
  ctx.save()
  ctx.font = `bold ${fontSize}px Arial, sans-serif`
  const tw = ctx.measureText(text).width
  const pad = 8
  const h = fontSize + 6
  const w = tw + pad * 2
  ctx.fillStyle = bgColor
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 3)
  ctx.fill()
  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, cx, cy)
  ctx.restore()
}

// Dessine une mesure sur le canvas 2D à l'échelle EXPORT_SCALE
function drawMeasurement(
  ctx: CanvasRenderingContext2D,
  m: Measurement,
  color: string,
  posteName?: string
) {
  const pts = m.points
  const s = EXPORT_SCALE
  ctx.save()

  if (m.type === 'length') {
    if (pts.length < 2) { ctx.restore(); return }
    // Trait de la polyligne
    ctx.beginPath()
    ctx.moveTo(pts[0].x * s, pts[0].y * s)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    // Points
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x * s, p.y * s, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
    // Étiquettes au milieu
    const mid = Math.floor(pts.length / 2)
    const lx = (pts[mid].x + pts[Math.max(0, mid - 1)].x) / 2 * s
    const ly = (pts[mid].y + pts[Math.max(0, mid - 1)].y) / 2 * s
    if (posteName) {
      drawLabel(ctx, lx, ly - 24, posteName, color, 'white', 9)
    }
    drawLabel(ctx, lx, ly - 8, `${m.value.toFixed(2)} ${m.unit}`, 'rgba(0,0,0,0.80)')
  }

  if (m.type === 'area' || m.type === 'roof') {
    if (pts.length < 3) { ctx.restore(); return }
    // Polygone rempli
    ctx.beginPath()
    ctx.moveTo(pts[0].x * s, pts[0].y * s)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s)
    ctx.closePath()
    ctx.fillStyle = hexToRgba(color, 0.15)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    // Étiquettes au centroïde
    const c = polygonCentroid(pts)
    const cx = c.x * s
    let cy = c.y * s
    if (posteName) {
      drawLabel(ctx, cx, cy - 18, posteName, color, 'white', 9)
    }
    drawLabel(ctx, cx, cy, `${m.value.toFixed(2)} ${m.unit}`, 'rgba(0,0,0,0.80)')
    if (m.type === 'roof' && m.slopeFactor) {
      drawLabel(ctx, cx, cy + 18, `pente ×${m.slopeFactor.toFixed(3)}`, 'rgba(0,0,0,0.80)', '#fbbf24', 9)
    }
  }

  if (m.type === 'wall') {
    if (pts.length < 2) { ctx.restore(); return }
    ctx.beginPath()
    ctx.moveTo(pts[0].x * s, pts[0].y * s)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s)
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.setLineDash([])
    pts.forEach(p => {
      ctx.beginPath()
      ctx.arc(p.x * s, p.y * s, 3, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
    })
    const mid = Math.floor(pts.length / 2)
    const lx = (pts[mid].x + pts[Math.max(0, mid - 1)].x) / 2 * s
    const ly = (pts[mid].y + pts[Math.max(0, mid - 1)].y) / 2 * s
    if (posteName) {
      drawLabel(ctx, lx, ly - 24, posteName, color, 'white', 9)
    }
    const subLabel = m.wallHeight ? `p×${m.wallHeight}` : ''
    drawLabel(ctx, lx, ly - (posteName ? 6 : 8), `${m.value.toFixed(2)} ${m.unit}${subLabel ? ` (${subLabel})` : ''}`, 'rgba(88,28,135,0.85)')
  }

  if (m.type === 'subtract') {
    if (pts.length < 3) { ctx.restore(); return }
    ctx.beginPath()
    ctx.moveTo(pts[0].x * s, pts[0].y * s)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s)
    ctx.closePath()
    ctx.fillStyle = hexToRgba(color, 0.05)
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.stroke()
    ctx.setLineDash([])
    const c = polygonCentroid(pts)
    drawLabel(ctx, c.x * s, c.y * s, `${m.value.toFixed(2)} ${m.unit}`, color, 'white', 10)
  }

  if (m.type === 'count') {
    if (!pts[0]) { ctx.restore(); return }
    ctx.beginPath()
    ctx.arc(pts[0].x * s, pts[0].y * s, 9, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.fillStyle = 'white'
    ctx.font = 'bold 14px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('+', pts[0].x * s, pts[0].y * s)
  }

  ctx.restore()
}

function drawExportLegend(ctx: CanvasRenderingContext2D, project: Project, posteMap: Map<string, Poste>) {
  if (!project.legend?.visible) return
  const visiblePostes = project.postes.filter(p =>
    project.measurements.some(m => m.posteId === p.id)
  )
  if (visiblePostes.length === 0) return

  const S     = EXPORT_SCALE
  const lx    = project.legend.x * S
  const ly    = project.legend.y * S

  // Mêmes proportions que le composant Konva (× EXPORT_SCALE)
  const DOT_W  = 18 * S
  const NAME_W = 120 * S
  const VAL_W  = 75 * S
  const W      = DOT_W + NAME_W + VAL_W
  const HDR_H  = 14 * S
  const ROW_H  = 14 * S
  const H      = HDR_H + visiblePostes.length * ROW_H
  const x1     = lx + DOT_W
  const x2     = lx + DOT_W + NAME_W

  ctx.save()
  ctx.textBaseline = 'middle'

  // Fond blanc + bordure
  ctx.fillStyle = 'white'
  ctx.fillRect(lx, ly, W, H)
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  ctx.strokeRect(lx, ly, W, H)

  // En-tête gris
  ctx.fillStyle = '#d1d5db'
  ctx.fillRect(lx, ly, W, HDR_H)
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(lx, ly + HDR_H)
  ctx.lineTo(lx + W, ly + HDR_H)
  ctx.stroke()

  ctx.fillStyle = '#374151'
  ctx.font = `bold ${8 * S}px Arial, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText('Désignation', x1 + 3 * S, ly + HDR_H / 2)
  ctx.fillText('Total', x2 + 3 * S, ly + HDR_H / 2)

  // Séparateurs verticaux
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(x1, ly); ctx.lineTo(x1, ly + H)
  ctx.moveTo(x2, ly); ctx.lineTo(x2, ly + H)
  ctx.stroke()

  // Lignes de données
  visiblePostes.forEach((p, i) => {
    const assigned = project.measurements.filter(m => m.posteId === p.id)
    const total = assigned.reduce((sum, m) => sum + m.value, 0)
    const unit  = assigned.find(m => m.unit)?.unit ?? '—'
    const ry    = ly + HDR_H + i * ROW_H
    const midY  = ry + ROW_H / 2

    // Fond alterné
    if (i % 2 !== 0) {
      ctx.fillStyle = '#f3f4f6'
      ctx.fillRect(lx, ry, W, ROW_H)
    }
    // Séparateur horizontal
    if (i > 0) {
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(lx, ry); ctx.lineTo(lx + W, ry)
      ctx.stroke()
    }

    // Pastille couleur
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(lx + DOT_W / 2, midY, 4 * S, 0, Math.PI * 2)
    ctx.fill()

    // Nom du poste (tronqué si trop long)
    ctx.fillStyle = '#111827'
    ctx.font = `${8 * S}px Arial, sans-serif`
    ctx.textAlign = 'left'
    let name = p.name
    while (ctx.measureText(name).width > NAME_W - 5 * S && name.length > 3) name = name.slice(0, -1)
    if (name !== p.name) name += '…'
    ctx.fillText(name, x1 + 3 * S, midY)

    // Valeur
    ctx.fillText(`${total.toFixed(2)} ${unit}`, x2 + 3 * S, midY)
  })

  ctx.restore()
}

/**
 * Exporte le plan PDF avec toutes les annotations dessinées par-dessus.
 * Génère un PDF page par page : chaque page du plan original + ses mesures.
 */
export async function exportAnnotatedPdf(project: Project, pdfDoc: any): Promise<Uint8Array> {
  const totalPages: number = pdfDoc.numPages
  const posteMap = new Map<string, Poste>(project.postes.map(p => [p.id, p]))

  let doc: jsPDF | null = null

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)

    // Viewport à scale=1 pour connaître les dimensions réelles (en points PDF)
    const baseVP = page.getViewport({ scale: 1 })
    // Viewport à EXPORT_SCALE pour le rendu haute qualité
    const exportVP = page.getViewport({ scale: EXPORT_SCALE })

    // Canvas offscreen
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(exportVP.width)
    canvas.height = Math.round(exportVP.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    // Fond blanc
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Rendu de la page PDF
    const renderTask = page.render({ canvasContext: ctx, viewport: exportVP })
    await renderTask.promise

    // Dessin des mesures visibles de cette page
    const pageMeasurements = project.measurements.filter(
      m => m.page === pageNum && m.visible
    )
    for (const m of pageMeasurements) {
      const color = getColor(m, posteMap)
      const posteName = m.posteId ? posteMap.get(m.posteId)?.name : undefined
      drawMeasurement(ctx, m, color, posteName)
    }

    // Légende flottante uniquement sur la page où elle est positionnée
    if (pageNum === (project.legend?.page ?? 1)) {
      drawExportLegend(ctx, project, posteMap)
    }

    // Conversion canvas → image JPEG
    const imgData = canvas.toDataURL('image/jpeg', 0.92)

    // Dimensions de la page jsPDF en mm (1 point PDF = 25.4/72 mm)
    const pageWidthMm = baseVP.width * (25.4 / 72)
    const pageHeightMm = baseVP.height * (25.4 / 72)

    if (!doc) {
      const orient = pageWidthMm > pageHeightMm ? 'landscape' : 'portrait'
      doc = new jsPDF({
        orientation: orient,
        unit: 'mm',
        format: [pageWidthMm, pageHeightMm],
      })
    } else {
      doc.addPage([pageWidthMm, pageHeightMm])
    }

    doc.addImage(imgData, 'JPEG', 0, 0, pageWidthMm, pageHeightMm)
  }

  if (doc) {
    return new Uint8Array(doc.output('arraybuffer') as ArrayBuffer)
  }
  return new Uint8Array(0)
}

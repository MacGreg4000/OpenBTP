import type { Point, Calibration, Unit } from '@/types/metres-plan'

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

export function polylineLength(pts: Point[]): number {
  if (pts.length < 2) return 0
  return pts.slice(1).reduce((sum, p, i) => sum + distance(pts[i], p), 0)
}

export function polygonArea(pts: Point[]): number {
  if (pts.length < 3) return 0
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length
    area += pts[i].x * pts[j].y
    area -= pts[j].x * pts[i].y
  }
  return Math.abs(area) / 2
}

export function toRealUnit(px: number, calibration: Calibration): number {
  return px * calibration.ratio
}

// Convert slope to factor
// format 'ratio': x/12 (e.g., 4/12)
// format 'degrees': angle in degrees
// format 'percent': percentage (e.g., 33 for 33%)
export function slopeToFactor(value: number, format: 'ratio' | 'degrees' | 'percent'): number {
  let rise: number
  let run: number

  if (format === 'ratio') {
    rise = value
    run = 12
  } else if (format === 'degrees') {
    return 1 / Math.cos((value * Math.PI) / 180)
  } else {
    // percent: 100% = 45 degrees
    rise = value
    run = 100
  }

  return Math.sqrt(1 + (rise / run) ** 2)
}

export function formatValue(value: number, unit: string, decimals = 2): string {
  return `${value.toFixed(decimals)} ${unit}`
}

export function formatUnit(unit: Unit): string {
  const labels: Record<Unit, string> = {
    mm: 'mm',
    cm: 'cm',
    m: 'm',
    ft: 'ft',
    in: 'in',
  }
  return labels[unit]
}

export function getAreaUnit(unit: Unit): string {
  const map: Record<Unit, string> = {
    mm: 'mm²',
    cm: 'cm²',
    m: 'm²',
    ft: 'ft²',
    in: 'in²',
  }
  return map[unit]
}

export function polygonCentroid(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 }
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x, y }
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// Screen → PDF coordinate conversion
export function screenToPdf(
  screenX: number,
  screenY: number,
  transform: number[],
  zoom: number
): Point {
  // PDF.js transform: [scaleX, 0, 0, scaleY, tx, ty]
  const [scaleX, , , scaleY, tx, ty] = transform
  const pdfX = (screenX / zoom - tx) / scaleX
  const pdfY = (screenY / zoom - ty) / scaleY
  return { x: pdfX, y: pdfY }
}

// PDF → Screen coordinate conversion
export function pdfToScreen(
  pdfX: number,
  pdfY: number,
  transform: number[],
  zoom: number
): Point {
  const [scaleX, , , scaleY, tx, ty] = transform
  return {
    x: (pdfX * scaleX + tx) * zoom,
    y: (pdfY * scaleY + ty) * zoom,
  }
}

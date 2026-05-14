export type Unit = 'mm' | 'cm' | 'm' | 'ft' | 'in'

export interface Poste {
  id: string
  name: string   // e.g. "Sol en carrelage 60x60"
  color: string  // visual identifier
}
export type MeasurementType = 'length' | 'area' | 'count' | 'roof' | 'subtract' | 'wall'
export type ToolType = 'select' | 'pan' | 'calibrate' | 'length' | 'area' | 'count' | 'roof' | 'subtract' | 'wall'

export interface Point {
  x: number
  y: number
}

export interface Calibration {
  pixelDistance: number
  realValue: number
  unit: Unit
  ratio: number // realValue / pixelDistance
}

export interface Measurement {
  id: string
  type: MeasurementType
  name: string
  color: string
  page: number
  points: Point[]
  value: number
  unit: string
  // Roof specific
  slopeFormat?: 'ratio' | 'degrees' | 'percent'
  slopeValue?: number  // x in x/12, or degrees, or percent
  slopeFactor?: number
  // Wall specific
  wallHeight?: number   // real-world height (in calibration unit)
  // Note
  note?: string
  visible: boolean
  // Devis assignment
  posteId?: string
}

export interface LegendConfig {
  x: number       // position en coordonnées PDF (scale=1)
  y: number
  visible: boolean
  page: number    // page PDF sur laquelle la légende est affichée
}

export interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  calibration: Calibration | null
  measurements: Measurement[]
  postes: Poste[]
  pdfFileName: string
  legend: LegendConfig
  pageRotations: Record<number, number>
}

export interface PdfPageInfo {
  width: number
  height: number
  // PDF.js viewport transform for coordinate conversion
  transform: number[]
}

export interface HistoryEntry {
  measurements: Measurement[]
  calibration: Calibration | null
}

export const MEASUREMENT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
]

export const TOOL_LABELS: Record<ToolType, string> = {
  select: 'Sélection',
  pan: 'Navigation',
  calibrate: 'Calibration',
  length: 'Longueur',
  area: 'Surface',
  count: 'Compteur',
  roof: 'Toiture',
  subtract: 'Soustraire',
  wall: 'Surface mur',
}

export const DEFAULT_LEGEND: LegendConfig = { x: 20, y: 20, visible: false, page: 1 }

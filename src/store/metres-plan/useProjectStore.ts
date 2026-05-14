import { create } from 'zustand'
import type { Measurement, Calibration, HistoryEntry, Project, Poste, LegendConfig } from '@/types/metres-plan'
import { nanoid } from '@/lib/metres-plan/nanoid'
import { MEASUREMENT_COLORS, DEFAULT_LEGEND } from '@/types/metres-plan'

interface ProjectStore {
  projectId: string
  projectName: string
  calibration: Calibration | null
  measurements: Measurement[]
  selectedMeasurementId: string | null
  // Devis / bill of quantities
  postes: Poste[]
  activePosteId: string | null
  // Rotation par page (0, 90, 180, 270)
  pageRotations: Record<number, number>
  // History for undo/redo
  history: HistoryEntry[]
  historyIndex: number

  setProjectName: (name: string) => void
  setCalibration: (cal: Calibration) => void
  setPageRotation: (page: number, rotation: number) => void
  addMeasurement: (m: Measurement) => void
  updateMeasurement: (id: string, updates: Partial<Measurement>) => void
  deleteMeasurement: (id: string) => void
  toggleMeasurementVisibility: (id: string) => void
  selectMeasurement: (id: string | null) => void
  // Légende flottante
  legend: LegendConfig
  setLegend: (updates: Partial<LegendConfig>) => void
  toggleLegend: (page: number) => void
  // Postes
  addPoste: (p: Poste) => void
  updatePoste: (id: string, updates: Partial<Poste>) => void
  deletePoste: (id: string) => void
  setActivePosteId: (id: string | null) => void
  // History
  pushHistory: () => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  // Project management
  loadProject: (project: Project) => void
  newProject: () => void
  getProject: () => Project
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projectId: nanoid(),
  projectName: 'Nouveau projet',
  calibration: null,
  measurements: [],
  selectedMeasurementId: null,
  postes: [],
  activePosteId: null,
  pageRotations: {},
  legend: { ...DEFAULT_LEGEND },
  history: [],
  historyIndex: -1,

  setProjectName: (name) => set({ projectName: name }),

  setPageRotation: (page, rotation) => set(s => ({
    pageRotations: { ...s.pageRotations, [page]: rotation },
  })),

  setCalibration: (cal) => {
    get().pushHistory()
    set({ calibration: cal })
  },

  addMeasurement: (m) => {
    get().pushHistory()
    set(s => ({ measurements: [...s.measurements, m] }))
  },

  updateMeasurement: (id, updates) => {
    set(s => ({
      measurements: s.measurements.map(m => m.id === id ? { ...m, ...updates } : m)
    }))
  },

  deleteMeasurement: (id) => {
    get().pushHistory()
    set(s => ({
      measurements: s.measurements.filter(m => m.id !== id),
      selectedMeasurementId: s.selectedMeasurementId === id ? null : s.selectedMeasurementId,
    }))
  },

  toggleMeasurementVisibility: (id) => {
    set(s => ({
      measurements: s.measurements.map(m =>
        m.id === id ? { ...m, visible: !m.visible } : m
      )
    }))
  },

  selectMeasurement: (id) => set({ selectedMeasurementId: id }),

  setLegend: (updates) => set(s => ({ legend: { ...s.legend, ...updates } })),
  toggleLegend: (page) => set(s => ({ legend: { ...s.legend, visible: !s.legend.visible, page } })),

  addPoste: (p) => set(s => ({ postes: [...s.postes, p] })),

  updatePoste: (id, updates) => set(s => ({
    postes: s.postes.map(p => p.id === id ? { ...p, ...updates } : p)
  })),

  deletePoste: (id) => set(s => ({
    postes: s.postes.filter(p => p.id !== id),
    // Remove posteId from measurements that were assigned to this poste
    measurements: s.measurements.map(m =>
      m.posteId === id ? { ...m, posteId: undefined } : m
    ),
    activePosteId: s.activePosteId === id ? null : s.activePosteId,
  })),

  setActivePosteId: (id) => set({ activePosteId: id }),

  pushHistory: () => {
    const { measurements, calibration, history, historyIndex } = get()
    const entry: HistoryEntry = {
      measurements: JSON.parse(JSON.stringify(measurements)),
      calibration: calibration ? { ...calibration } : null,
    }
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(entry)
    if (newHistory.length > 50) newHistory.shift()
    set({ history: newHistory, historyIndex: newHistory.length - 1 })
  },

  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < 0) return
    const entry = history[historyIndex - 1]
    if (!entry) {
      set({ measurements: [], calibration: null, historyIndex: -1 })
      return
    }
    set({
      measurements: JSON.parse(JSON.stringify(entry.measurements)),
      calibration: entry.calibration ? { ...entry.calibration } : null,
      historyIndex: historyIndex - 1,
    })
  },

  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex >= history.length - 1) return
    const entry = history[historyIndex + 1]
    set({
      measurements: JSON.parse(JSON.stringify(entry.measurements)),
      calibration: entry.calibration ? { ...entry.calibration } : null,
      historyIndex: historyIndex + 1,
    })
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  loadProject: (project) => set({
    projectId: project.id,
    projectName: project.name,
    calibration: project.calibration,
    measurements: project.measurements,
    postes: project.postes ?? [],
    legend: project.legend ?? { ...DEFAULT_LEGEND },
    pageRotations: project.pageRotations ?? {},
    activePosteId: null,
    selectedMeasurementId: null,
    history: [],
    historyIndex: -1,
  }),

  newProject: () => set({
    projectId: nanoid(),
    projectName: 'Nouveau projet',
    calibration: null,
    measurements: [],
    postes: [],
    legend: { ...DEFAULT_LEGEND },
    pageRotations: {},
    activePosteId: null,
    selectedMeasurementId: null,
    history: [],
    historyIndex: -1,
  }),

  getProject: (): Project => {
    const { projectId, projectName, measurements, calibration, postes, legend, pageRotations } = get()
    return {
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      calibration,
      measurements,
      postes,
      legend,
      pageRotations,
      pdfFileName: '',
    }
  },
}))

// Helper: pick next color for a new poste
export function nextPosteColor(postes: Poste[]): string {
  return MEASUREMENT_COLORS[postes.length % MEASUREMENT_COLORS.length]
}

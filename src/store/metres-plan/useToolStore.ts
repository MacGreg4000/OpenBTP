import { create } from 'zustand'
import type { ToolType, Unit } from '@/types/metres-plan'

interface ToolStore {
  activeTool: ToolType
  activeColor: string
  activeUnit: Unit
  measurementName: string
  // Counter tool
  counterName: string
  counterColor: string
  counterUnitWidth: number   // door/window width in calibration unit (0 = disabled)
  counterUnitHeight: number  // door/window height in calibration unit (0 = disabled)
  // Wall tool
  wallHeight: number         // wall height in calibration unit (default 2.5m)
  // Roof tool
  slopeFormat: 'ratio' | 'degrees' | 'percent'
  slopeValue: number
  // Calibration state
  isCalibrating: boolean
  calibrationStep: 0 | 1 | 2  // 0=idle, 1=first point clicked, 2=second point clicked

  setActiveTool: (tool: ToolType) => void
  setActiveColor: (color: string) => void
  setActiveUnit: (unit: Unit) => void
  setMeasurementName: (name: string) => void
  setCounterName: (name: string) => void
  setCounterColor: (color: string) => void
  setCounterUnitWidth: (w: number) => void
  setCounterUnitHeight: (h: number) => void
  setWallHeight: (h: number) => void
  setSlopeFormat: (format: 'ratio' | 'degrees' | 'percent') => void
  setSlopeValue: (value: number) => void
  setCalibrating: (v: boolean) => void
  setCalibrationStep: (step: 0 | 1 | 2) => void
}

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'pan',
  activeColor: '#ef4444',
  activeUnit: 'm',
  measurementName: '',
  counterName: 'Élément',
  counterColor: '#3b82f6',
  counterUnitWidth: 0,
  counterUnitHeight: 0,
  wallHeight: 2.5,
  slopeFormat: 'ratio',
  slopeValue: 4,
  isCalibrating: false,
  calibrationStep: 0,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveUnit: (unit) => set({ activeUnit: unit }),
  setMeasurementName: (name) => set({ measurementName: name }),
  setCounterName: (name) => set({ counterName: name }),
  setCounterColor: (color) => set({ counterColor: color }),
  setCounterUnitWidth: (w) => set({ counterUnitWidth: w }),
  setCounterUnitHeight: (h) => set({ counterUnitHeight: h }),
  setWallHeight: (h) => set({ wallHeight: h }),
  setSlopeFormat: (format) => set({ slopeFormat: format }),
  setSlopeValue: (value) => set({ slopeValue: value }),
  setCalibrating: (v) => set({ isCalibrating: v }),
  setCalibrationStep: (step) => set({ calibrationStep: step }),
}))

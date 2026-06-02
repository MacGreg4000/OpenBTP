'use client'
import React, { useState, useEffect } from 'react'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { useToolStore } from '@/store/metres-plan/useToolStore'
import type { Unit } from '@/types/metres-plan'
import { Crosshair, X } from 'lucide-react'

interface CalibrationData {
  points: { x: number; y: number }[]
  pixelDistance: number
}

const CalibrationModal: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<CalibrationData | null>(null)
  const [realValue, setRealValue] = useState('')
  const [unit, setUnit] = useState<Unit>('m')

  const { setCalibration } = useProjectStore()
  const { setActiveTool, activeUnit } = useToolStore()

  useEffect(() => {
    const handler = (e: Event) => {
      const { detail } = e as CustomEvent<CalibrationData>
      setData(detail)
      setUnit(activeUnit)
      setOpen(true)
    }
    window.addEventListener('calibration-ready', handler)
    return () => window.removeEventListener('calibration-ready', handler)
  }, [activeUnit])

  const handleConfirm = () => {
    if (!data || !realValue) return
    const rv = parseFloat(realValue)
    if (isNaN(rv) || rv <= 0) {
      alert('Entrez une valeur réelle positive.')
      return
    }
    const ratio = rv / data.pixelDistance
    setCalibration({ pixelDistance: data.pixelDistance, realValue: rv, unit, ratio })
    setActiveTool('select')
    setOpen(false)
    setRealValue('')
    setData(null)
  }

  const handleClose = () => {
    setOpen(false)
    setRealValue('')
    setData(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[120]" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 w-96 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Crosshair size={20} className="text-red-500 dark:text-red-400" />
            <h2 className="text-gray-900 dark:text-white font-semibold">Calibration de l&apos;échelle</h2>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Pixel distance display */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Distance mesurée sur le plan</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{data?.pixelDistance.toFixed(1)} px</p>
        </div>

        {/* Real distance input */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Distance réelle correspondante</label>
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 5rem' }}>
            <input
              type="number"
              autoFocus
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-blue-500 dark:focus:border-blue-500"
              placeholder="ex: 5.00"
              value={realValue}
              onChange={e => setRealValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              min={0}
              step="any"
            />
            <select
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-2 text-gray-900 dark:text-white text-sm outline-none focus:border-blue-500 dark:focus:border-blue-500"
              value={unit}
              onChange={e => setUnit(e.target.value as Unit)}
            >
              <option value="mm">mm</option>
              <option value="cm">cm</option>
              <option value="m">m</option>
              <option value="ft">ft</option>
              <option value="in">in</option>
            </select>
          </div>
        </div>

        {/* Calculated ratio preview */}
        {realValue && !isNaN(parseFloat(realValue)) && parseFloat(realValue) > 0 && data && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-600 dark:text-blue-300">Ratio calculé</p>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-200 mt-0.5">
              1 px = {(parseFloat(realValue) / data.pixelDistance).toFixed(5)} {unit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!realValue || isNaN(parseFloat(realValue)) || parseFloat(realValue) <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            Valider la calibration
          </button>
        </div>
      </div>
    </div>
  )
}

export default CalibrationModal

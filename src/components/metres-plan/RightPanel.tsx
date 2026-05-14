'use client'
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useProjectStore, nextPosteColor } from '@/store/metres-plan/useProjectStore'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import type { Measurement, MeasurementType, Poste } from '@/types/metres-plan'
import { Eye, EyeOff, Trash2, Ruler, Square, Hash, Home, Plus, ChevronRight, Target, SquareMinus, Building2 } from 'lucide-react'
import clsx from 'clsx'
import { nanoid } from '@/lib/metres-plan/nanoid'

const TYPE_ICONS: Record<MeasurementType, React.ReactNode> = {
  length: <Ruler size={14} />,
  area: <Square size={14} />,
  count: <Hash size={14} />,
  roof: <Home size={14} />,
  subtract: <SquareMinus size={14} />,
  wall: <Building2 size={14} />,
}

const TYPE_LABELS: Record<MeasurementType, string> = {
  length: 'Longueur',
  area: 'Surface',
  count: 'Compteur',
  roof: 'Toiture',
  subtract: 'Déduction',
  wall: 'Surface mur',
}

// ─── Mesures tab ─────────────────────────────────────────────────────────────

const MesuresTab: React.FC = () => {
  const { measurements, selectedMeasurementId, selectMeasurement, deleteMeasurement, toggleMeasurementVisibility } = useProjectStore()
  const { currentPage } = usePdfStore()

  const pageMeasurements = useMemo(() =>
    measurements.filter(m => m.page === currentPage),
    [measurements, currentPage]
  )

  const totals = useMemo(() => {
    const grouped: Record<string, { type: MeasurementType; unit: string; total: number; count: number }> = {}
    for (const m of measurements) {
      const key = m.type === 'count' ? `count:${m.name}` : m.type
      if (!grouped[key]) grouped[key] = { type: m.type, unit: m.unit, total: 0, count: 0 }
      grouped[key].total += m.value
      grouped[key].count++
    }
    return grouped
  }, [measurements])

  const grouped = useMemo(() => {
    const g: Record<string, Measurement[]> = {}
    for (const m of pageMeasurements) {
      if (!g[m.type]) g[m.type] = []
      g[m.type].push(m)
    }
    return g
  }, [pageMeasurements])

  if (measurements.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-600">
          <Ruler size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Aucune mesure</p>
          <p className="text-xs mt-1">Utilisez les outils pour mesurer</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      {/* Global totals */}
      <div className="p-3 border-b border-gray-800 shrink-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">Résumé global</p>
        <div className="space-y-1">
          {Object.entries(totals).map(([key, t]) => (
            <div key={key} className="flex items-center justify-between py-0.5">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="text-gray-500">{TYPE_ICONS[t.type]}</span>
                <span>{TYPE_LABELS[t.type]}{t.type === 'count' ? ` (${key.split(':')[1]})` : ''}</span>
                <span className="text-gray-600">×{t.count}</span>
              </div>
              <span className="text-xs font-semibold text-white">
                {t.type === 'count' ? t.count : `${t.total.toFixed(2)} ${t.unit}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per-page list */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider px-1 py-1 mb-1">
          Page {currentPage} — {pageMeasurements.length} mesure{pageMeasurements.length !== 1 ? 's' : ''}
        </p>
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="mb-3">
            <div className="flex items-center gap-2 px-1 mb-1">
              <span className="text-gray-500">{TYPE_ICONS[type as MeasurementType]}</span>
              <span className="text-xs font-medium text-gray-400">{TYPE_LABELS[type as MeasurementType]}</span>
            </div>
            <div className="space-y-0.5">
              {items.map(m => (
                <MeasurementRow
                  key={m.id}
                  measurement={m}
                  isSelected={m.id === selectedMeasurementId}
                  onSelect={() => selectMeasurement(m.id === selectedMeasurementId ? null : m.id)}
                  onDelete={() => deleteMeasurement(m.id)}
                  onToggleVisibility={() => toggleMeasurementVisibility(m.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const MeasurementRow: React.FC<{
  measurement: Measurement
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onToggleVisibility: () => void
}> = ({ measurement: m, isSelected, onSelect, onDelete, onToggleVisibility }) => {
  const { postes } = useProjectStore()
  const poste = postes.find(p => p.id === m.posteId)
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group',
        isSelected ? 'bg-blue-900/50 border border-blue-700' : 'hover:bg-gray-800'
      )}
      onClick={onSelect}
    >
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: poste ? poste.color : m.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-200 truncate">{m.name}</p>
        <p className="text-xs text-gray-500">
          {m.type === 'count' ? '1 unité' : `${m.value.toFixed(2)} ${m.unit}`}
          {m.type === 'roof' && m.slopeFactor && (
            <span className="text-orange-400 ml-1">×{m.slopeFactor.toFixed(3)}</span>
          )}
          {poste && (
            <span className="ml-1 text-gray-600">· {poste.name}</span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onToggleVisibility() }}
          className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-gray-300" title={m.visible ? 'Masquer' : 'Afficher'}>
          {m.visible ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-0.5 rounded hover:bg-red-900 text-gray-500 hover:text-red-400" title="Supprimer">
          <Trash2 size={12} />
        </button>
      </div>
      {isSelected && <ChevronRight size={12} className="text-blue-400 shrink-0" />}
    </div>
  )
}

// ─── Devis tab ────────────────────────────────────────────────────────────────

const MetreTab: React.FC = () => {
  const { postes, activePosteId, measurements, addPoste, updatePoste, deletePoste, setActivePosteId } = useProjectStore()

  const handleAddPoste = () => {
    const newPoste: Poste = {
      id: nanoid(),
      name: 'Nouveau poste',
      color: nextPosteColor(postes),
    }
    addPoste(newPoste)
    // Immediately make it active and start editing
    setActivePosteId(newPoste.id)
  }

  // Compute total per poste
  const posteStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; unit: string }> = {}
    for (const p of postes) {
      const assigned = measurements.filter(m => m.posteId === p.id)
      const total = assigned.reduce((sum, m) => sum + m.value, 0)
      const unit = assigned[0]?.unit ?? '—'
      stats[p.id] = { total, count: assigned.length, unit }
    }
    return stats
  }, [postes, measurements])

  if (postes.length === 0) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-3 border-b border-gray-800">
          <button onClick={handleAddPoste}
            className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Nouveau poste
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-600">
            <Target size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Aucun poste</p>
            <p className="text-xs mt-1 leading-relaxed">Créez des postes pour<br />regrouper vos mesures</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-gray-800 shrink-0">
        <button onClick={handleAddPoste}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Nouveau poste
        </button>
        {activePosteId && (
          <p className="text-xs text-blue-400 text-center mt-2">
            Les mesures vont dans le poste actif ↓
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {postes.map(poste => {
          const stats = posteStats[poste.id]
          const isActive = activePosteId === poste.id
          return (
            <PosteRow
              key={poste.id}
              poste={poste}
              stats={stats}
              isActive={isActive}
              onToggleActive={() => setActivePosteId(isActive ? null : poste.id)}
              onRename={(name) => updatePoste(poste.id, { name })}
              onDelete={() => deletePoste(poste.id)}
            />
          )
        })}
      </div>

      {/* Grand total footer */}
      {postes.length > 0 && (
        <div className="p-3 border-t border-gray-800 shrink-0">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total global devis</p>
          {postes.map(p => {
            const s = posteStats[p.id]
            if (s.count === 0) return null
            return (
              <div key={p.id} className="flex justify-between text-xs py-0.5">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
                <span className="font-semibold text-white">{s.total.toFixed(2)} {s.unit}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const PosteRow: React.FC<{
  poste: Poste
  stats: { total: number; count: number; unit: string }
  isActive: boolean
  onToggleActive: () => void
  onRename: (name: string) => void
  onDelete: () => void
}> = ({ poste, stats, isActive, onToggleActive, onRename, onDelete }) => {
  const [editing, setEditing] = useState(false)
  const [editVal, setEditVal] = useState(poste.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const commitEdit = () => {
    const trimmed = editVal.trim()
    if (trimmed) onRename(trimmed)
    else setEditVal(poste.name)
    setEditing(false)
  }

  return (
    <div
      className={clsx(
        'rounded-xl p-2.5 transition-all border',
        isActive
          ? 'bg-blue-900/30 border-blue-600 shadow-sm shadow-blue-900'
          : 'bg-gray-800/50 border-gray-800 hover:border-gray-700'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Color + active toggle */}
        <button
          onClick={onToggleActive}
          className={clsx(
            'w-8 h-8 rounded-lg shrink-0 flex items-center justify-center transition-all',
            isActive ? 'ring-2 ring-blue-400 scale-110' : 'hover:scale-105'
          )}
          style={{ backgroundColor: poste.color }}
          title={isActive ? 'Désactiver ce poste' : 'Activer ce poste (les mesures iront ici)'}
        >
          {isActive && <Target size={14} className="text-white" />}
        </button>

        {/* Name */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              className="w-full bg-gray-700 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
              value={editVal}
              onChange={e => setEditVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') { setEditVal(poste.name); setEditing(false) }
              }}
            />
          ) : (
            <p
              className="text-xs font-semibold text-gray-100 truncate cursor-text"
              onDoubleClick={() => { setEditVal(poste.name); setEditing(true) }}
              title="Double-clic pour renommer"
            >
              {poste.name}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-0.5">
            {stats.count === 0
              ? <span className="italic">Aucune mesure assignée</span>
              : <span><span className="text-white font-semibold">{stats.total.toFixed(2)}</span> {stats.unit} <span className="text-gray-600">({stats.count} mesure{stats.count > 1 ? 's' : ''})</span></span>
            }
          </p>
        </div>

        {/* Delete */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1 rounded hover:bg-red-900 text-gray-600 hover:text-red-400 transition-colors shrink-0"
          title="Supprimer ce poste"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {isActive && (
        <p className="text-xs text-blue-400 mt-1.5 flex items-center gap-1">
          <Target size={10} /> Poste actif — les prochaines mesures seront assignées ici
        </p>
      )}
    </div>
  )
}

// ─── Main panel ──────────────────────────────────────────────────────────────

const MIN_WIDTH = 200
const MAX_WIDTH = 700
const DEFAULT_WIDTH = 288

const RightPanel: React.FC = () => {
  const [tab, setTab] = useState<'mesures' | 'metre'>('mesures')
  const { postes, activePosteId } = useProjectStore()

  // ── Resize logic ────────────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = panelWidth
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [panelWidth])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const delta = startX.current - e.clientX   // dragging left → wider
      const newWidth = Math.min(Math.max(startWidth.current + delta, MIN_WIDTH), MAX_WIDTH)
      setPanelWidth(newWidth)
    }
    const onMouseUp = () => {
      if (!isResizing.current) return
      isResizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div
      className="relative bg-gray-900 border-l border-gray-800 flex flex-col shrink-0 overflow-hidden"
      style={{ width: panelWidth }}
    >
      {/* ── Resize handle (left edge) ────────────────────────────────────────── */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 z-10 cursor-col-resize group flex items-center justify-center"
        onMouseDown={onResizeStart}
        title="Glisser pour redimensionner"
      >
        {/* thin visual line */}
        <div className="w-px h-full bg-gray-800 group-hover:bg-blue-500/60 transition-colors" />
        {/* center grip dots */}
        <div className="absolute top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-1 h-1 rounded-full bg-blue-400" />
          <div className="w-1 h-1 rounded-full bg-blue-400" />
          <div className="w-1 h-1 rounded-full bg-blue-400" />
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-800 shrink-0 pl-2">
        <button
          onClick={() => setTab('mesures')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold transition-colors',
            tab === 'mesures' ? 'text-white border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          Mesures
        </button>
        <button
          onClick={() => setTab('metre')}
          className={clsx(
            'flex-1 py-2.5 text-xs font-semibold transition-colors relative',
            tab === 'metre' ? 'text-white border-b-2 border-blue-500 bg-gray-800/50' : 'text-gray-500 hover:text-gray-300'
          )}
        >
          Métré
          {activePosteId && (
            <span className="absolute top-1.5 right-3 w-2 h-2 rounded-full bg-blue-500" title="Poste actif" />
          )}
          {postes.length > 0 && !activePosteId && (
            <span className="absolute top-1.5 right-3 text-gray-600 text-[10px] font-normal">{postes.length}</span>
          )}
        </button>
      </div>

      {tab === 'mesures' ? <MesuresTab /> : <MetreTab />}
    </div>
  )
}

export default RightPanel

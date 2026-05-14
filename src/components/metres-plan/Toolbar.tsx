'use client'
import React, { useState } from 'react'
import { useToolStore } from '@/store/metres-plan/useToolStore'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { MEASUREMENT_COLORS } from '@/types/metres-plan'
import type { ToolType, Unit } from '@/types/metres-plan'
import { MousePointer2, Hand, Crosshair, Ruler, Square, Hash, Home, Plus, Target, X, SquareMinus, Building2 } from 'lucide-react'
import clsx from 'clsx'

const TOOLS: { type: ToolType; icon: React.ReactNode; label: string; shortcut: string; color: string }[] = [
  { type: 'select',    icon: <MousePointer2 size={18} />, label: 'Sélection',    shortcut: 'S',     color: 'text-gray-500' },
  { type: 'pan',       icon: <Hand size={18} />,          label: 'Navigation',   shortcut: 'Espace', color: 'text-gray-500' },
  { type: 'calibrate', icon: <Crosshair size={18} />,     label: 'Calibration',  shortcut: 'C',     color: 'text-red-500' },
  { type: 'length',    icon: <Ruler size={18} />,         label: 'Longueur',     shortcut: '1',     color: 'text-blue-500' },
  { type: 'area',      icon: <Square size={18} />,        label: 'Surface',      shortcut: '2',     color: 'text-green-500' },
  { type: 'wall',      icon: <Building2 size={18} />,     label: 'Surface mur',  shortcut: '6',     color: 'text-purple-500' },
  { type: 'subtract',  icon: <SquareMinus size={18} />,   label: 'Soustraire',   shortcut: '5',     color: 'text-red-500' },
  { type: 'count',     icon: <Hash size={18} />,          label: 'Compteur',     shortcut: '3',     color: 'text-yellow-500' },
  { type: 'roof',      icon: <Home size={18} />,          label: 'Toiture',      shortcut: '4',     color: 'text-orange-500' },
]

const Toolbar: React.FC = () => {
  const {
    activeTool, setActiveTool, activeColor, setActiveColor, activeUnit, setActiveUnit,
    counterName, setCounterName, counterColor, setCounterColor,
    counterUnitWidth, setCounterUnitWidth, counterUnitHeight, setCounterUnitHeight,
    wallHeight, setWallHeight,
    slopeFormat, setSlopeFormat, slopeValue, setSlopeValue,
  } = useToolStore()
  const { calibration, postes, activePosteId, setActivePosteId } = useProjectStore()
  const activePoste = postes.find(p => p.id === activePosteId)
  const [showSlopeAdvanced, setShowSlopeAdvanced] = useState(false)

  // common input style
  const inputCls = 'w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 text-sm text-gray-900 dark:text-white outline-none'
  const divider   = 'h-px bg-gray-200 dark:bg-gray-800 mx-2'
  const sectionLbl = 'text-xs text-gray-500 font-medium uppercase tracking-wider'

  return (
    <div className="w-[220px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0 overflow-y-auto">

      {/* ── Tool buttons ─────────────────────────────────────────────────────── */}
      <div className="p-2 flex flex-col gap-1">
        <p className={`${sectionLbl} px-2 py-1`}>Outils</p>
        {TOOLS.map(t => (
          <button
            key={t.type}
            onClick={() => setActiveTool(t.type)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
              activeTool === t.type
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            )}
            title={`${t.label} (${t.shortcut})`}
          >
            <span className={activeTool === t.type ? 'text-white' : t.color}>{t.icon}</span>
            <span className="flex-1 text-left">{t.label}</span>
            <span className={clsx(
              'text-xs rounded px-1',
              activeTool === t.type
                ? 'bg-blue-500 text-blue-100'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            )}>
              {t.shortcut}
            </span>
          </button>
        ))}
      </div>

      <div className={divider} />

      {/* ── Color picker ─────────────────────────────────────────────────────── */}
      <div className="p-3">
        <p className={`${sectionLbl} mb-2`}>Couleur</p>
        <div className="grid grid-cols-5 gap-1.5">
          {MEASUREMENT_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              className={clsx(
                'w-8 h-8 rounded-lg transition-transform hover:scale-110',
                activeColor === c && 'ring-2 ring-gray-400 dark:ring-white scale-110'
              )}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* ── Unit selector ────────────────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        <p className={`${sectionLbl} mb-2`}>Unité</p>
        <div className="grid grid-cols-3 gap-1">
          {(['mm','cm','m','ft','in'] as Unit[]).map(u => (
            <button
              key={u}
              onClick={() => setActiveUnit(u)}
              className={clsx(
                'py-1 rounded text-xs font-medium transition-colors',
                activeUnit === u
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      <div className={divider} />

      {/* ── Calibration info ─────────────────────────────────────────────────── */}
      <div className="p-3">
        <p className={`${sectionLbl} mb-2`}>Calibration</p>
        {calibration ? (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-2">
            <p className="text-xs text-green-700 dark:text-green-400 font-medium">Calibrée</p>
            <p className="text-xs text-green-600 dark:text-green-300 mt-0.5">1px = {calibration.ratio.toFixed(4)} {calibration.unit}</p>
            <p className="text-xs text-green-600 dark:text-green-300">{calibration.realValue} {calibration.unit} / {calibration.pixelDistance.toFixed(1)}px</p>
          </div>
        ) : (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-2">
            <p className="text-xs text-red-600 dark:text-red-400 font-medium">Non calibrée</p>
            <p className="text-xs text-red-500 dark:text-red-300 mt-0.5">Appuyez sur C pour calibrer l&apos;échelle</p>
          </div>
        )}
      </div>

      {/* ── Counter tool settings ─────────────────────────────────────────────── */}
      {activeTool === 'count' && (
        <>
          <div className={divider} />
          <div className="p-3">
            <p className={`${sectionLbl} mb-2`}>Compteur</p>
            <input
              className={`${inputCls} focus:border-blue-500 mb-2`}
              value={counterName}
              onChange={e => setCounterName(e.target.value)}
              placeholder="Nom de l'élément"
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {MEASUREMENT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setCounterColor(c)}
                  className={clsx('w-6 h-6 rounded-full transition-transform hover:scale-110', counterColor === c && 'ring-2 ring-gray-400 dark:ring-white scale-110')}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className={`${sectionLbl} mb-1`}>Dimensions ouverture</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mb-2">Laisser à 0 pour un simple compteur</p>
            <div className="flex items-center gap-1 mb-1">
              <input
                type="number"
                className={`${inputCls} focus:border-yellow-500`}
                value={counterUnitWidth || ''}
                onChange={e => setCounterUnitWidth(parseFloat(e.target.value) || 0)}
                placeholder="Largeur"
                min={0} step={0.05}
              />
              <span className="text-gray-500 text-xs shrink-0">×</span>
              <input
                type="number"
                className={`${inputCls} focus:border-yellow-500`}
                value={counterUnitHeight || ''}
                onChange={e => setCounterUnitHeight(parseFloat(e.target.value) || 0)}
                placeholder="Hauteur"
                min={0} step={0.05}
              />
            </div>
            {counterUnitWidth > 0 && counterUnitHeight > 0 && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                Chaque unité = {(counterUnitWidth * counterUnitHeight).toFixed(3)} {activeUnit}²
              </p>
            )}
          </div>
        </>
      )}

      {/* ── Wall tool settings ───────────────────────────────────────────────── */}
      {activeTool === 'wall' && (
        <>
          <div className={divider} />
          <div className="p-3">
            <p className={`${sectionLbl} mb-2`}>Surface mur</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tracez le périmètre des murs, la surface est calculée automatiquement.</p>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Hauteur de mur</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={`flex-1 ${inputCls} focus:border-purple-500`}
                value={wallHeight}
                onChange={e => setWallHeight(parseFloat(e.target.value) || 0)}
                min={0} step={0.1}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">{activeUnit}</span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Surface = périmètre × {wallHeight} {activeUnit}
            </p>
          </div>
        </>
      )}

      {/* ── Roof tool settings ───────────────────────────────────────────────── */}
      {activeTool === 'roof' && (
        <>
          <div className={divider} />
          <div className="p-3">
            <p className={`${sectionLbl} mb-2`}>Pente toiture</p>
            <div className="flex gap-1 mb-2">
              {([['ratio','x/12'],['degrees','Degrés'],['percent','%']] as [string,string][]).map(([val,lbl]) => (
                <button
                  key={val}
                  onClick={() => setSlopeFormat(val as never)}
                  className={clsx(
                    'flex-1 py-1 rounded text-xs transition-colors',
                    slopeFormat === val
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={`flex-1 ${inputCls} focus:border-orange-500`}
                value={slopeValue}
                onChange={e => setSlopeValue(parseFloat(e.target.value) || 0)}
                min={0}
                step={slopeFormat === 'ratio' ? 0.5 : 1}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {slopeFormat === 'ratio' ? '/12' : slopeFormat === 'degrees' ? '°' : '%'}
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Facteur ×{(slopeFormat === 'degrees'
                ? (1 / Math.cos(slopeValue * Math.PI / 180))
                : Math.sqrt(1 + (slopeFormat === 'ratio' ? (slopeValue/12)**2 : (slopeValue/100)**2))
              ).toFixed(3)}
            </p>
            {showSlopeAdvanced && (
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1 leading-relaxed">
                Mesure le plan incliné réel (projetion horizontale × facteur)
              </p>
            )}
            <button
              className="text-xs text-gray-400 dark:text-gray-600 mt-1 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              onClick={() => setShowSlopeAdvanced(v => !v)}
            >
              {showSlopeAdvanced ? 'Masquer détails' : 'En savoir plus'}
            </button>
          </div>
        </>
      )}

      {/* ── Active poste indicator ───────────────────────────────────────────── */}
      {activePoste && (
        <>
          <div className={divider} />
          <div className="p-3">
            <p className={`${sectionLbl} mb-2`}>Poste actif</p>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg px-2 py-2">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: activePoste.color }} />
              <p className="text-xs text-blue-700 dark:text-blue-200 font-medium flex-1 truncate">{activePoste.name}</p>
              <button
                onClick={() => setActivePosteId(null)}
                className="p-0.5 text-blue-500 hover:text-blue-700 dark:hover:text-white hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
                title="Désactiver le poste"
              >
                <X size={12} />
              </button>
            </div>
            <p className="text-xs text-blue-500 dark:text-blue-400/70 mt-1 flex items-center gap-1">
              <Target size={10} /> Les mesures iront dans ce poste
            </p>
          </div>
        </>
      )}

      {/* ── Keyboard shortcuts ───────────────────────────────────────────────── */}
      <div className="flex-1" />
      <div className={`p-3 border-t border-gray-200 dark:border-gray-800`}>
        <p className="text-xs text-gray-400 font-medium mb-1">Raccourcis</p>
        <div className="space-y-0.5 text-xs text-gray-400 dark:text-gray-600">
          <p>Double-clic / Entrée → Valider</p>
          <p>Échap → Annuler</p>
          <p>Suppr → Effacer sélection</p>
          <p>Ctrl+Z / Ctrl+Y → Annuler/Refaire</p>
        </div>
      </div>
    </div>
  )
}

export default Toolbar

'use client'
import React, { useMemo } from 'react'
import { Line, Circle, Rect, Text, Group } from 'react-konva'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { useToolStore } from '@/store/metres-plan/useToolStore'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import type { Point, Measurement } from '@/types/metres-plan'
import {
  distance,
  polylineLength,
  polygonArea,
  polygonCentroid,
  toRealUnit,
  getAreaUnit,
} from '@/lib/metres-plan/geometry'

interface DrawLayerProps {
  currentPoints: Point[]
  calibPoints: Point[]
  mousePos: Point | null
  onFinalize: (pts: Point[]) => void
}

const DrawLayer: React.FC<DrawLayerProps> = ({ currentPoints, calibPoints, mousePos }) => {
  const { measurements, selectedMeasurementId, selectMeasurement, calibration, postes, legend, setLegend } = useProjectStore()
  const { activeTool, activeColor } = useToolStore()
  const { currentPage, zoom } = usePdfStore()

  // Stats par poste pour la légende
  const posteStats = useMemo(() => {
    const stats: Record<string, { total: number; count: number; unit: string }> = {}
    for (const p of postes) {
      const assigned = measurements.filter(m => m.posteId === p.id)
      const total = assigned.reduce((sum, m) => sum + m.value, 0)
      const unit = assigned.find(m => m.unit)?.unit ?? '—'
      stats[p.id] = { total, count: assigned.length, unit }
    }
    return stats
  }, [postes, measurements])

  const renderMeasurement = (m: Measurement) => {
    if (!m.visible || m.page !== currentPage) return null
    const pts = m.points
    const isSelected = m.id === selectedMeasurementId
    const sw = isSelected ? 3 : 2

    // Couleur effective : priorité à la couleur du poste si la mesure est assignée
    const poste = postes.find(p => p.id === m.posteId)
    const color = poste ? poste.color : m.color
    const posteName = poste?.name

    if (m.type === 'length') {
      if (pts.length < 2) return null
      const flat = pts.flatMap(p => [p.x, p.y])
      const midIdx = Math.floor(pts.length / 2)
      const lx = (pts[midIdx].x + pts[Math.max(0, midIdx - 1)].x) / 2
      const ly = (pts[midIdx].y + pts[Math.max(0, midIdx - 1)].y) / 2
      const label = `${m.value.toFixed(2)} ${m.unit}`
      const nlw = posteName ? Math.max(posteName.length * 6 + 6, 30) : 0
      return (
        <Group key={m.id} onClick={() => selectMeasurement(m.id)}>
          <Line points={flat} stroke={color} strokeWidth={sw} lineCap="round" lineJoin="round" />
          {pts.map((p, i) => <Circle key={i} x={p.x} y={p.y} radius={isSelected ? 5 : 3} fill={color} />)}
          {posteName && (
            <>
              <Rect x={lx - nlw / 2} y={ly - 30} width={nlw} height={14} fill={color} cornerRadius={3} />
              <Text x={lx - nlw / 2 + 3} y={ly - 28} text={posteName} fill="white" fontSize={9} fontStyle="bold" />
            </>
          )}
          <Rect x={lx - 2} y={ly - 14} width={label.length * 7 + 8} height={16} fill="rgba(0,0,0,0.75)" cornerRadius={3} />
          <Text x={lx} y={ly - 12} text={label} fill="white" fontSize={11} fontStyle="bold" />
        </Group>
      )
    }

    if (m.type === 'area' || m.type === 'roof') {
      if (pts.length < 3) return null
      const flat = [...pts.flatMap(p => [p.x, p.y]), pts[0].x, pts[0].y]
      const c = polygonCentroid(pts)
      const label = `${m.value.toFixed(2)} ${m.unit}`
      const lw = label.length * 7 + 8
      const nlw = posteName ? Math.max(posteName.length * 6 + 6, 40) : 0
      return (
        <Group key={m.id} onClick={() => selectMeasurement(m.id)}>
          <Line points={flat} stroke={color} strokeWidth={sw} closed fill={color + (isSelected ? '44' : '22')} lineCap="round" lineJoin="round" />
          {/* Étiquette nom du poste (couleur du poste) au-dessus de la valeur */}
          {posteName && (
            <>
              <Rect x={c.x - nlw / 2} y={c.y - 30} width={nlw} height={14} fill={color} cornerRadius={3} />
              <Text x={c.x - nlw / 2 + 3} y={c.y - 28} text={posteName} fill="white" fontSize={9} fontStyle="bold" />
            </>
          )}
          <Rect x={c.x - lw / 2} y={c.y - 14} width={lw} height={m.type === 'roof' ? 30 : 16} fill="rgba(0,0,0,0.75)" cornerRadius={3} />
          <Text x={c.x - lw / 2 + 4} y={c.y - 12} text={label} fill="white" fontSize={11} fontStyle="bold" />
          {m.type === 'roof' && m.slopeFactor && (
            <Text x={c.x - lw / 2 + 4} y={c.y + 4} text={`pente ×${m.slopeFactor.toFixed(3)}`} fill="#fbbf24" fontSize={9} />
          )}
        </Group>
      )
    }

    if (m.type === 'subtract') {
      if (pts.length < 3) return null
      const flat = [...pts.flatMap(p => [p.x, p.y]), pts[0].x, pts[0].y]
      const c = polygonCentroid(pts)
      const label = `${m.value.toFixed(2)} ${m.unit}`
      const lw = label.length * 7 + 8
      return (
        <Group key={m.id} onClick={() => selectMeasurement(m.id)}>
          <Line points={flat} stroke={color} strokeWidth={sw} closed
            dash={[8, 4]} fill={color + '11'} lineCap="round" lineJoin="round" />
          <Rect x={c.x - lw / 2} y={c.y - 14} width={lw} height={16} fill={color} cornerRadius={3} />
          <Text x={c.x - lw / 2 + 4} y={c.y - 12} text={label} fill="white" fontSize={11} fontStyle="bold" />
        </Group>
      )
    }

    if (m.type === 'wall') {
      if (pts.length < 2) return null
      const flat = pts.flatMap(p => [p.x, p.y])
      const midIdx = Math.floor(pts.length / 2)
      const lx = (pts[midIdx].x + pts[Math.max(0, midIdx - 1)].x) / 2
      const ly = (pts[midIdx].y + pts[Math.max(0, midIdx - 1)].y) / 2
      const label = `${m.value.toFixed(2)} ${m.unit}`
      const lw = label.length * 7 + 8
      const nlw = posteName ? Math.max(posteName.length * 6 + 6, 30) : 0
      const subLabel = m.wallHeight ? `périm.×${m.wallHeight}` : ''
      return (
        <Group key={m.id} onClick={() => selectMeasurement(m.id)}>
          <Line points={flat} stroke={color} strokeWidth={sw} lineCap="round" lineJoin="round" dash={[6, 3]} />
          {pts.map((p, i) => <Circle key={i} x={p.x} y={p.y} radius={isSelected ? 5 : 3} fill={color} />)}
          {posteName && (
            <>
              <Rect x={lx - nlw / 2} y={ly - 46} width={nlw} height={14} fill={color} cornerRadius={3} />
              <Text x={lx - nlw / 2 + 3} y={ly - 44} text={posteName} fill="white" fontSize={9} fontStyle="bold" />
            </>
          )}
          <Rect x={lx - lw / 2} y={ly - 30} width={lw} height={28} fill="rgba(88,28,135,0.85)" cornerRadius={3} />
          <Text x={lx - lw / 2 + 4} y={ly - 28} text={label} fill="white" fontSize={11} fontStyle="bold" />
          {subLabel && <Text x={lx - lw / 2 + 4} y={ly - 14} text={subLabel} fill="#d8b4fe" fontSize={9} />}
        </Group>
      )
    }

    if (m.type === 'count') {
      const p = pts[0]
      if (!p) return null
      return (
        <Group key={m.id} onClick={() => selectMeasurement(m.id)}>
          <Circle x={p.x} y={p.y} radius={9} fill={color} stroke={isSelected ? 'white' : color} strokeWidth={isSelected ? 2 : 0} />
          <Text x={p.x - 4} y={p.y - 6} text="+" fill="white" fontSize={14} fontStyle="bold" />
        </Group>
      )
    }
    return null
  }

  const renderLegend = () => {
    if (!legend.visible) return null
    if (legend.page !== currentPage) return null
    const visiblePostes = postes.filter(p => posteStats[p.id]?.count > 0)
    if (visiblePostes.length === 0) return null

    // Tableau style Excel : 3 colonnes — pastille | désignation | total
    const DOT_W  = 18   // colonne pastille couleur
    const NAME_W = 120  // colonne nom du poste
    const VAL_W  = 75   // colonne valeur
    const W      = DOT_W + NAME_W + VAL_W  // 213 px total
    const ROW_H  = 14
    const HDR_H  = 14
    const H      = HDR_H + visiblePostes.length * ROW_H
    const x1     = DOT_W           // séparateur col 1 | col 2
    const x2     = DOT_W + NAME_W  // séparateur col 2 | col 3

    return (
      <Group
        x={legend.x} y={legend.y}
        draggable
        onDragEnd={e => setLegend({ x: e.target.x(), y: e.target.y() })}
      >
        {/* Fond général blanc avec bordure fine */}
        <Rect width={W} height={H} fill="white" stroke="#6b7280" strokeWidth={1} />

        {/* En-tête gris clair */}
        <Rect width={W} height={HDR_H} fill="#d1d5db" />
        <Line points={[0, HDR_H, W, HDR_H]} stroke="#6b7280" strokeWidth={1} />
        <Text x={x1 + 3} y={3} text="Désignation" fill="#374151" fontSize={8} fontStyle="bold" width={NAME_W - 4} />
        <Text x={x2 + 3} y={3} text="Total"        fill="#374151" fontSize={8} fontStyle="bold" width={VAL_W  - 4} />

        {/* Séparateurs verticaux sur toute la hauteur */}
        <Line points={[x1, 0, x1, H]} stroke="#9ca3af" strokeWidth={0.5} />
        <Line points={[x2, 0, x2, H]} stroke="#9ca3af" strokeWidth={0.5} />

        {/* Lignes de données */}
        {visiblePostes.map((p, i) => {
          const s  = posteStats[p.id]
          const ry = HDR_H + i * ROW_H
          return (
            <Group key={p.id} y={ry}>
              {/* Fond alterné */}
              {i % 2 !== 0 && <Rect width={W} height={ROW_H} fill="#f3f4f6" />}
              {/* Séparateur horizontal */}
              {i > 0 && <Line points={[0, 0, W, 0]} stroke="#e5e7eb" strokeWidth={0.5} />}
              {/* Pastille couleur */}
              <Circle x={DOT_W / 2} y={ROW_H / 2} radius={4} fill={p.color} />
              {/* Nom */}
              <Text x={x1 + 3} y={ROW_H / 2 - 4} text={p.name}
                fill="#111827" fontSize={8} width={NAME_W - 5} ellipsis />
              {/* Valeur */}
              <Text x={x2 + 3} y={ROW_H / 2 - 4}
                text={`${s.total.toFixed(2)} ${s.unit}`}
                fill="#111827" fontSize={8} width={VAL_W - 5} />
            </Group>
          )
        })}
      </Group>
    )
  }

  const renderActive = () => {
    const tool = activeTool
    if (!['length', 'area', 'roof', 'subtract', 'wall'].includes(tool) || currentPoints.length === 0) return null
    const preview = mousePos ? [...currentPoints, mousePos] : currentPoints

    if (tool === 'length' || tool === 'roof' || tool === 'wall') {
      const flat = preview.flatMap(p => [p.x, p.y])
      const last = preview[preview.length - 1]
      const pixLen = polylineLength(preview.slice(0, -1))
      const { wallHeight } = useToolStore.getState()
      let label: string
      if (tool === 'wall' && calibration) {
        const perimeter = toRealUnit(pixLen, calibration)
        const area = perimeter * wallHeight
        label = `${area.toFixed(2)} ${getAreaUnit(calibration.unit)} (p=${perimeter.toFixed(2)})`
      } else {
        label = calibration
          ? `${toRealUnit(pixLen, calibration).toFixed(2)} ${calibration.unit}`
          : `${Math.round(pixLen)}px`
      }
      const previewColor = tool === 'wall' ? '#a855f7' : activeColor
      return (
        <Group>
          <Line points={flat} stroke={previewColor} strokeWidth={2} dash={[8, 4]} lineCap="round" />
          {currentPoints.map((p, i) => <Circle key={i} x={p.x} y={p.y} radius={4} fill={previewColor} />)}
          {last && <>
            <Rect x={last.x + 12} y={last.y - 14} width={label.length * 6.5 + 8} height={16} fill="rgba(0,0,0,0.85)" cornerRadius={3} />
            <Text x={last.x + 14} y={last.y - 12} text={label} fill="white" fontSize={11} />
          </>}
        </Group>
      )
    }

    if (tool === 'area' || tool === 'subtract') {
      const flat = preview.flatMap(p => [p.x, p.y])
      const last = preview[preview.length - 1]
      const nearFirst = mousePos && currentPoints.length > 2 && distance(mousePos, currentPoints[0]) < 15
      const pixArea = preview.length >= 3 ? polygonArea(preview) : 0
      const aLabel = calibration && pixArea > 0
        ? `${tool === 'subtract' ? '−' : ''}${toRealUnit(toRealUnit(pixArea, calibration), calibration).toFixed(2)} ${getAreaUnit(calibration.unit)}`
        : null
      const previewColor = tool === 'subtract' ? '#ef4444' : activeColor
      return (
        <Group>
          <Line points={flat} stroke={previewColor} strokeWidth={2} dash={nearFirst ? undefined : [8, 4]}
            closed={!!nearFirst} fill={nearFirst ? previewColor + '22' : undefined} lineCap="round" />
          {currentPoints.map((p, i) => (
            <Circle key={i} x={p.x} y={p.y} radius={i === 0 ? (nearFirst ? 7 : 5) : 4}
              fill={i === 0 && nearFirst ? 'white' : previewColor}
              stroke={i === 0 ? previewColor : undefined} strokeWidth={1} />
          ))}
          {last && aLabel && <>
            <Rect x={last.x + 12} y={last.y - 14} width={aLabel.length * 7 + 8} height={16} fill="rgba(0,0,0,0.85)" cornerRadius={3} />
            <Text x={last.x + 14} y={last.y - 12} text={aLabel} fill="white" fontSize={11} />
          </>}
        </Group>
      )
    }
    return null
  }

  const renderCalibration = () => {
    if (activeTool !== 'calibrate' && calibPoints.length === 0) return null

    // Tailles constantes en pixels écran, compensées par le zoom
    const z = Math.max(zoom, 0.1)
    const sw   = 1 / z       // trait 1px écran
    const arm  = 14 / z      // longueur bras 14px écran
    const gap  = 4 / z       // gap central 4px écran (on voit le point exact)
    const dot  = 1.5 / z     // point central 1.5px écran
    const ring = 10 / z      // rayon cercle extérieur 10px écran
    const th   = 11 / z      // taille texte
    const to   = 14 / z      // offset texte

    // Réticule de précision : croix avec gap + mini point central + cercle extérieur
    const Reticule = ({ x, y }: { x: number; y: number }) => (
      <React.Fragment>
        {/* Bras horizontaux */}
        <Line points={[x - arm - gap, y, x - gap, y]} stroke="#ef4444" strokeWidth={sw} />
        <Line points={[x + gap, y, x + arm + gap, y]} stroke="#ef4444" strokeWidth={sw} />
        {/* Bras verticaux */}
        <Line points={[x, y - arm - gap, x, y - gap]} stroke="#ef4444" strokeWidth={sw} />
        <Line points={[x, y + gap, x, y + arm + gap]} stroke="#ef4444" strokeWidth={sw} />
        {/* Point central minuscule */}
        <Circle x={x} y={y} radius={dot} fill="#ef4444" />
        {/* Cercle extérieur léger */}
        <Circle x={x} y={y} radius={ring} stroke="#ef4444" strokeWidth={sw} fill="transparent" />
      </React.Fragment>
    )

    return (
      <Group>
        {/* Ligne entre les deux points */}
        {calibPoints.length >= 1 && mousePos && (
          <Line
            points={[calibPoints[0].x, calibPoints[0].y, mousePos.x, mousePos.y]}
            stroke="#ef4444" strokeWidth={sw * 1.5} dash={[6 / z, 3 / z]}
          />
        )}
        {calibPoints.length === 2 && (
          <Line
            points={calibPoints.flatMap(p => [p.x, p.y])}
            stroke="#ef4444" strokeWidth={sw * 1.5} dash={[6 / z, 3 / z]}
          />
        )}

        {/* Points posés */}
        {calibPoints.map((p, i) => <Reticule key={i} x={p.x} y={p.y} />)}

        {/* Curseur actif (souris) */}
        {activeTool === 'calibrate' && mousePos && calibPoints.length < 2 && (
          <>
            <Reticule x={mousePos.x} y={mousePos.y} />
            <Text
              x={mousePos.x + to} y={mousePos.y - to}
              text={calibPoints.length === 0 ? 'Clic 1er point' : 'Clic 2ème point'}
              fill="#ef4444" fontSize={th} fontStyle="bold"
            />
          </>
        )}
      </Group>
    )
  }

  return (
    <>
      {measurements.map(renderMeasurement)}
      {renderActive()}
      {renderCalibration()}
      {renderLegend()}
    </>
  )
}

export default DrawLayer

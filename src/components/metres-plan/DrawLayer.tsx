'use client'
import { useEffect, useMemo } from 'react'
import Konva from 'konva'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { useToolStore } from '@/store/metres-plan/useToolStore'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import type { Point } from '@/types/metres-plan'
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
  layer: Konva.Layer | null
}

export function useDrawLayer({ currentPoints, calibPoints, mousePos, layer }: DrawLayerProps) {
  const {
    measurements,
    selectedMeasurementId,
    selectMeasurement,
    calibration,
    postes,
    legend,
    setLegend,
  } = useProjectStore()
  const { activeTool, activeColor } = useToolStore()
  const { currentPage, zoom } = usePdfStore()

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

  useEffect(() => {
    if (!layer) return

    layer.destroyChildren()

    // ── Draw existing measurements ──────────────────────────────────────────
    for (const m of measurements) {
      if (!m.visible || m.page !== currentPage) continue

      const pts = m.points
      const isSelected = m.id === selectedMeasurementId
      const sw = isSelected ? 3 : 2
      const poste = postes.find(p => p.id === m.posteId)
      const color = poste ? poste.color : m.color
      const posteName = poste?.name

      const group = new Konva.Group()
      group.on('click', () => selectMeasurement(m.id))

      if (m.type === 'length') {
        if (pts.length < 2) continue
        const flat = pts.flatMap(p => [p.x, p.y])
        group.add(new Konva.Line({ points: flat, stroke: color, strokeWidth: sw, lineCap: 'round', lineJoin: 'round' }))
        for (const p of pts) {
          group.add(new Konva.Circle({ x: p.x, y: p.y, radius: isSelected ? 5 : 3, fill: color }))
        }
        const midIdx = Math.floor(pts.length / 2)
        const lx = (pts[midIdx].x + pts[Math.max(0, midIdx - 1)].x) / 2
        const ly = (pts[midIdx].y + pts[Math.max(0, midIdx - 1)].y) / 2
        const label = `${m.value.toFixed(2)} ${m.unit}`
        if (posteName) {
          const nlw = Math.max(posteName.length * 6 + 6, 30)
          group.add(new Konva.Rect({ x: lx - nlw / 2, y: ly - 30, width: nlw, height: 14, fill: color, cornerRadius: 3 }))
          group.add(new Konva.Text({ x: lx - nlw / 2 + 3, y: ly - 28, text: posteName, fill: 'white', fontSize: 9, fontStyle: 'bold' }))
        }
        group.add(new Konva.Rect({ x: lx - 2, y: ly - 14, width: label.length * 7 + 8, height: 16, fill: 'rgba(0,0,0,0.75)', cornerRadius: 3 }))
        group.add(new Konva.Text({ x: lx, y: ly - 12, text: label, fill: 'white', fontSize: 11, fontStyle: 'bold' }))
      } else if (m.type === 'area' || m.type === 'roof') {
        if (pts.length < 3) continue
        const flat = [...pts.flatMap(p => [p.x, p.y]), pts[0].x, pts[0].y]
        const c = polygonCentroid(pts)
        const label = `${m.value.toFixed(2)} ${m.unit}`
        const lw = label.length * 7 + 8
        group.add(new Konva.Line({
          points: flat, stroke: color, strokeWidth: sw, closed: true,
          fill: color + (isSelected ? '44' : '22'), lineCap: 'round', lineJoin: 'round',
        }))
        if (posteName) {
          const nlw = Math.max(posteName.length * 6 + 6, 40)
          group.add(new Konva.Rect({ x: c.x - nlw / 2, y: c.y - 30, width: nlw, height: 14, fill: color, cornerRadius: 3 }))
          group.add(new Konva.Text({ x: c.x - nlw / 2 + 3, y: c.y - 28, text: posteName, fill: 'white', fontSize: 9, fontStyle: 'bold' }))
        }
        const boxH = m.type === 'roof' ? 30 : 16
        group.add(new Konva.Rect({ x: c.x - lw / 2, y: c.y - 14, width: lw, height: boxH, fill: 'rgba(0,0,0,0.75)', cornerRadius: 3 }))
        group.add(new Konva.Text({ x: c.x - lw / 2 + 4, y: c.y - 12, text: label, fill: 'white', fontSize: 11, fontStyle: 'bold' }))
        if (m.type === 'roof' && m.slopeFactor) {
          group.add(new Konva.Text({ x: c.x - lw / 2 + 4, y: c.y + 4, text: `pente ×${m.slopeFactor.toFixed(3)}`, fill: '#fbbf24', fontSize: 9 }))
        }
      } else if (m.type === 'subtract') {
        if (pts.length < 3) continue
        const flat = [...pts.flatMap(p => [p.x, p.y]), pts[0].x, pts[0].y]
        const c = polygonCentroid(pts)
        const label = `${m.value.toFixed(2)} ${m.unit}`
        const lw = label.length * 7 + 8
        group.add(new Konva.Line({
          points: flat, stroke: color, strokeWidth: sw, closed: true,
          dash: [8, 4], fill: color + '11', lineCap: 'round', lineJoin: 'round',
        }))
        group.add(new Konva.Rect({ x: c.x - lw / 2, y: c.y - 14, width: lw, height: 16, fill: color, cornerRadius: 3 }))
        group.add(new Konva.Text({ x: c.x - lw / 2 + 4, y: c.y - 12, text: label, fill: 'white', fontSize: 11, fontStyle: 'bold' }))
      } else if (m.type === 'wall') {
        if (pts.length < 2) continue
        const flat = pts.flatMap(p => [p.x, p.y])
        const midIdx = Math.floor(pts.length / 2)
        const lx = (pts[midIdx].x + pts[Math.max(0, midIdx - 1)].x) / 2
        const ly = (pts[midIdx].y + pts[Math.max(0, midIdx - 1)].y) / 2
        const label = `${m.value.toFixed(2)} ${m.unit}`
        const lw = label.length * 7 + 8
        group.add(new Konva.Line({ points: flat, stroke: color, strokeWidth: sw, lineCap: 'round', lineJoin: 'round', dash: [6, 3] }))
        for (const p of pts) {
          group.add(new Konva.Circle({ x: p.x, y: p.y, radius: isSelected ? 5 : 3, fill: color }))
        }
        if (posteName) {
          const nlw = Math.max(posteName.length * 6 + 6, 30)
          group.add(new Konva.Rect({ x: lx - nlw / 2, y: ly - 46, width: nlw, height: 14, fill: color, cornerRadius: 3 }))
          group.add(new Konva.Text({ x: lx - nlw / 2 + 3, y: ly - 44, text: posteName, fill: 'white', fontSize: 9, fontStyle: 'bold' }))
        }
        const subLabel = m.wallHeight ? `périm.×${m.wallHeight}` : ''
        group.add(new Konva.Rect({ x: lx - lw / 2, y: ly - 30, width: lw, height: 28, fill: 'rgba(88,28,135,0.85)', cornerRadius: 3 }))
        group.add(new Konva.Text({ x: lx - lw / 2 + 4, y: ly - 28, text: label, fill: 'white', fontSize: 11, fontStyle: 'bold' }))
        if (subLabel) {
          group.add(new Konva.Text({ x: lx - lw / 2 + 4, y: ly - 14, text: subLabel, fill: '#d8b4fe', fontSize: 9 }))
        }
      } else if (m.type === 'count') {
        const p = pts[0]
        if (!p) continue
        group.add(new Konva.Circle({
          x: p.x, y: p.y, radius: 9, fill: color,
          stroke: isSelected ? 'white' : color, strokeWidth: isSelected ? 2 : 0,
        }))
        group.add(new Konva.Text({ x: p.x - 4, y: p.y - 6, text: '+', fill: 'white', fontSize: 14, fontStyle: 'bold' }))
      }

      layer.add(group)
    }

    // ── Active tool preview ─────────────────────────────────────────────────
    const tool = activeTool
    if (['length', 'area', 'roof', 'subtract', 'wall'].includes(tool) && currentPoints.length > 0) {
      const preview = mousePos ? [...currentPoints, mousePos] : currentPoints
      const group = new Konva.Group()

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
        group.add(new Konva.Line({ points: flat, stroke: previewColor, strokeWidth: 2, dash: [8, 4], lineCap: 'round' }))
        for (const p of currentPoints) {
          group.add(new Konva.Circle({ x: p.x, y: p.y, radius: 4, fill: previewColor }))
        }
        if (last) {
          group.add(new Konva.Rect({ x: last.x + 12, y: last.y - 14, width: label.length * 6.5 + 8, height: 16, fill: 'rgba(0,0,0,0.85)', cornerRadius: 3 }))
          group.add(new Konva.Text({ x: last.x + 14, y: last.y - 12, text: label, fill: 'white', fontSize: 11 }))
        }
      }

      if (tool === 'area' || tool === 'subtract') {
        const flat = preview.flatMap(p => [p.x, p.y])
        const last = preview[preview.length - 1]
        const nearFirst = !!(mousePos && currentPoints.length > 2 && distance(mousePos, currentPoints[0]) < 15)
        const pixArea = preview.length >= 3 ? polygonArea(preview) : 0
        const aLabel = calibration && pixArea > 0
          ? `${tool === 'subtract' ? '−' : ''}${toRealUnit(toRealUnit(pixArea, calibration), calibration).toFixed(2)} ${getAreaUnit(calibration.unit)}`
          : null
        const previewColor = tool === 'subtract' ? '#ef4444' : activeColor
        const lineConfig: Konva.LineConfig = {
          points: flat, stroke: previewColor, strokeWidth: 2, lineCap: 'round',
        }
        if (!nearFirst) lineConfig.dash = [8, 4]
        if (nearFirst) { lineConfig.closed = true; lineConfig.fill = previewColor + '22' }
        group.add(new Konva.Line(lineConfig))
        currentPoints.forEach((p, i) => {
          group.add(new Konva.Circle({
            x: p.x, y: p.y,
            radius: i === 0 ? (nearFirst ? 7 : 5) : 4,
            fill: i === 0 && nearFirst ? 'white' : previewColor,
            stroke: i === 0 ? previewColor : undefined,
            strokeWidth: 1,
          }))
        })
        if (last && aLabel) {
          group.add(new Konva.Rect({ x: last.x + 12, y: last.y - 14, width: aLabel.length * 7 + 8, height: 16, fill: 'rgba(0,0,0,0.85)', cornerRadius: 3 }))
          group.add(new Konva.Text({ x: last.x + 14, y: last.y - 12, text: aLabel, fill: 'white', fontSize: 11 }))
        }
      }

      layer.add(group)
    }

    // ── Calibration overlay ─────────────────────────────────────────────────
    if (activeTool === 'calibrate' || calibPoints.length > 0) {
      const z = Math.max(zoom, 0.1)
      const sw   = 1 / z
      const arm  = 14 / z
      const gap  = 4 / z
      const dot  = 1.5 / z
      const ring = 10 / z
      const th   = 11 / z
      const to   = 14 / z

      const drawReticule = (x: number, y: number): Konva.Group => {
        const g = new Konva.Group()
        g.add(new Konva.Line({ points: [x - arm - gap, y, x - gap, y], stroke: '#ef4444', strokeWidth: sw }))
        g.add(new Konva.Line({ points: [x + gap, y, x + arm + gap, y], stroke: '#ef4444', strokeWidth: sw }))
        g.add(new Konva.Line({ points: [x, y - arm - gap, x, y - gap], stroke: '#ef4444', strokeWidth: sw }))
        g.add(new Konva.Line({ points: [x, y + gap, x, y + arm + gap], stroke: '#ef4444', strokeWidth: sw }))
        g.add(new Konva.Circle({ x, y, radius: dot, fill: '#ef4444' }))
        g.add(new Konva.Circle({ x, y, radius: ring, stroke: '#ef4444', strokeWidth: sw }))
        return g
      }

      const calibGroup = new Konva.Group()

      if (calibPoints.length >= 1 && mousePos) {
        calibGroup.add(new Konva.Line({
          points: [calibPoints[0].x, calibPoints[0].y, mousePos.x, mousePos.y],
          stroke: '#ef4444', strokeWidth: sw * 1.5, dash: [6 / z, 3 / z],
        }))
      }
      if (calibPoints.length === 2) {
        calibGroup.add(new Konva.Line({
          points: calibPoints.flatMap(p => [p.x, p.y]),
          stroke: '#ef4444', strokeWidth: sw * 1.5, dash: [6 / z, 3 / z],
        }))
      }
      for (const p of calibPoints) calibGroup.add(drawReticule(p.x, p.y))

      if (activeTool === 'calibrate' && mousePos && calibPoints.length < 2) {
        calibGroup.add(drawReticule(mousePos.x, mousePos.y))
        calibGroup.add(new Konva.Text({
          x: mousePos.x + to, y: mousePos.y - to,
          text: calibPoints.length === 0 ? 'Clic 1er point' : 'Clic 2ème point',
          fill: '#ef4444', fontSize: th, fontStyle: 'bold',
        }))
      }

      layer.add(calibGroup)
    }

    // ── Legend ──────────────────────────────────────────────────────────────
    if (legend.visible && legend.page === currentPage) {
      const visiblePostes = postes.filter(p => posteStats[p.id]?.count > 0)
      if (visiblePostes.length > 0) {
        const DOT_W  = 18
        const NAME_W = 120
        const VAL_W  = 75
        const W      = DOT_W + NAME_W + VAL_W
        const ROW_H  = 14
        const HDR_H  = 14
        const H      = HDR_H + visiblePostes.length * ROW_H
        const x1     = DOT_W
        const x2     = DOT_W + NAME_W

        const legendGroup = new Konva.Group({ x: legend.x, y: legend.y, draggable: true })
        legendGroup.on('dragend', (e) => {
          setLegend({ x: e.target.x(), y: e.target.y() })
        })

        legendGroup.add(new Konva.Rect({ width: W, height: H, fill: 'white', stroke: '#6b7280', strokeWidth: 1 }))
        legendGroup.add(new Konva.Rect({ width: W, height: HDR_H, fill: '#d1d5db' }))
        legendGroup.add(new Konva.Line({ points: [0, HDR_H, W, HDR_H], stroke: '#6b7280', strokeWidth: 1 }))
        legendGroup.add(new Konva.Text({ x: x1 + 3, y: 3, text: 'Désignation', fill: '#374151', fontSize: 8, fontStyle: 'bold', width: NAME_W - 4 }))
        legendGroup.add(new Konva.Text({ x: x2 + 3, y: 3, text: 'Total', fill: '#374151', fontSize: 8, fontStyle: 'bold', width: VAL_W - 4 }))
        legendGroup.add(new Konva.Line({ points: [x1, 0, x1, H], stroke: '#9ca3af', strokeWidth: 0.5 }))
        legendGroup.add(new Konva.Line({ points: [x2, 0, x2, H], stroke: '#9ca3af', strokeWidth: 0.5 }))

        visiblePostes.forEach((p, i) => {
          const s = posteStats[p.id]
          const ry = HDR_H + i * ROW_H
          const rowGroup = new Konva.Group({ y: ry })
          if (i % 2 !== 0) rowGroup.add(new Konva.Rect({ width: W, height: ROW_H, fill: '#f3f4f6' }))
          if (i > 0) rowGroup.add(new Konva.Line({ points: [0, 0, W, 0], stroke: '#e5e7eb', strokeWidth: 0.5 }))
          rowGroup.add(new Konva.Circle({ x: DOT_W / 2, y: ROW_H / 2, radius: 4, fill: p.color }))
          rowGroup.add(new Konva.Text({ x: x1 + 3, y: ROW_H / 2 - 4, text: p.name, fill: '#111827', fontSize: 8, width: NAME_W - 5, ellipsis: true }))
          rowGroup.add(new Konva.Text({ x: x2 + 3, y: ROW_H / 2 - 4, text: `${s.total.toFixed(2)} ${s.unit}`, fill: '#111827', fontSize: 8, width: VAL_W - 5 }))
          legendGroup.add(rowGroup)
        })

        layer.add(legendGroup)
      }
    }

    layer.batchDraw()
  }, [
    layer,
    measurements, selectedMeasurementId, calibration, postes, legend, posteStats,
    activeTool, activeColor, currentPage, zoom,
    currentPoints, calibPoints, mousePos,
    selectMeasurement, setLegend,
  ])
}

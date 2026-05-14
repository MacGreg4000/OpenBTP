'use client'
import React, { useRef, useState, useCallback, useEffect } from 'react'
import Konva from 'konva'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import { useToolStore } from '@/store/metres-plan/useToolStore'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { FileUp } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import { usePdfLayer } from '@/components/metres-plan/PdfLayer'
import { useDrawLayer } from '@/components/metres-plan/DrawLayer'
import type { Point } from '@/types/metres-plan'
import {
  distance,
  polylineLength,
  polygonArea,
  toRealUnit,
  slopeToFactor,
  getAreaUnit,
} from '@/lib/metres-plan/geometry'
import { nanoid } from '@/lib/metres-plan/nanoid'

// Worker PDF.js : initialisé côté client uniquement (Next.js)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`
}

interface Props {
  onPdfLoaded?: (bytes: Uint8Array, fileName: string) => void
}

const CanvasArea: React.FC<Props> = ({ onPdfLoaded }) => {
  const containerRef     = useRef<HTMLDivElement>(null)
  const pdfCanvasRef     = useRef<HTMLCanvasElement>(null)
  const konvaContainerRef = useRef<HTMLDivElement>(null)
  const stageRef         = useRef<Konva.Stage | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 100, height: 100 })
  const [pdfDims, setPdfDims]       = useState({ width: 0, height: 0 })
  const [isPanning, setIsPanning]   = useState(false)
  const [stagePos, setStagePos]     = useState({ x: 0, y: 0 })
  const lastDragPos        = useRef<{ x: number; y: number } | null>(null)
  const shouldRecenterRef  = useRef(true)
  const spaceHeldRef       = useRef(false)
  const prevToolRef        = useRef<string>('select')
  const currentPointsRef   = useRef<Point[]>([])
  const zoomRef            = useRef(1)
  const pdfDimsRef         = useRef({ width: 0, height: 0 })

  const { pdfDocument, currentPage, zoom, setZoom, setPdfDocument, setPdfBytes } = usePdfStore()
  const { activeTool, setActiveTool }   = useToolStore()
  const { addMeasurement, pageRotations } = useProjectStore()

  const [currentPoints, setCurrentPoints] = useState<Point[]>([])
  const [mousePos, setMousePos]           = useState<Point | null>(null)
  const [calibPoints, setCalibPoints]     = useState<Point[]>([])

  // Konva draw layer (set once the stage is created imperatively)
  const [drawLayer, setDrawLayer] = useState<Konva.Layer | null>(null)

  currentPointsRef.current = currentPoints
  zoomRef.current          = zoom
  pdfDimsRef.current       = pdfDims

  // ── Container resize ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      setCanvasSize({ width: container.clientWidth, height: container.clientHeight })
    })
    observer.observe(container)
    setCanvasSize({ width: container.clientWidth, height: container.clientHeight })
    return () => observer.disconnect()
  }, [])

  // ── Sync stage size when canvas resizes ─────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    stage.width(canvasSize.width)
    stage.height(canvasSize.height)
    stage.batchDraw()
  }, [canvasSize])

  // ── Reset recenter flag on new PDF / page / rotation ─────────────────────
  useEffect(() => {
    shouldRecenterRef.current = true
  }, [pdfDocument, currentPage, pageRotations])

  // ── Handler refs — updated every render, registered once ─────────────────
  // (avoids stale closures without re-registering event listeners)
  const handlersRef = useRef({
    mousedown: (_e: Konva.KonvaEventObject<MouseEvent>) => {},
    mousemove: (_e: Konva.KonvaEventObject<MouseEvent>) => {},
    mouseup:   () => {},
    click:     (_e: Konva.KonvaEventObject<MouseEvent>) => {},
    dblclick:  () => {},
  })

  // ── Create Konva stage imperatively (no react-konva) ────────────────────
  useEffect(() => {
    const container = konvaContainerRef.current
    if (!container) return

    const stage = new Konva.Stage({
      container,
      width:  canvasSize.width  || 100,
      height: canvasSize.height || 100,
    })
    const layer = new Konva.Layer()
    stage.add(layer)
    stageRef.current = stage
    setDrawLayer(layer)

    // Indirect handler registration — calls through handlersRef so they are always current
    stage.on('mousedown', (e) => handlersRef.current.mousedown(e))
    stage.on('mousemove', (e) => handlersRef.current.mousemove(e))
    stage.on('mouseup',   () => handlersRef.current.mouseup())
    stage.on('mouseleave',() => handlersRef.current.mouseup())
    stage.on('click',     (e) => handlersRef.current.click(e))
    stage.on('dblclick',  () => handlersRef.current.dblclick())

    return () => {
      stage.destroy()
      stageRef.current = null
      setDrawLayer(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── PDF page rendered callback ────────────────────────────────────────────
  const handlePageRendered = useCallback((w: number, h: number) => {
    setPdfDims({ width: w, height: h })
    const stage = stageRef.current
    if (!stage) return
    stage.scale({ x: zoom, y: zoom })
    if (shouldRecenterRef.current) {
      const container = containerRef.current
      if (container) {
        const x = Math.max(20, (container.clientWidth  - w) / 2)
        const y = Math.max(20, (container.clientHeight - h) / 2)
        setStagePos({ x, y })
        stage.position({ x, y })
      }
      shouldRecenterRef.current = false
    }
    stage.batchDraw()
  }, [zoom])

  usePdfLayer({ canvasRef: pdfCanvasRef, onPageRendered: handlePageRendered })

  // ── Pointer coords in PDF-space ────────────────────────────────────────────
  const getStagePointerPos = useCallback((): Point | null => {
    const stage = stageRef.current
    if (!stage) return null
    const pos = stage.getPointerPosition()
    if (!pos) return null
    const scale = stage.scaleX()
    if (!scale) return null
    return {
      x: (pos.x - stage.x()) / scale,
      y: (pos.y - stage.y()) / scale,
    }
  }, [])

  // ── Wheel zoom ─────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const scaleBy = 1.08
    const oldZ = zoomRef.current
    const newZ = e.deltaY < 0 ? Math.min(5, oldZ * scaleBy) : Math.max(0.1, oldZ / scaleBy)
    const pointer = stage.getPointerPosition()!
    const sp = stage.position()
    const mp = { x: (pointer.x - sp.x) / oldZ, y: (pointer.y - sp.y) / oldZ }
    const np = { x: pointer.x - mp.x * newZ, y: pointer.y - mp.y * newZ }
    setZoom(newZ)
    setStagePos(np)
    stage.scale({ x: newZ, y: newZ })
    stage.position(np)
    stage.batchDraw()
  }, [setZoom])

  // ── Finalize a measurement ──────────────────────────────────────────────────
  const finalizeMeasurement = useCallback((pts: Point[], fromDoubleClick = false) => {
    const { activeTool } = useToolStore.getState()
    const { calibration, activePosteId } = useProjectStore.getState()
    if (!calibration) {
      alert("Calibrez d'abord l'echelle (touche C).")
      setCurrentPoints([])
      return
    }
    const final = fromDoubleClick && pts.length > 1 ? pts.slice(0, -1) : pts
    if (final.length < 1) { setCurrentPoints([]); return }
    const { currentPage }                         = usePdfStore.getState()
    const { activeColor, slopeFormat, slopeValue, wallHeight } = useToolStore.getState()
    const posteId    = activePosteId ?? undefined
    const activePoste = useProjectStore.getState().postes.find(p => p.id === activePosteId)
    const color      = activePoste ? activePoste.color : activeColor

    if (activeTool === 'length') {
      if (final.length < 2) { setCurrentPoints([]); return }
      const pixLen = polylineLength(final)
      const value  = parseFloat(toRealUnit(pixLen, calibration).toFixed(3))
      const count  = useProjectStore.getState().measurements.filter(m => m.type === 'length').length + 1
      addMeasurement({ id: nanoid(), type: 'length', name: 'Longueur ' + count, color, page: currentPage, points: final, value, unit: calibration.unit, visible: true, posteId })
    }
    if (activeTool === 'wall') {
      if (final.length < 2) { setCurrentPoints([]); return }
      const pixLen    = polylineLength(final)
      const perimeter = toRealUnit(pixLen, calibration)
      const value     = parseFloat((perimeter * wallHeight).toFixed(3))
      const aUnit     = getAreaUnit(calibration.unit)
      const count     = useProjectStore.getState().measurements.filter(m => m.type === 'wall').length + 1
      addMeasurement({ id: nanoid(), type: 'wall', name: 'Mur ' + count, color, page: currentPage, points: final, value, unit: aUnit, wallHeight, visible: true, posteId })
    }
    if (activeTool === 'area' || activeTool === 'roof' || activeTool === 'subtract') {
      if (final.length < 3) { setCurrentPoints([]); return }
      const pixArea  = polygonArea(final)
      const realArea = toRealUnit(toRealUnit(pixArea, calibration), calibration)
      const sf       = activeTool === 'roof' ? slopeToFactor(slopeValue, slopeFormat) : 1
      const aUnit    = getAreaUnit(calibration.unit)
      if (activeTool === 'subtract') {
        const value = -parseFloat(realArea.toFixed(3))
        const count = useProjectStore.getState().measurements.filter(m => m.type === 'subtract').length + 1
        addMeasurement({ id: nanoid(), type: 'subtract', name: 'Déduction ' + count, color, page: currentPage, points: final, value, unit: aUnit, visible: true, posteId })
      } else {
        const value = parseFloat((realArea * sf).toFixed(3))
        const count = useProjectStore.getState().measurements.filter(m => m.type === activeTool).length + 1
        addMeasurement({
          id: nanoid(), type: activeTool,
          name: activeTool === 'roof' ? 'Toiture ' + count : 'Surface ' + count,
          color, page: currentPage, points: final, value, unit: aUnit,
          slopeFormat: activeTool === 'roof' ? slopeFormat : undefined,
          slopeValue:  activeTool === 'roof' ? slopeValue  : undefined,
          slopeFactor: activeTool === 'roof' ? sf          : undefined,
          visible: true, posteId,
        })
      }
    }
    setCurrentPoints([])
  }, [addMeasurement])

  // ── Keyboard shortcuts & global events ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const inInput = ['input','textarea','select'].includes((e.target as Element)?.tagName?.toLowerCase())
      if (e.code === 'Space' && !inInput && !spaceHeldRef.current) {
        e.preventDefault()
        spaceHeldRef.current = true
        prevToolRef.current  = useToolStore.getState().activeTool
        setActiveTool('pan')
      }
      if (e.key === 'Escape') { setCurrentPoints([]); setCalibPoints([]) }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); useProjectStore.getState().undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); useProjectStore.getState().redo() }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inInput) {
        const { selectedMeasurementId, deleteMeasurement } = useProjectStore.getState()
        if (selectedMeasurementId) deleteMeasurement(selectedMeasurementId)
      }
      if (e.key === 'Enter' && !inInput) {
        const pts = currentPointsRef.current
        if (pts.length >= 2) finalizeMeasurement(pts)
      }
      if (!e.ctrlKey && !e.metaKey && !inInput) {
        const map: Record<string, string> = {
          '1': 'length', '2': 'area', '3': 'count', '4': 'roof',
          '5': 'subtract', '6': 'wall', 'c': 'calibrate', 'C': 'calibrate',
        }
        if (map[e.key]) { setActiveTool(map[e.key] as never); setCurrentPoints([]) }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && spaceHeldRef.current) {
        spaceHeldRef.current = false
        setActiveTool((prevToolRef.current || 'select') as never)
      }
    }
    const handleZoom = (factor: number) => {
      const stage = stageRef.current; if (!stage) return
      const z    = zoomRef.current
      const newZ = Math.max(0.1, Math.min(5, z * factor))
      const c    = { x: canvasSize.width / 2, y: canvasSize.height / 2 }
      const mp   = { x: (c.x - stage.x()) / z, y: (c.y - stage.y()) / z }
      const np   = { x: c.x - mp.x * newZ, y: c.y - mp.y * newZ }
      setZoom(newZ); setStagePos(np); stage.scale({ x: newZ, y: newZ }); stage.position(np); stage.batchDraw()
    }
    const handleZoomFit = () => {
      const stage = stageRef.current; const container = containerRef.current
      if (!stage || !container || !pdfDimsRef.current.width) return
      const pad = 40
      const sx  = (container.clientWidth  - pad * 2) / pdfDimsRef.current.width
      const sy  = (container.clientHeight - pad * 2) / pdfDimsRef.current.height
      const newZ = Math.min(sx, sy, 5)
      const x   = (container.clientWidth  - pdfDimsRef.current.width  * newZ) / 2
      const y   = (container.clientHeight - pdfDimsRef.current.height * newZ) / 2
      const np  = { x: Math.max(0, x), y: Math.max(0, y) }
      setZoom(newZ); setStagePos(np); stage.scale({ x: newZ, y: newZ }); stage.position(np); stage.batchDraw()
    }
    const onZoomIn  = () => handleZoom(1.2)
    const onZoomOut = () => handleZoom(1 / 1.2)
    window.addEventListener('keydown',   onKeyDown)
    window.addEventListener('keyup',     onKeyUp)
    window.addEventListener('zoom-in',   onZoomIn)
    window.addEventListener('zoom-out',  onZoomOut)
    window.addEventListener('zoom-fit',  handleZoomFit)
    return () => {
      window.removeEventListener('keydown',   onKeyDown)
      window.removeEventListener('keyup',     onKeyUp)
      window.removeEventListener('zoom-in',   onZoomIn)
      window.removeEventListener('zoom-out',  onZoomOut)
      window.removeEventListener('zoom-fit',  handleZoomFit)
    }
  }, [setActiveTool, finalizeMeasurement, setZoom, canvasSize])

  // ── Stage event handlers (stored in ref so the stage can be created once) ─
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (useToolStore.getState().activeTool === 'pan' || e.evt.button === 1) {
      setIsPanning(true)
      lastDragPos.current = { x: e.evt.clientX, y: e.evt.clientY }
    }
  }, [])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = getStagePointerPos()
    if (pos) setMousePos(pos)
    if (isPanning && lastDragPos.current) {
      const stage = stageRef.current; if (!stage) return
      const dx = e.evt.clientX - lastDragPos.current.x
      const dy = e.evt.clientY - lastDragPos.current.y
      lastDragPos.current = { x: e.evt.clientX, y: e.evt.clientY }
      const np = { x: stage.x() + dx, y: stage.y() + dy }
      setStagePos(np); stage.position(np); stage.batchDraw()
    }
  }, [isPanning, getStagePointerPos])

  const handleStageMouseUp = useCallback(() => {
    setIsPanning(false); lastDragPos.current = null
  }, [])

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button !== 0 || isPanning) return
    const tool = useToolStore.getState().activeTool
    const pos  = getStagePointerPos(); if (!pos) return
    if (tool === 'calibrate') {
      setCalibPoints(prev => {
        const next = [...prev, pos]
        if (next.length === 2) {
          const d = distance(next[0], next[1])
          window.dispatchEvent(new CustomEvent('calibration-ready', { detail: { points: next, pixelDistance: d } }))
          return []
        }
        return next
      })
      return
    }
    if (tool === 'count') {
      const { counterName, counterColor, counterUnitWidth, counterUnitHeight } = useToolStore.getState()
      const { currentPage } = usePdfStore.getState()
      const { activePosteId, calibration } = useProjectStore.getState()
      const hasDims = counterUnitWidth > 0 && counterUnitHeight > 0
      const value   = hasDims ? parseFloat((counterUnitWidth * counterUnitHeight).toFixed(4)) : 1
      const unit    = hasDims && calibration ? getAreaUnit(calibration.unit) : 'unites'
      addMeasurement({ id: nanoid(), type: 'count', name: counterName, color: counterColor, page: currentPage, points: [pos], value, unit, visible: true, posteId: activePosteId ?? undefined })
      return
    }
    if (['length', 'area', 'roof', 'subtract', 'wall'].includes(tool)) {
      setCurrentPoints(prev => [...prev, pos])
    }
  }, [isPanning, getStagePointerPos, addMeasurement])

  const handleStageDblClick = useCallback(() => {
    const pts = currentPointsRef.current
    if (pts.length >= 2) finalizeMeasurement(pts, true)
    else setCurrentPoints([])
  }, [finalizeMeasurement])

  // ── Keep handler refs up-to-date every render ──────────────────────────────
  handlersRef.current.mousedown = handleStageMouseDown
  handlersRef.current.mousemove = handleStageMouseMove
  handlersRef.current.mouseup   = handleStageMouseUp
  handlersRef.current.click     = handleStageClick
  handlersRef.current.dblclick  = handleStageDblClick

  // ── Imperative draw layer ──────────────────────────────────────────────────
  useDrawLayer({ layer: drawLayer, currentPoints, calibPoints, mousePos })

  // ── PDF loading ────────────────────────────────────────────────────────────
  const loadPdf = useCallback(async (file: File) => {
    try {
      const buf   = await file.arrayBuffer()
      const bytes = new Uint8Array(buf)
      const doc   = await pdfjs.getDocument({ data: bytes }).promise
      setPdfDocument(doc, file.name)
      setPdfBytes(bytes)
      setCurrentPoints([]); setCalibPoints([])
      setZoom(1)
      const stage = stageRef.current
      if (stage) { stage.position({ x: 0, y: 0 }); stage.scale({ x: 1, y: 1 }) }
      setStagePos({ x: 0, y: 0 })
      onPdfLoaded?.(bytes, file.name)
    } catch (err) {
      alert('Erreur lors du chargement du PDF.')
      console.error(err)
    }
  }, [setPdfDocument, setPdfBytes, setZoom, onPdfLoaded])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file?.type === 'application/pdf') loadPdf(file)
  }, [loadPdf])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadPdf(file)
    e.target.value = ''
  }, [loadPdf])

  useEffect(() => {
    const onOpenPdf = () => { document.getElementById('pdf-file-input')?.click() }
    window.addEventListener('open-pdf', onOpenPdf)
    return () => window.removeEventListener('open-pdf', onOpenPdf)
  }, [])

  const cursorStyle = () => {
    if (isPanning) return 'grabbing'
    switch (activeTool) {
      case 'pan':                                                                       return 'grab'
      case 'calibrate': case 'length': case 'area': case 'roof':
      case 'subtract':  case 'wall':                                                    return 'crosshair'
      case 'count':                                                                     return 'cell'
      default:                                                                          return 'default'
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden bg-gray-950"
      style={{ cursor: cursorStyle() }}
      onWheel={handleWheel}
      onDrop={handleDrop}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
    >
      <input id="pdf-file-input" type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />

      {!pdfDocument && (
        <label htmlFor="pdf-file-input" className="absolute inset-0 flex items-center justify-center cursor-pointer group">
          <div className="flex flex-col items-center gap-4 p-12 border-2 border-dashed border-gray-700 rounded-2xl group-hover:border-blue-500 transition-all group-hover:bg-blue-950/20">
            <FileUp size={56} className="text-gray-600 group-hover:text-blue-400 transition-colors" />
            <div className="text-center">
              <p className="text-xl font-semibold text-gray-300">Importer un plan PDF</p>
              <p className="text-sm text-gray-500 mt-1">Glissez-deposez ou cliquez pour selectionner</p>
              <p className="text-xs text-gray-600 mt-2">Multi-pages • 100% local • aucun serveur</p>
            </div>
          </div>
        </label>
      )}

      {pdfDocument && (
        <canvas
          ref={pdfCanvasRef}
          style={{
            position: 'absolute',
            top: stagePos.y,
            left: stagePos.x,
            transformOrigin: '0 0',
            pointerEvents: 'none',
            boxShadow: '0 4px 40px rgba(0,0,0,0.6)',
            zIndex: 1,
          }}
        />
      )}

      {/* Konva container — always in DOM so the stage can be created on mount */}
      <div
        ref={konvaContainerRef}
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          zIndex: 2,
          display: pdfDocument ? 'block' : 'none',
        }}
      />
    </div>
  )
}

export default CanvasArea

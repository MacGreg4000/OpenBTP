'use client'
import { useEffect, useRef, useCallback } from 'react'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'

interface UsePdfLayerOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onPageRendered?: (width: number, height: number) => void
}

export function usePdfLayer({ canvasRef, onPageRendered }: UsePdfLayerOptions) {
  const renderTaskRef = useRef<any>(null)
  const { pdfDocument, currentPage, zoom, setPageInfo } = usePdfStore()
  const { pageRotations } = useProjectStore()

  const renderPage = useCallback(async () => {
    if (!pdfDocument || !canvasRef.current) return

    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel() } catch {}
      renderTaskRef.current = null
    }

    const rotation = pageRotations[currentPage] ?? 0
    const page = await pdfDocument.getPage(currentPage)
    const dpr = window.devicePixelRatio || 1
    const baseViewport = page.getViewport({ scale: zoom, rotation })
    const viewport = page.getViewport({ scale: zoom * dpr, rotation })

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = viewport.width
    canvas.height = viewport.height
    canvas.style.width = `${baseViewport.width}px`
    canvas.style.height = `${baseViewport.height}px`

    renderTaskRef.current = page.render({ canvasContext: ctx, viewport })
    try {
      await renderTaskRef.current.promise
      setPageInfo({
        width: baseViewport.width,
        height: baseViewport.height,
        transform: baseViewport.transform,
      })
      onPageRendered?.(baseViewport.width, baseViewport.height)
    } catch (e: any) {
      if (e?.name !== 'RenderingCancelledException') console.error('PDF render error:', e)
    }
  }, [pdfDocument, currentPage, zoom, pageRotations, canvasRef, setPageInfo, onPageRendered])

  useEffect(() => {
    renderPage()
    return () => {
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch {}
      }
    }
  }, [renderPage])
}

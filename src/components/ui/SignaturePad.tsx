'use client'
/**
 * SignaturePad — canvas de signature tactile/souris sans décalage.
 *
 * Problème corrigé : react-signature-canvas fixe width/height en pixels internes
 * mais le CSS affiche le canvas à une autre taille → décalage proportionnel.
 *
 * Solution : on lit les dimensions réelles via getBoundingClientRect() et on
 * synchronise la résolution interne du canvas à chaque resize.
 * Les coordonnées touch/mouse utilisent aussi getBoundingClientRect() pour
 * être toujours relatives au canvas réel, quel que soit le scroll ou le zoom.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useCallback,
} from 'react'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  toDataURL: (type?: string, quality?: number) => string
}

interface SignaturePadProps {
  /** Couleur du trait */
  penColor?: string
  /** Couleur de fond */
  backgroundColor?: string
  /** Classes CSS supplémentaires sur le canvas */
  className?: string
  /** Hauteur fixe en px (sinon 200) */
  height?: number
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  (
    {
      penColor = 'rgb(0,0,0)',
      backgroundColor = 'rgb(255,255,255)',
      className = '',
      height = 200,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const hasStrokes = useRef(false)

    /** Synchronise la résolution interne du canvas avec sa taille CSS réelle */
    const resizeCanvas = useCallback(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Sauvegarder le contenu actuel
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)

      // Fond blanc
      ctx.fillStyle = backgroundColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Restaurer le contenu (best-effort)
      ctx.putImageData(imageData, 0, 0)

      ctx.scale(dpr, dpr)
      ctx.strokeStyle = penColor
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }, [backgroundColor, penColor])

    useEffect(() => {
      resizeCanvas()
      const observer = new ResizeObserver(resizeCanvas)
      if (canvasRef.current) observer.observe(canvasRef.current)
      return () => observer.disconnect()
    }, [resizeCanvas])

    /** Convertit un événement (mouse ou touch) en coordonnées canvas */
    const getPos = (
      e: MouseEvent | TouchEvent
    ): { x: number; y: number } => {
      const canvas = canvasRef.current!
      const rect = canvas.getBoundingClientRect()

      if ('touches' in e) {
        const touch = e.touches[0]
        return {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
        }
      }
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      }
    }

    const startDraw = useCallback((e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      drawing.current = true
      hasStrokes.current = true
      const { x, y } = getPos(e)
      ctx.beginPath()
      ctx.moveTo(x, y)
    }, [])

    const draw = useCallback((e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!drawing.current) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { x, y } = getPos(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }, [])

    const stopDraw = useCallback(() => {
      drawing.current = false
    }, [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return

      // Mouse
      canvas.addEventListener('mousedown', startDraw)
      canvas.addEventListener('mousemove', draw)
      canvas.addEventListener('mouseup', stopDraw)
      canvas.addEventListener('mouseleave', stopDraw)

      // Touch
      canvas.addEventListener('touchstart', startDraw, { passive: false })
      canvas.addEventListener('touchmove', draw, { passive: false })
      canvas.addEventListener('touchend', stopDraw)

      return () => {
        canvas.removeEventListener('mousedown', startDraw)
        canvas.removeEventListener('mousemove', draw)
        canvas.removeEventListener('mouseup', stopDraw)
        canvas.removeEventListener('mouseleave', stopDraw)
        canvas.removeEventListener('touchstart', startDraw)
        canvas.removeEventListener('touchmove', draw)
        canvas.removeEventListener('touchend', stopDraw)
      }
    }, [startDraw, draw, stopDraw])

    // API exposée via ref
    useImperativeHandle(ref, () => ({
      clear() {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        hasStrokes.current = false
      },
      isEmpty() {
        return !hasStrokes.current
      },
      toDataURL(type = 'image/png', quality?: number) {
        return canvasRef.current?.toDataURL(type, quality) ?? ''
      },
    }))

    return (
      <canvas
        ref={canvasRef}
        className={`block w-full touch-none ${className}`}
        style={{ height: `${height}px`, cursor: 'crosshair' }}
      />
    )
  }
)

SignaturePad.displayName = 'SignaturePad'
export default SignaturePad

'use client'
import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  value: string
  size?: number
}

export default function QRCodeDisplay({ value, size = 128 }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        }
      )
    }
  }, [value, size])

  return <canvas ref={canvasRef} />
} 
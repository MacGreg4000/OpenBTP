'use client'
import { useEffect, useRef, useState } from 'react'
import type { Html5QrcodeScanner } from 'html5-qrcode'

interface QRCodeScannerProps {
  onScanSuccess: (decodedText: string) => void
  onScanError?: (error: string) => void
}

export default function QRCodeScanner({ onScanSuccess, onScanError }: QRCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const { Html5QrcodeScanner: ScannerCtor, Html5QrcodeSupportedFormats: Formats } = await import('html5-qrcode')
        // Initialiser le scanner
        scannerRef.current = new ScannerCtor(
          'qr-reader',
          {
            qrbox: {
              width: 250,
              height: 250,
            },
            fps: 10,
            formatsToSupport: [Formats.QR_CODE],
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            aspectRatio: 1,
            videoConstraints: {
              facingMode: { ideal: 'environment' }
            }
          },
          /* verbose= */ false
        )

        // Démarrer le scan
        if (isMounted && scannerRef.current) {
          scannerRef.current.render(
            (decodedText: string) => {
              if (scannerRef.current) {
                scannerRef.current.clear()
                setCameraError(null)
                onScanSuccess(decodedText)
              }
            },
            (error: string) => {
              // Ignorer les erreurs de scan normales
              if (!error.includes('NotFound')) {
                if (onScanError) {
                  onScanError(`Erreur de scan: ${error}`)
                }
                setCameraError(`Erreur de scan: ${error}`)
              }
            }
          )
          setIsScanning(true)
        }
      } catch (error) {
        console.error('Erreur d\'initialisation du scanner:', error)
        if (onScanError) {
          onScanError('Erreur d\'initialisation du scanner')
        }
        setCameraError('Erreur d\'initialisation du scanner')
      }
    }
    void init()

    // Cleanup
    return () => {
      isMounted = false
      if (scannerRef.current) {
        try {
          scannerRef.current.clear()
        } catch (error) {
          console.error('Erreur lors du nettoyage du scanner:', error)
        }
      }
    }
  }, [onScanSuccess, onScanError])

  // Styles personnalisés pour le scanner
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      #qr-reader {
        border: none !important;
        padding: 0 !important;
      }
      #qr-reader__scan_region {
        min-height: 300px !important;
        background: #f3f4f6 !important;
        border-radius: 0.5rem !important;
      }
      #qr-reader__dashboard {
        padding: 1rem !important;
        background: white !important;
        border-radius: 0.5rem !important;
        margin-top: 1rem !important;
      }
      #qr-reader__dashboard button {
        padding: 0.5rem 1rem !important;
        background: #2563eb !important;
        color: white !important;
        border-radius: 0.375rem !important;
        border: none !important;
      }
      #qr-reader__dashboard button:hover {
        background: #1d4ed8 !important;
      }
      #qr-reader__dashboard select {
        padding: 0.5rem !important;
        border: 1px solid #d1d5db !important;
        border-radius: 0.375rem !important;
        margin-right: 0.5rem !important;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  if (cameraError) {
    return (
      <div className="w-full max-w-md mx-auto p-4 bg-red-50 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              {cameraError}
            </h3>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div id="qr-reader" className="w-full" />
      {isScanning && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 text-center">
            Placez le QR code devant la caméra
          </p>
          <p className="text-xs text-gray-400 text-center mt-1">
            La caméra arrière sera utilisée par défaut si disponible
          </p>
        </div>
      )}
    </div>
  )
} 
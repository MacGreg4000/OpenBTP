'use client'

import { useState } from 'react'
import QRCodeScanner from '../outillage/QRCodeScanner'

interface EmplacementQRScannerProps {
  onScanComplete: (rackId: string, ligne: number, colonne: number, emplacementQrCode: string) => void
}

export default function EmplacementQRScanner({ onScanComplete }: EmplacementQRScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState<string>('')
  
  // Traitement du QR code scanné
  const handleScanSuccess = (decodedText: string) => {
    try {
      // Vérifier si c'est une URL contenant le paramètre code
      const urlMatch = decodedText.match(/[?&]code=([^&]+)/)
      let codeValue = decodedText
      
      if (urlMatch && urlMatch[1]) {
        // Extraire le code de l'URL
        codeValue = urlMatch[1]
      }
      
      // Vérifier le format attendu: EMP-[ID_DU_RACK]-[LIGNE]-[COLONNE]
      const qrCodeRegex = /^EMP-([a-zA-Z0-9-]+)-(\d+)-(\d+)$/
      const match = codeValue.match(qrCodeRegex)
      
      if (!match) {
        throw new Error('Format de QR code non reconnu')
      }
      
      // Extraire les informations
      const [, rackId, ligneStr, colonneStr] = match
      const ligne = parseInt(ligneStr)
      const colonne = parseInt(colonneStr)
      
      if (isNaN(ligne) || isNaN(colonne)) {
        throw new Error('Coordonnées d\'emplacement invalides')
      }
      
      // Transmettre les informations via le callback
      onScanComplete(rackId, ligne, colonne, codeValue)
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Erreur lors de l\'analyse du QR code')
      }
      
      console.error('Erreur lors de l\'analyse du QR code:', err)
    }
  }
  
  // Traitement du code entré manuellement
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualCode.trim()) {
      handleScanSuccess(manualCode.trim())
    }
  }
  
  // Gestion des erreurs de scan
  const handleScanError = (errorMessage: string) => {
    setError(errorMessage)
  }
  
  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-700 underline"
          >
            Réessayer
          </button>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <h3 className="font-medium text-blue-800 mb-2">Comment scanner un emplacement</h3>
        <ol className="text-blue-700 list-decimal pl-5 space-y-1">
          <li>Autorisez l&apos;accès à la caméra lorsque demandé</li>
          <li>Placez le QR code au centre de la zone de scan</li>
          <li>Tenez l&apos;appareil stable jusqu&apos;à ce que le scan soit terminé</li>
          <li>Vous pouvez également saisir le code manuellement ci-dessous</li>
        </ol>
      </div>
      
      {/* Saisie manuelle */}
      <form onSubmit={handleManualSubmit} className="mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <input
            type="text"
            placeholder="Saisir le code QR manuellement (ex: EMP-12345678-1-2)"
            className="flex-grow px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Valider
          </button>
        </div>
      </form>
      
      {/* Scanner */}
      <QRCodeScanner
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
      />
    </div>
  )
} 
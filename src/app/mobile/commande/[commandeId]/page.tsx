'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export default function MobileCommandePDFPage() {
  const router = useRouter()
  const params = useParams()
  const commandeId = params?.commandeId as string
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!commandeId) {
      setError('ID de commande manquant')
      setLoading(false)
      return
    }

    // D'abord, vérifier si un PDF stocké existe
    const loadPDF = async () => {
      try {
        // Essayer de récupérer le PDF stocké
        const storedResponse = await fetch(`/api/commandes/${commandeId}/pdf-stored`)
        
        if (storedResponse.ok) {
          const data = await storedResponse.json()
          // Utiliser le PDF stocké
          setPdfUrl(data.url)
          setLoading(false)
        } else {
          // Si aucun PDF stocké, générer à la volée
          console.log('Aucun PDF stocké trouvé, génération à la volée...')
          setPdfUrl(`/api/commandes/${commandeId}/pdf-modern`)
          setLoading(false)
        }
      } catch (err) {
        console.error('Erreur lors du chargement du PDF:', err)
        // En cas d'erreur, essayer quand même la génération à la volée
        setPdfUrl(`/api/commandes/${commandeId}/pdf-modern`)
        setLoading(false)
      }
    }

    loadPDF()
  }, [commandeId])

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `commande-${commandeId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du PDF...</p>
        </div>
      </div>
    )
  }

  if (error || !pdfUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-red-600 mb-4">{error || 'Erreur lors du chargement du PDF'}</p>
          <button
            onClick={() => router.push('/mobile/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header avec bouton retour */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/mobile/dashboard')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            <span className="text-gray-700 font-medium">Retour</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center">
            Commande
          </h1>
          <button
            onClick={handleDownload}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Télécharger"
          >
            <ArrowDownTrayIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={`${pdfUrl}#toolbar=1`}
          className="w-full h-full border-0"
          title="PDF Commande"
          style={{ minHeight: 'calc(100vh - 64px)' }}
        />
      </div>
    </div>
  )
}


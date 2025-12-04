'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export default function MobileCommandePDFPage() {
  const router = useRouter()
  const params = useParams()
  const commandeId = params?.commandeId as string
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fonction helper pour convertir l'URL en URL API si nécessaire
  const getDocumentUrl = (url: string) => {
    // Si l'URL commence par /uploads/, la convertir pour utiliser l'API
    if (url.startsWith('/uploads/')) {
      // Enlever le préfixe /uploads/ et utiliser l'API
      const pathWithoutUploads = url.replace('/uploads/', '')
      return `/api/documents/serve/${pathWithoutUploads}`
    }
    // Si l'URL commence déjà par /api/, la retourner telle quelle
    if (url.startsWith('/api/')) {
      return url
    }
    // Sinon, retourner l'URL telle quelle
    return url
  }

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
          // Stocker l'URL originale pour le téléchargement
          setOriginalPdfUrl(data.url)
          // Convertir l'URL pour utiliser l'endpoint API si nécessaire (pour l'affichage)
          setPdfUrl(getDocumentUrl(data.url))
          setLoading(false)
        } else {
          // Si aucun PDF stocké, générer à la volée
          console.log('Aucun PDF stocké trouvé, génération à la volée...')
          const generatedUrl = `/api/commandes/${commandeId}/pdf-modern`
          setOriginalPdfUrl(generatedUrl)
          setPdfUrl(generatedUrl)
          setLoading(false)
        }
      } catch (err) {
        console.error('Erreur lors du chargement du PDF:', err)
        // En cas d'erreur, essayer quand même la génération à la volée
        const generatedUrl = `/api/commandes/${commandeId}/pdf-modern`
        setOriginalPdfUrl(generatedUrl)
        setPdfUrl(generatedUrl)
        setLoading(false)
      }
    }

    loadPDF()
  }, [commandeId])

  const handleDownload = () => {
    // Utiliser l'URL originale pour le téléchargement, ou l'URL convertie si pas d'originale
    const urlToUse = originalPdfUrl || pdfUrl
    if (urlToUse) {
      const link = document.createElement('a')
      link.href = urlToUse
      link.download = `commande-${commandeId}.pdf`
      link.target = '_blank'
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
    <div className="min-h-screen bg-gray-50 flex flex-col relative">
      {/* Header avec bouton retour - toujours visible */}
      <div className="bg-white border-b border-gray-200 shadow-md fixed top-0 left-0 right-0 z-50 safe-area-top">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push('/mobile/dashboard')}
            className="p-2 -ml-2 active:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 touch-manipulation"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            <span className="text-gray-700 font-medium">Retour</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center">
            Commande
          </h1>
          <button
            onClick={handleDownload}
            className="p-2 -mr-2 active:bg-gray-100 rounded-lg transition-colors touch-manipulation"
            aria-label="Télécharger"
          >
            <ArrowDownTrayIcon className="h-6 w-6 text-gray-700" />
          </button>
        </div>
      </div>

      {/* PDF Viewer avec padding pour le header */}
      <div className="flex-1 overflow-hidden mt-[64px]">
        <iframe
          src={`${pdfUrl}#toolbar=1`}
          className="w-full h-full border-0"
          title="PDF Commande"
          style={{ minHeight: 'calc(100vh - 64px)' }}
        />
      </div>

      {/* Bouton flottant de retour - visible même si le header est caché */}
      <button
        onClick={() => router.push('/mobile/dashboard')}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full p-4 shadow-lg z-50 touch-manipulation flex items-center gap-2 transition-all"
        style={{
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        }}
        aria-label="Retour"
      >
        <ArrowLeftIcon className="h-6 w-6" />
        <span className="font-medium hidden sm:inline">Retour</span>
      </button>
    </div>
  )
}


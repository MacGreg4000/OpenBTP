'use client'

import { useRouter, useParams } from 'next/navigation'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { ArrowLeftIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export default function MobileDocumentPDFPage() {
  const router = useRouter()
  const params = useParams()
  const { selectedChantier } = useSelectedChantier()
  const documentId = params?.documentId as string
  const [documentUrl, setDocumentUrl] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPDF, setIsPDF] = useState(false)

  useEffect(() => {
    if (!selectedChantier || !documentId) {
      setError('Données manquantes')
      setLoading(false)
      return
    }

    const loadDocument = async () => {
      try {
        const response = await fetch(
          `/api/chantiers/${selectedChantier.chantierId}/documents/${documentId}`
        )
        if (!response.ok) {
          throw new Error('Document non trouvé')
        }
        const doc = await response.json()
        setDocumentUrl(doc.url)
        setDocumentName(doc.nom)
        setIsPDF(doc.type === 'photo-chantier' ? false : doc.nom.toLowerCase().endsWith('.pdf'))
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
        setLoading(false)
      }
    }

    loadDocument()
  }, [selectedChantier, documentId])

  const handleDownload = () => {
    if (documentUrl) {
      const link = document.createElement('a')
      link.href = documentUrl
      link.download = documentName
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
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  if (error || !documentUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <p className="text-red-600 mb-4">{error || 'Erreur lors du chargement'}</p>
          <button
            onClick={() => router.push('/mobile/documents')}
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
            onClick={() => router.push('/mobile/documents')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            <span className="text-gray-700 font-medium">Retour</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900 flex-1 text-center truncate px-2">
            {documentName}
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

      {/* Viewer */}
      <div className="flex-1 overflow-hidden">
        {isPDF ? (
          <iframe
            src={`${documentUrl}#toolbar=1`}
            className="w-full h-full border-0"
            title={documentName}
            style={{ minHeight: 'calc(100vh - 64px)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img
              src={documentUrl}
              alt={documentName}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  )
}


'use client'

import { useState } from 'react'
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface PDFModalProps {
  isOpen: boolean
  onClose: () => void
  chantierId: string
}

export default function PDFModal({ isOpen, onClose, chantierId }: PDFModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/chantiers/${chantierId}/depenses/pdf`)
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Créer un lien temporaire pour télécharger le PDF
      const a = document.createElement('a')
      a.href = url
      a.download = `depenses-${chantierId}.pdf`
      document.body.appendChild(a)
      a.click()
      
      // Nettoyer
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Rapport des dépenses
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Téléchargez le rapport PDF des dépenses pour ce chantier.
          </p>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Annuler
            </button>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              {loading ? 'Génération...' : 'Télécharger PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
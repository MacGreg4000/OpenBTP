'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

interface BonRegie {
  id: number
  dates: string
  client: string
  nomChantier: string
  description: string
  tempsChantier: number | null
  nombreTechniciens: number | null
  materiaux: string | null
  nomSignataire: string
  dateSignature: string
  signature: string
  createdAt: string
  updatedAt: string
  chantierId: string | null
}

export default function BonRegieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const paramsData = use(params);
  const router = useRouter()
  const [bon, setBon] = useState<BonRegie | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchBonRegie = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/bon-regie/${paramsData.id}`)
        
        if (!response.ok) {
          throw new Error(`Erreur lors de la récupération du bon de régie: ${response.status}`)
        }
        
        const data = await response.json()
        setBon(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger les détails du bon de régie')
      } finally {
        setLoading(false)
      }
    }
    
    if (paramsData.id) {
      fetchBonRegie()
    }
  }, [paramsData.id])
  
  const handleGeneratePDF = async () => {
    if (!bon) return
    
    try {
      setGenerating(true)
      
      // Appel à l'API pour générer le PDF
      const response = await fetch('/api/pdf/bon-regie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bonRegieId: bon.id })
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }
      
      // Récupérer le blob PDF
      const blob = await response.blob()
      
      // Créer un lien temporaire pour télécharger le PDF
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bon-regie-${bon.id}.pdf`
      document.body.appendChild(a)
      a.click()
      
      // Nettoyer
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Une erreur est survenue lors de la génération du PDF')
    } finally {
      setGenerating(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 w-64 mb-6 rounded"></div>
            <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/3 mb-4 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-4 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/4 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  if (error || !bon) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
            {error || 'Bon de régie non trouvé'}
            <button 
              onClick={() => router.push('/bons-regie')}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/bons-regie')}
              className="mr-4 p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Détails du bon de régie
            </h1>
          </div>
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="inline-flex items-center px-5 py-3 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors min-h-[48px]"
          >
            <DocumentArrowDownIcon className="-ml-1 mr-2 h-6 w-6" aria-hidden="true" />
            {generating ? 'Génération...' : 'Télécharger PDF'}
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5 md:p-8 border-2 border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Client
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {bon.client}
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Chantier
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {bon.nomChantier}
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Date d&apos;intervention
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {bon.dates}
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Date de signature
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
              </p>
            </div>
          </div>
          
          <div className="mb-8">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Travail réalisé
            </h3>
            <p className="text-base text-gray-900 dark:text-gray-100 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              {bon.description}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Temps sur chantier
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {bon.tempsChantier} heures
              </p>
            </div>
            
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Nombre d&apos;ouvriers
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-700 px-4 py-3 rounded-lg">
                {bon.nombreTechniciens || 1}
              </p>
            </div>
          </div>
          
          {bon.materiaux && (
            <div className="mb-8">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Matériaux utilisés
              </h3>
              <p className="text-base text-gray-900 dark:text-gray-100 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-gray-200 dark:border-gray-600 whitespace-pre-wrap">
                {bon.materiaux}
              </p>
            </div>
          )}
          
          <div className="border-t-2 border-gray-300 dark:border-gray-600 pt-6 mt-8">
            <div className="flex flex-col items-end">
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Signé par
              </h3>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-3 bg-gray-50 dark:bg-gray-700 px-4 py-2 rounded-lg">
                {bon.nomSignataire}
              </p>
              <div className="bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-lg p-3 w-48 h-28 flex items-center justify-center shadow-sm">
                <img 
                  src={bon.signature} 
                  alt="Signature" 
                  className="max-w-full max-h-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DocumentTextIcon, ArrowTopRightOnSquareIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

interface BonRegie {
  id: number
  dates: string
  client: string
  nomChantier: string
  description: string
  dateSignature: string
  // createdAt: string; // Si utilisé quelque part, sinon facultatif ici
}

export default function BonsRegieWidget() {
  const [bonsRegie, setBonsRegie] = useState<BonRegie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBonsRegie = async () => {
      setLoading(true) 
      setError(null) 
      try {
        // Récupérer seulement les 3 derniers bons pour le widget
        const response = await fetch('/api/public/bon-regie?limit=3') 
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des bons de régie')
        }
        const data = await response.json()
        setBonsRegie(data)
      } catch (err) {
        console.error('Erreur:', err)
        setError(err instanceof Error ? err.message : "Impossible de charger les bons de régie")
      } finally {
        setLoading(false)
      }
    }
    fetchBonsRegie()
  }, [])
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col">
      {/* En-tête du widget */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Derniers bons de régie
        </h2>
        <Link 
          href="/bons-regie" 
          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center whitespace-nowrap"
        >
          Voir tous
          <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
        </Link>
      </div>
      
      {/* Contenu principal scrollable et flexible */}
      <div className="overflow-y-auto flex-grow p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mt-4"></div>
          </div>
        ) : error ? (
          <div className="text-center text-red-500 dark:text-red-400 py-10">
            <ExclamationCircleIcon className="h-10 w-10 mx-auto mb-2 text-red-400" />
            <p>{error}</p>
          </div>
        ) : bonsRegie.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-3">Aucun bon de régie enregistré</p>
            <Link 
              href="/public/bon-regie" 
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Créer un bon de régie
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bonsRegie.map((bon) => (
              <div 
                key={bon.id} 
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <Link href={`/bons-regie/${bon.id}`} className="block">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {bon.description}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                    <span className="font-medium">{bon.nomChantier}</span> - {bon.client}
                  </p>
                  <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                    <span>Dates: {bon.dates}</span>
                    <span>
                      Signé le {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
            {/* Bouton "Nouveau bon de régie" en bas peut être utile même si la liste n'est pas vide */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                href="/public/bon-regie" 
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Nouveau bon de régie
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
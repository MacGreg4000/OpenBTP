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
    <div className="bg-gradient-to-br from-white via-blue-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      {/* En-tête moderne du widget */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 dark:from-blue-900/20 dark:to-indigo-900/20 border-b-2 border-blue-200/50 dark:border-blue-700/50 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <DocumentTextIcon className="h-4 w-4 text-white"/>
          </div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Derniers bons de régie
          </h2>
        </div>
        <Link 
          href="/bons-regie" 
          className="text-xs font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 whitespace-nowrap"
        >
          Voir tous
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
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
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          </div>
        ) : bonsRegie.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <DocumentTextIcon className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium">Aucun bon de régie enregistré</p>
            <Link 
              href="/public/bon-regie" 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105 transition-all duration-200"
            >
              Créer un bon de régie
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bonsRegie.map((bon) => (
              <div 
                key={bon.id} 
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all duration-200 group"
              >
                <Link href={`/bon-regie/${bon.id}`} className="block">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {bon.description}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 truncate">
                    <span className="font-bold">{bon.nomChantier}</span> • {bon.client}
                  </p>
                  <div className="mt-3 flex justify-between items-center text-xs">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium">
                      {bon.dates}
                    </span>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400 font-bold">
                      Signé le {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
            {/* Bouton "Nouveau bon de régie" moderne */}
            <div className="mt-6 pt-4 border-t-2 border-gray-200/50 dark:border-gray-700/50 text-center">
              <Link
                href="/public/bon-regie" 
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 hover:scale-105 transition-all duration-200"
              >
                + Nouveau bon de régie
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 
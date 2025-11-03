'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CalendarIcon,
  BuildingOffice2Icon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import GanttChart from '@/components/dashboard/GanttChart'

interface Chantier {
  id: string
  title: string
  start: string
  end: string | null
  client: string
  etat: string
  adresse?: string
  montant?: number
  dureeEnJours?: number
}

export default function Planning() {
  const [loading, setLoading] = useState(true)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChantiers()
  }, [])

  const fetchChantiers = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/planning/general')
      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des chantiers')
      }
      
      const data = await response.json()
      setChantiers(data)
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les chantiers. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  // Calculs des statistiques pour l'en-tête
  const stats = {
    total: chantiers.length,
    enCours: chantiers.filter(c => c.etat === 'En cours').length,
    enPreparation: chantiers.filter(c => c.etat === 'En préparation').length,
    termines: chantiers.filter(c => c.etat === 'Terminé').length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="animate-pulse">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
              <div className="p-6">
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          
          {/* En-tête avec design uniforme */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center min-w-0">
                  <CalendarIcon className="h-5 w-5 text-white mr-2 flex-shrink-0" />
                  <div>
                    <h1 className="text-xl font-bold text-white">
                      Planning des Chantiers
                    </h1>
                    <p className="mt-0.5 text-xs text-blue-100 hidden sm:block">
                      Vue chronologique et suivi de l&apos;avancement de vos projets de construction
                    </p>
                  </div>
                </div>

                {/* Statistiques compactes */}
                <div className="flex items-center gap-2 flex-1 justify-center">
                  <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                    <div className="flex items-center gap-1.5">
                      <BuildingOffice2Icon className="h-4 w-4 text-white flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-blue-100 truncate">Total</div>
                        <div className="text-sm font-semibold text-white truncate">{stats.total}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                    <div className="flex items-center gap-1.5">
                      <PlayIcon className="h-4 w-4 text-white flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-blue-100 truncate">En cours</div>
                        <div className="text-sm font-semibold text-white truncate">{stats.enCours}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                    <div className="flex items-center gap-1.5">
                      <ClockIcon className="h-4 w-4 text-white flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-blue-100 truncate">Préparation</div>
                        <div className="text-sm font-semibold text-white truncate">{stats.enPreparation}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                    <div className="flex items-center gap-1.5">
                      <CheckCircleIcon className="h-4 w-4 text-white flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-medium text-blue-100 truncate">Terminés</div>
                        <div className="text-sm font-semibold text-white truncate">{stats.termines}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {/* Espace pour d'éventuels boutons d'action */}
                </div>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6">
            {/* Affichage des erreurs */}
            {error && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Message si aucun chantier */}
            {!loading && chantiers.length === 0 && !error && (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucun chantier à afficher
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Créez votre premier chantier pour voir le planning.
                </p>
                <Link
                  href="/chantiers/nouveau"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Créer un chantier
                </Link>
              </div>
            )}

            {/* Composant GanttChart */}
            {!loading && chantiers.length > 0 && (
              <GanttChart chantiers={chantiers} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
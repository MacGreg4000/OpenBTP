'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { 
  CalendarIcon,
  BuildingOffice2Icon,
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import GanttChartV2 from '@/components/dashboard/GanttChartV2'

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

export default function PlanningV2() {
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
              <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
              <div className="p-6">
                <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <BuildingOffice2Icon className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <PlayIcon className="h-4 w-4 text-blue-500" />
          <div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">En cours</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.enCours}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <ClockIcon className="h-4 w-4 text-amber-500" />
          <div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Préparation</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.enPreparation}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
          <div>
            <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Terminés</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{stats.termines}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Planning des Chantiers V2"
        subtitle="Vue optimisée et épurée du planning"
        icon={CalendarIcon}
        badgeColor="from-blue-500 to-indigo-600"
        stats={statsCards}
        actions={
          <Link
            href="/planning"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Version classique
          </Link>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
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
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucun chantier à afficher
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Créez votre premier chantier pour voir le planning.
                </p>
                <Link
                  href="/chantiers/nouveau"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Créer un chantier
                </Link>
              </div>
            )}

            {/* Composant GanttChartV2 */}
            {!loading && chantiers.length > 0 && (
              <GanttChartV2 chantiers={chantiers} loading={loading} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

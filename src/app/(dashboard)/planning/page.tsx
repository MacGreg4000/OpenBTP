'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CalendarIcon, 
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          
          {/* En-tête avec design moderne inspiré de la page commande */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-8 overflow-hidden">
            {/* Motif de fond sophistiqué */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-700/20"></div>
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-4 left-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="absolute bottom-4 right-4 w-24 h-24 bg-indigo-300/20 rounded-full blur-lg"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center mb-4">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <CalendarIcon className="w-6 h-6 mr-3 text-white" />
                  <span className="font-bold text-xl">
                    Planning des Chantiers
                  </span>
                </div>
              </div>
              
              {/* Statistiques redesignées */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white/40 backdrop-blur-sm rounded-lg p-3 border border-white/60 shadow-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-white/50 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.total}</div>
                      <div className="text-xs text-white uppercase tracking-wide">Total</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-emerald-500/50 backdrop-blur-sm rounded-lg p-3 border border-emerald-300/70 shadow-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-emerald-500/60 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.enCours}</div>
                      <div className="text-xs text-white uppercase tracking-wide">En cours</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-500/50 backdrop-blur-sm rounded-lg p-3 border border-yellow-300/70 shadow-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-yellow-500/60 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.enPreparation}</div>
                      <div className="text-xs text-white uppercase tracking-wide">En préparation</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-500/50 backdrop-blur-sm rounded-lg p-3 border border-green-300/70 shadow-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-500/60 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-white">{stats.termines}</div>
                      <div className="text-xs text-white uppercase tracking-wide">Terminés</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-white/80 text-sm max-w-2xl">
                  Vue chronologique et suivi de l&apos;avancement de vos projets de construction
                </p>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-6">
            {/* Légende des couleurs */}
            <div className="mb-6 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Légende des états :
              </h3>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2 shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">En préparation</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2 shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">En cours</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2 shadow-sm"></div>
                  <span className="text-gray-600 dark:text-gray-400 font-medium">Terminé</span>
                </div>
                <div className="flex items-center ml-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Survolez les barres pour plus de détails
                  </span>
                </div>
              </div>
            </div>
            
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
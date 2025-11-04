'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { ChartBarIcon, EyeIcon } from '@heroicons/react/24/outline'

interface Metre {
  id: string
  statut: string
  createdAt: string
  chantier: {
    chantierId: string
    nomChantier: string
  }
  soustraitant: {
    id: string
    nom: string
  }
  commentaire?: string | null
}

export default function MetresPage() {
  const [metres, setMetres] = useState<Metre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')

  useEffect(() => {
    loadMetres()
  }, [])

  const loadMetres = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/metres')
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des métrés')
      }
      const data = await response.json()
      setMetres(Array.isArray(data?.data) ? data.data : [])
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les métrés')
      setMetres([])
    } finally {
      setLoading(false)
    }
  }

  const filteredMetres = filterStatut === 'TOUS' 
    ? metres 
    : metres.filter(m => m.statut === filterStatut)

  const stats = {
    total: metres.length,
    soumis: metres.filter(m => m.statut === 'SOUMIS').length,
    valides: metres.filter(m => m.statut === 'VALIDE').length,
    partiellementValides: metres.filter(m => m.statut === 'PARTIELLEMENT_VALIDE').length,
    rejetes: metres.filter(m => m.statut === 'REJETE').length,
  }

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Total */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Total</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.total}</div>
          </div>
        </div>
      </div>

      {/* Soumis */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Soumis</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.soumis}</div>
          </div>
        </div>
      </div>

      {/* Validés */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <ChartBarIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Validés</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{stats.valides}</div>
          </div>
        </div>
      </div>
    </div>
  )

  const getStatutBadgeClass = (statut: string) => {
    const classes = {
      'SOUMIS': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      'PARTIELLEMENT_VALIDE': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      'VALIDE': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
      'REJETE': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
      'BROUILLON': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600',
    }
    return classes[statut as keyof typeof classes] || classes['BROUILLON']
  }

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'SOUMIS': 'Soumis',
      'PARTIELLEMENT_VALIDE': 'Partiellement validé',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'BROUILLON': 'Brouillon',
    }
    return labels[statut] || statut
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Métrés soumis"
        subtitle="Gestion et validation des métrés soumis par les sous-traitants"
        icon={ChartBarIcon}
        badgeColor="from-purple-600 via-indigo-600 to-blue-700"
        gradientColor="from-purple-600/10 via-indigo-600/10 to-blue-700/10"
        stats={statsCards}
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Filtres */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filtrer par statut :
              </label>
              <select
                value={filterStatut}
                onChange={(e) => setFilterStatut(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="TOUS">Tous</option>
                <option value="SOUMIS">Soumis</option>
                <option value="PARTIELLEMENT_VALIDE">Partiellement validés</option>
                <option value="VALIDE">Validés</option>
                <option value="REJETE">Rejetés</option>
                <option value="BROUILLON">Brouillons</option>
              </select>
              <button
                onClick={loadMetres}
                className="ml-auto px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Actualiser
              </button>
            </div>
          </div>

          {/* Liste des métrés */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Chargement des métrés...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : filteredMetres.length === 0 ? (
              <div className="p-12 text-center">
                <ChartBarIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Aucun métré trouvé
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {filterStatut === 'TOUS' 
                    ? 'Aucun métré n\'a encore été soumis.'
                    : `Aucun métré avec le statut "${getStatutLabel(filterStatut)}".`}
                </p>
              </div>
            ) : (
              filteredMetres.map((metre) => (
                <div
                  key={metre.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {metre.chantier.nomChantier}
                          </h3>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Sous-traitant :</span>
                              {metre.soustraitant.nom}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Date :</span>
                              {new Date(metre.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {metre.commentaire && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {metre.commentaire}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getStatutBadgeClass(metre.statut)}`}>
                          {getStatutLabel(metre.statut)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex gap-2">
                      <Link
                        href={`/metres/${metre.id}`}
                        className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        Consulter
                      </Link>
                      <Link
                        href={`/chantiers/${metre.chantier.chantierId}`}
                        className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm text-sm font-medium"
                      >
                        Chantier
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


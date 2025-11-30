'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type MetreItem = {
  id: string
  statut: 'SOUMIS'|'PARTIELLEMENT_VALIDE'|'VALIDE'|'BROUILLON'|'REJETE'
  createdAt: string
  chantier: { chantierId: string; nomChantier: string }
  soustraitant: { id: string; nom: string }
}

export default function MetresEnAttenteWidget() {
  const [items, setItems] = useState<MetreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch('/api/metres', { cache: 'no-store' })
        if (!res.ok) throw new Error('http')
        const json = await res.json()
        setItems(Array.isArray(json?.data) ? json.data : [])
      } catch {
        setError('Impossible de charger les métrés')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  return (
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      {/* En-tête moderne du widget */}
      <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-900/20 dark:to-indigo-900/20 border-b-2 border-purple-200/50 dark:border-purple-700/50 flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">Métrés en attente</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Métrés soumis par les sous-traitants</p>
        </div>
      </div>

      {/* Contenu principal scrollable */}
      <div className="overflow-y-auto flex-grow p-6">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg"/>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3"/>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl border-2 border-red-200 dark:border-red-700">
          <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700 dark:text-red-400 font-semibold">{error}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucun métré soumis</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Tous les métrés sont à jour</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.slice(0,5).map((m) => {
            const statusColors = {
              'SOUMIS': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
              'PARTIELLEMENT_VALIDE': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
              'VALIDE': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
              'BROUILLON': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
              'REJETE': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }
            return (
              <Link 
                key={m.id} 
                href={`/metres/${m.id}`} 
                className="block border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex justify-between items-start">
                  <div className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {m.chantier.nomChantier}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    ST: <span className="font-bold">{m.soustraitant.nom}</span>
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold ${statusColors[m.statut] || statusColors.BROUILLON}`}>
                    {m.statut}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}



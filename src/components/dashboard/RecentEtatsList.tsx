'use client'

import { useEffect, useState } from 'react'
import { ArrowTopRightOnSquareIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface EtatItem {
  id: string
  titre: string
  date: string
  montant: number
  chantier?: string
  chantierId?: string | null
  etatId?: number
}

const formatCurrency = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

export default function RecentEtatsList() {
  const [items, setItems] = useState<EtatItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard/etats-recents', { cache: 'no-store' })
        if (!res.ok) throw new Error('Erreur API')
        const data = await res.json()
        setItems(Array.isArray(data) ? data : [])
      } catch {
        setError("Impossible de charger les états récents")
      } finally {
        setLoading(false)
      }
    }
    fetchRecent()
  }, [])

  return (
    <div className="bg-gradient-to-br from-white via-indigo-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 border-b-2 border-indigo-200/50 dark:border-indigo-700/50 flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900 dark:text-white">États d'avancement récents</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Derniers éléments enregistrés</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-5/6" />
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="flex items-center gap-2 p-4 bg-red-100 dark:bg-red-900/30 rounded-xl border-2 border-red-200 dark:border-red-700">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-red-700 dark:text-red-400 font-semibold">{error}</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucun état récent</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Les nouveaux états apparaîtront ici</p>
          </div>
        ) : (
          <ul className="divide-y-2 divide-gray-200/50 dark:divide-gray-700/50">
            {items.map((it) => (
              <li key={it.id} className="p-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/10 dark:hover:to-purple-900/10 transition-all duration-200 group">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {it.titre}
                      </span>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {new Date(it.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">
                      🏗️ {it.chantier || 'Chantier'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg text-sm font-black text-indigo-700 dark:text-indigo-400 flex items-center gap-1 whitespace-nowrap">
                      <CurrencyEuroIcon className="h-4 w-4" /> {formatCurrency(it.montant)}
                    </span>
                    <Link 
                      href={it.chantierId && it.etatId ? `/chantiers/${it.chantierId}/etats/${it.etatId}` : '#'} 
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 hover:scale-110 transition-all duration-200"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}


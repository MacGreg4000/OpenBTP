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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">États d'avancement récents</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Derniers éléments enregistrés</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
          </div>
        ) : error ? (
          <div className="p-6 text-red-500 dark:text-red-400 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-gray-500 dark:text-gray-400 text-sm">Aucun état récent</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((it) => (
              <li key={it.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{it.titre}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{new Date(it.date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {it.chantier || 'Chantier'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center">
                      <CurrencyEuroIcon className="h-4 w-4 mr-1" /> {formatCurrency(it.montant)}
                    </span>
                    <Link href={it.chantierId && it.etatId ? `/chantiers/${it.chantierId}/etats/${it.etatId}` : '#'} className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                      <ArrowTopRightOnSquareIcon className="h-5 w-5" />
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


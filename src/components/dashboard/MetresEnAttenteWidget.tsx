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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Métrés en attente</h2>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"/>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"/>
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600 dark:text-gray-400">Aucun métré soumis</div>
      ) : (
        <div className="space-y-3">
          {items.slice(0,5).map((m) => (
            <Link key={m.id} href={`/chantiers/${m.chantier.chantierId}`} className="block border border-gray-200 dark:border-gray-700 rounded p-3 hover:bg-gray-50 dark:hover:bg-gray-700/40">
              <div className="flex justify-between text-sm">
                <div className="font-medium text-gray-900 dark:text-white">{m.chantier.nomChantier}</div>
                <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Sous-traitant: {m.soustraitant.nom} · Statut: {m.statut}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}



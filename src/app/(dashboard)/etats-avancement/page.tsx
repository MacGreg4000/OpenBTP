'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'

interface EtatRow {
  id: number
  chantierId: string | null
  nomChantier: string
  client: string | null
  numero: number
  mois: string | null
  date: string | null
  estFinalise: boolean
  montantBase: number
  montantAvenants: number
  montantTotal: number
  factureNumero: string | null
}

const formatEuro = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
const formatDate = (s: string | null) => (s ? new Date(s).toLocaleDateString('fr-FR') : '-')

export default function EtatsAvancementStatsPage() {
  const [rows, setRows] = useState<EtatRow[]>([])
  const [moisOptions, setMoisOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mois, setMois] = useState('')
  const [chantierId, setChantierId] = useState('')
  const [client, setClient] = useState('')
  const [statut, setStatut] = useState('')
  const [facture, setFacture] = useState('')
  const [search, setSearch] = useState('')
  const [editingFactureId, setEditingFactureId] = useState<number | null>(null)
  const [editingFactureValue, setEditingFactureValue] = useState('')
  const [savingFacture, setSavingFacture] = useState(false)

  const fetchMois = useCallback(async () => {
    try {
      const res = await fetch('/api/etats-avancement/mois', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setMoisOptions(Array.isArray(data) ? data : [])
      }
    } catch {
      // ignore
    }
  }, [])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (mois) params.set('mois', mois)
      if (chantierId.trim()) params.set('chantierId', chantierId.trim())
      if (client.trim()) params.set('client', client.trim())
      if (statut) params.set('statut', statut)
      if (facture) params.set('facture', facture)
      if (search.trim()) params.set('search', search.trim())
      const res = await fetch(`/api/etats-avancement/stats?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Erreur chargement')
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [mois, chantierId, client, statut, facture, search])

  useEffect(() => {
    fetchMois()
  }, [fetchMois])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSaveFacture = async (id: number) => {
    setSavingFacture(true)
    try {
      const res = await fetch(`/api/etats-avancement/${id}/facture`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factureNumero: editingFactureValue.trim() || null })
      })
      if (!res.ok) throw new Error('Erreur sauvegarde')
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, factureNumero: editingFactureValue.trim() || null } : r))
      )
      setEditingFactureId(null)
      setEditingFactureValue('')
    } catch {
      setError('Erreur lors de l\'enregistrement du n° de facture')
    } finally {
      setSavingFacture(false)
    }
  }

  const startEditFacture = (row: EtatRow) => {
    setEditingFactureId(row.id)
    setEditingFactureValue(row.factureNumero ?? '')
  }

  const cancelEditFacture = () => {
    setEditingFactureId(null)
    setEditingFactureValue('')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        icon={ChartBarIcon}
        title="Statistiques des états d'avancement"
        subtitle="Tableau complet avec filtres et numéro de facture"
      />
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
        </div>

        {/* Filtres */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtres</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Période (mois)</label>
              <select
                value={mois}
                onChange={(e) => setMois(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Tous les mois</option>
                {moisOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Réf. chantier</label>
              <input
                type="text"
                value={chantierId}
                onChange={(e) => setChantierId(e.target.value)}
                placeholder="ex. CH-001"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Client</label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nom client"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</label>
              <select
                value={statut}
                onChange={(e) => setStatut(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Tous</option>
                <option value="finalise">Finalisé</option>
                <option value="brouillon">Brouillon</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Facturé</label>
              <select
                value={facture}
                onChange={(e) => setFacture(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Tous</option>
                <option value="oui">Oui</option>
                <option value="non">Non</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Recherche</label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Chantier, client, n° facture..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Chantier</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Réf.</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">N° état</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Client</th>
                    <th className="py-3 px-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Mt. base</th>
                    <th className="py-3 px-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Mt. avenants</th>
                    <th className="py-3 px-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Total période</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Période (mois)</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Date</th>
                    <th className="py-3 px-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Statut</th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">N° facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2 px-3 text-sm text-gray-900 dark:text-white">
                        {row.chantierId ? (
                          <Link href={`/chantiers/${row.chantierId}/etats/${row.numero}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                            {row.nomChantier}
                          </Link>
                        ) : (
                          row.nomChantier
                        )}
                      </td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{row.chantierId ?? '-'}</td>
                      <td className="py-2 px-3 text-sm font-medium text-gray-900 dark:text-white">{row.numero}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{row.client ?? '-'}</td>
                      <td className="py-2 px-3 text-sm text-right tabular-nums">{formatEuro(row.montantBase)}</td>
                      <td className="py-2 px-3 text-sm text-right tabular-nums">{formatEuro(row.montantAvenants)}</td>
                      <td className="py-2 px-3 text-sm text-right font-medium tabular-nums">{formatEuro(row.montantTotal)}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{row.mois ?? '-'}</td>
                      <td className="py-2 px-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(row.date)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${row.estFinalise ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                          {row.estFinalise ? 'Finalisé' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {editingFactureId === row.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editingFactureValue}
                              onChange={(e) => setEditingFactureValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveFacture(row.id)
                                if (e.key === 'Escape') cancelEditFacture()
                              }}
                              className="w-28 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm px-2 py-1"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveFacture(row.id)}
                              disabled={savingFacture}
                              className="p-1 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              title="Enregistrer"
                            >
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditFacture}
                              className="p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                              title="Annuler"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditFacture(row)}
                            className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {row.factureNumero ? (
                              <span>{row.factureNumero}</span>
                            ) : (
                              <span className="text-gray-400 italic">Non facturé</span>
                            )}
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && rows.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun état d&apos;avancement trouvé.</div>
          )}
        </div>
      </div>
    </div>
  )
}

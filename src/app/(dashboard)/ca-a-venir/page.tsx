'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import {
  CurrencyEuroIcon,
  BuildingOffice2Icon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

// ─── Types ──────────────────────────────────────────────────────────────────

interface LigneCA {
  id: string
  chantierId: string
  nomChantier: string
  clientNom: string
  statut: 'EN_PREPARATION' | 'EN_COURS'
  nbCommandes: number
  totalCommandes: number
  nbEtatsAvancement: number
  montantFacture: number
  caAvenir: number
}

interface Totaux {
  totalCommandes: number
  montantFacture: number
  caAvenir: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatEuros = (val: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)

const statutConfig: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  EN_PREPARATION: {
    label: 'En préparation',
    classes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-700/50',
    icon: <ClockIcon className="w-3 h-3" />
  },
  EN_COURS: {
    label: 'En cours',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-700/50',
    icon: <WrenchScrewdriverIcon className="w-3 h-3" />
  }
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function CaAVenirPage() {
  const [lignes, setLignes] = useState<LigneCA[]>([])
  const [totaux, setTotaux] = useState<Totaux | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tri, setTri] = useState<{ col: keyof LigneCA; dir: 'asc' | 'desc' }>({
    col: 'caAvenir',
    dir: 'desc'
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/dashboard/ca-a-venir')
        if (!res.ok) throw new Error('Erreur lors du chargement')
        const data = await res.json()
        setLignes(data.lignes)
        setTotaux(data.totaux)
      } catch {
        setError('Impossible de charger les données')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleTri = (col: keyof LigneCA) => {
    setTri(prev =>
      prev.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'desc' }
    )
  }

  const lignesTries = [...lignes].sort((a, b) => {
    const va = a[tri.col]
    const vb = b[tri.col]
    if (typeof va === 'number' && typeof vb === 'number') {
      return tri.dir === 'asc' ? va - vb : vb - va
    }
    return tri.dir === 'asc'
      ? String(va).localeCompare(String(vb), 'fr')
      : String(vb).localeCompare(String(va), 'fr')
  })

  const SortIcon = ({ col }: { col: keyof LigneCA }) => {
    if (tri.col !== col) return <span className="text-gray-300 dark:text-gray-600 ml-1">↕</span>
    return <span className="text-purple-600 dark:text-purple-400 ml-1">{tri.dir === 'asc' ? '↑' : '↓'}</span>
  }

  const ThSortable = ({ col, children, className = '' }: { col: keyof LigneCA; children: React.ReactNode; className?: string }) => (
    <th
      scope="col"
      onClick={() => handleTri(col)}
      className={`px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-purple-700 dark:hover:text-purple-400 transition-colors ${className}`}
    >
      {children}<SortIcon col={col} />
    </th>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Chiffre d'affaires à venir"
        subtitle="Détail par chantier actif — commandes confirmées moins montants déjà facturés"
        icon={CurrencyEuroIcon}
        badgeColor="from-purple-600 via-fuchsia-600 to-pink-700"
        gradientColor="from-purple-600/10 via-fuchsia-600/10 to-pink-700/10"
        leftAction={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-purple-700 dark:hover:text-purple-400 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Retour au dashboard
          </Link>
        }
      />

      {/* KPI récap */}
      {totaux && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total commandes */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-5">
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total commandes confirmées</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{formatEuros(totaux.totalCommandes)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Sur {lignes.length} chantier{lignes.length > 1 ? 's' : ''} actif{lignes.length > 1 ? 's' : ''}</p>
          </div>

          {/* Déjà facturé */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg p-5">
            <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Déjà facturé</p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{formatEuros(totaux.montantFacture)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">États d&apos;avancement finalisés</p>
          </div>

          {/* CA à venir */}
          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/20 rounded-2xl border-2 border-purple-200 dark:border-purple-700/50 shadow-xl p-5">
            <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">CA à venir</p>
            <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{formatEuros(totaux.caAvenir)}</p>
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-1">
              {totaux.totalCommandes > 0
                ? `${Math.round((totaux.caAvenir / totaux.totalCommandes) * 100)} % du total commandes restant`
                : 'Aucune commande'}
            </p>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">

        {/* En-tête tableau */}
        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-lg flex items-center justify-center shadow">
              <BuildingOffice2Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Détail par chantier</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cliquez sur un en-tête pour trier</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement des données…</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        ) : lignes.length === 0 ? (
          <div className="p-12 text-center">
            <CurrencyEuroIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun chantier actif avec des commandes confirmées</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10">
                <tr>
                  <ThSortable col="nomChantier" className="text-left pl-6">Chantier</ThSortable>
                  <ThSortable col="clientNom" className="text-left">Client</ThSortable>
                  <ThSortable col="statut" className="text-left">Statut</ThSortable>
                  <ThSortable col="totalCommandes" className="text-right">Commandes confirmées</ThSortable>
                  <ThSortable col="montantFacture" className="text-right">Déjà facturé</ThSortable>
                  <ThSortable col="caAvenir" className="text-right pr-6">CA à venir</ThSortable>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700/50">
                {lignesTries.map(ligne => {
                  const conf = statutConfig[ligne.statut] ?? statutConfig['EN_COURS']
                  const pctFacture = ligne.totalCommandes > 0
                    ? Math.round((ligne.montantFacture / ligne.totalCommandes) * 100)
                    : 0

                  return (
                    <tr key={ligne.id} className="hover:bg-purple-50/30 dark:hover:bg-purple-900/10 transition-colors group">

                      {/* Chantier */}
                      <td className="px-4 py-4 pl-6">
                        <div className="font-semibold text-sm text-gray-900 dark:text-white">{ligne.nomChantier}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ligne.chantierId}</div>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{ligne.clientNom}</span>
                      </td>

                      {/* Statut */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${conf.classes}`}>
                          {conf.icon}
                          {conf.label}
                        </span>
                      </td>

                      {/* Total commandes */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatEuros(ligne.totalCommandes)}</span>
                        {ligne.nbCommandes > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {ligne.nbCommandes} commande{ligne.nbCommandes > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>

                      {/* Déjà facturé */}
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{formatEuros(ligne.montantFacture)}</span>
                        {ligne.nbEtatsAvancement > 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {ligne.nbEtatsAvancement} état{ligne.nbEtatsAvancement > 1 ? 's' : ''}
                          </div>
                        )}
                        {/* Barre de progression */}
                        {ligne.totalCommandes > 0 && (
                          <div className="mt-1.5 w-24 ml-auto h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${Math.min(pctFacture, 100)}%` }}
                            />
                          </div>
                        )}
                      </td>

                      {/* CA à venir */}
                      <td className="px-4 py-4 pr-6 text-right">
                        <span className={`text-sm font-black ${ligne.caAvenir > 0 ? 'text-purple-700 dark:text-purple-300' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatEuros(ligne.caAvenir)}
                        </span>
                        {ligne.totalCommandes > 0 && ligne.caAvenir > 0 && (
                          <div className="text-xs text-purple-500 dark:text-purple-400 mt-0.5">
                            {100 - pctFacture} % restant
                          </div>
                        )}
                      </td>

                      {/* Lien chantier */}
                      <td className="px-2 py-4 text-center">
                        <Link
                          href={`/chantiers/${ligne.id}`}
                          title="Voir le chantier"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Ligne totaux */}
              {totaux && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 border-t-2 border-purple-200 dark:border-purple-700/50">
                    <td colSpan={3} className="px-4 py-4 pl-6">
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Total — {lignes.length} chantier{lignes.length > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-gray-900 dark:text-white">{formatEuros(totaux.totalCommandes)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-sm font-black text-blue-700 dark:text-blue-400">{formatEuros(totaux.montantFacture)}</span>
                    </td>
                    <td className="px-4 py-4 pr-6 text-right">
                      <span className="text-base font-black text-purple-700 dark:text-purple-300">{formatEuros(totaux.caAvenir)}</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

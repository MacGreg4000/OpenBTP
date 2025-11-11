'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { ArrowPathIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface EvolutionResponse {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
  }>
}

const formatCurrency = (value: number = 0) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(Math.round(value))

export default function ChantiersStatsChart() {
  const [chartData, setChartData] = useState<ChartData<'line'>>()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [totals, setTotals] = useState<{ total: number; lastMonth: number; trend: number }>({
    total: 0,
    lastMonth: 0,
    trend: 0
  })

  const fetchEvolution = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/dashboard/evolution', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des données')
      }

      const data: EvolutionResponse = await response.json()
      if (!Array.isArray(data.labels) || data.labels.length === 0) {
        throw new Error('Aucune donnée disponible')
      }

      const datasetCA =
        data.datasets?.find((dataset) =>
          dataset.label?.toLowerCase().includes("chiffre d'affaires")
        ) || data.datasets?.[0]

      if (!datasetCA) {
        throw new Error('Aucune donnée de montant disponible')
      }

      const amounts = (datasetCA.data || []).map((value) => {
        const numeric = Number(value ?? 0)
        return Number.isFinite(numeric) ? numeric : 0
      })

      const labels = data.labels
      setChartData({
        labels,
        datasets: [
          {
            label: "Montants validés",
            data: amounts,
            borderColor: 'rgba(249, 115, 22, 1)',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            pointBackgroundColor: 'rgba(249, 115, 22, 1)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            tension: 0.35,
            fill: true,
            borderWidth: 3
          }
        ]
      })

      const total = amounts.reduce((sum, value) => sum + value, 0)
      const lastMonth = amounts[amounts.length - 1] ?? 0
      const previousMonth = amounts.length > 1 ? amounts[amounts.length - 2] : 0

      let trend = 0
      if (previousMonth === 0) {
        trend = lastMonth > 0 ? 100 : 0
      } else {
        trend = ((lastMonth - previousMonth) / Math.abs(previousMonth)) * 100
      }

      setTotals({
        total,
        lastMonth,
        trend: Number.isFinite(trend) ? trend : 0
      })
    } catch (err) {
      console.error("Erreur de chargement du graphique évolution EA:", err)
      setError("Impossible de charger les données d'évolution")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvolution()
  }, [fetchEvolution])

  const lineOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          borderColor: 'rgba(249, 115, 22, 0.4)',
          borderWidth: 1,
          cornerRadius: 10,
          padding: 12,
          callbacks: {
            title: (items) => items[0]?.label ?? '',
            label: (ctx: TooltipItem<'line'>) => {
              const value = Number(ctx.raw ?? 0)
              return `${ctx.dataset.label}: ${formatCurrency(value)}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(148, 163, 184, 0.15)'
          },
          ticks: {
            color: 'rgba(100, 116, 139, 0.75)',
            font: {
              size: 11
            },
            callback: (value) => {
              const numeric = typeof value === 'string' ? parseFloat(value) : (value as number)
              return formatCurrency(numeric)
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(100, 116, 139, 0.75)',
            font: {
              size: 11
            }
          }
        }
      }
    }),
    []
  )

  const trendText =
    totals.trend > 0
      ? `+${totals.trend.toFixed(1)}%`
      : totals.trend < 0
      ? `${totals.trend.toFixed(1)}%`
      : '0%'

  const trendColor =
    totals.trend > 0
      ? 'text-emerald-500'
      : totals.trend < 0
      ? 'text-rose-500'
      : 'text-gray-500'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200/70 dark:border-gray-700/70 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <ChartBarIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Évolution des états d'avancement
            </h3>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
            Montants validés sur les 12 derniers mois
          </p>
        </div>
        <button
          type="button"
          onClick={fetchEvolution}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500/10 to-amber-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:from-orange-500/20 hover:to-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-gray-100 dark:border-gray-700/60 text-sm">
        <div className="bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/20 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-orange-600 dark:text-orange-300 uppercase tracking-wide flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-4 w-4" />
            Total 12 mois
          </div>
          <div className="text-lg font-black text-gray-900 dark:text-white mt-2">
            {formatCurrency(totals.total)}
          </div>
        </div>
        <div className="bg-slate-100/80 dark:bg-slate-700/40 border border-slate-200/50 dark:border-slate-600/60 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
            Dernier mois
          </div>
          <div className="text-lg font-bold text-gray-900 dark:text-white mt-2">
            {formatCurrency(totals.lastMonth)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
            Variation mensuelle
          </div>
          <div className={`text-lg font-bold mt-2 ${trendColor}`}>{trendText}</div>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <div className="h-full">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-orange-200/80 dark:border-orange-500/30 border-t-orange-500 animate-spin"></div>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400 gap-2">
              <ChartBarIcon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p>{error}</p>
              <button
                onClick={fetchEvolution}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md hover:shadow-lg transition-all"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Réessayer
              </button>
            </div>
          ) : chartData ? (
            <Line data={chartData} options={lineOptions} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-sm text-gray-500 dark:text-gray-400 gap-2">
              <ChartBarIcon className="h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p>Aucune donnée disponible pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

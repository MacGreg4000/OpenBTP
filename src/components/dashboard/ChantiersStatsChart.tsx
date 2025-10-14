'use client'

import { useState, useEffect } from 'react'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js'
//
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
} from 'chart.js'
import { EyeIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

// Enregistrement des composants Chart.js nécessaires
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title)

interface ChantiersByCategoryProps {
  data: {
    enPreparation: number;
    enCours: number;
    termines: number;
  } | null;
  loading?: boolean;
}

export default function ChantiersStatsChart({ 
  data, 
  loading = false 
}: ChantiersByCategoryProps) {
  const [chartData, setChartData] = useState<
    ChartData<'doughnut', number[], string> | ChartData<'bar', number[], string> | ChartData<'line', number[], string> | null
  >(null)
  const [viewMode, setViewMode] = useState<'doughnut' | 'bar' | 'line'>('doughnut')
  const [animationDuration, setAnimationDuration] = useState(1000)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)

  useEffect(() => {
    if (data) {
      const colors = {
        enPreparation: {
          bg: 'rgba(251, 191, 36, 0.8)', // Yellow
          border: 'rgba(251, 191, 36, 1)',
          hover: 'rgba(251, 191, 36, 0.9)'
        },
        enCours: {
          bg: 'rgba(59, 130, 246, 0.8)', // Blue
          border: 'rgba(59, 130, 246, 1)',
          hover: 'rgba(59, 130, 246, 0.9)'
        },
        termines: {
          bg: 'rgba(34, 197, 94, 0.8)', // Green
          border: 'rgba(34, 197, 94, 1)',
          hover: 'rgba(34, 197, 94, 0.9)'
        }
      }

      // Génération de données temporelles sur 6 mois
      const now = new Date()
      const months = []
      const evolutionData = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }))
        
        // Simulation d'évolution temporelle basée sur les données actuelles
        const factor = 0.7 + (Math.random() * 0.6) // Entre 70% et 130% des données actuelles
        const totalActuel = data.enPreparation + data.enCours + data.termines
        evolutionData.push(Math.round(totalActuel * factor))
      }

      const commonLabels = viewMode === 'line' ? months : ['En préparation', 'En cours', 'Terminés']
      const datasetsForView: (
        | ChartData<'line', number[], string>['datasets']
        | ChartData<'doughnut', number[], string>['datasets']
        | ChartData<'bar', number[], string>['datasets']
      ) = (viewMode === 'line'
        ? [
            {
              label: 'Évolution des chantiers',
              data: evolutionData,
              borderColor: 'rgba(59, 130, 246, 1)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgba(59, 130, 246, 1)',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 6,
              pointHoverRadius: 8,
            },
          ]
        : [
            {
              data: [data.enPreparation, data.enCours, data.termines],
              backgroundColor: [
                colors.enPreparation.bg,
                colors.enCours.bg,
                colors.termines.bg,
              ],
              borderColor: [
                colors.enPreparation.border,
                colors.enCours.border,
                colors.termines.border,
              ],
              hoverBackgroundColor: [
                colors.enPreparation.hover,
                colors.enCours.hover,
                colors.termines.hover,
              ],
              borderWidth: 2,
              hoverBorderWidth: 3,
            },
          ]) as ChartData<'line', number[], string>['datasets']

      setChartData({
        labels: commonLabels,
        datasets: datasetsForView,
      })
    }
  }, [data, viewMode])

  const doughnutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) => {
            const label = ctx.label ?? ''
            const raw = ctx.raw as number | undefined
            const value = raw ?? 0
            const dataArr = (ctx.dataset?.data as number[]) || []
            const total = dataArr.reduce((a, b) => a + b, 0)
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0
            return [`${label}: ${value} chantiers`, `${percentage}% du total`]
          }
        }
      }
    },
    cutout: '60%',
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: animationDuration
    },
    interaction: {
      intersect: false,
      mode: 'nearest' as const
    }
  }

  const barOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) => {
            const value = (ctx.raw as number) || 0
            return `${value} chantiers`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          display: false
        }
      }
    },
    animation: {
      duration: animationDuration
    }
  }

  const lineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: {
            size: 12
          },
          usePointStyle: true,
          pointStyle: 'circle' as const
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(59, 130, 246, 0.8)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: (ctx: TooltipItem<'line'>) => {
            const value = (ctx.raw as number) || 0
            return `${value} chantiers`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.2)'
        }
      },
      x: {
        ticks: {
          color: 'rgba(156, 163, 175, 0.8)'
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      }
    },
    animation: {
      duration: animationDuration
    },
    interaction: {
      intersect: false,
      mode: 'index' as const
    }
  }

  const total = data ? data.enPreparation + data.enCours + data.termines : 0

  const getSegmentDetails = () => {
    if (!selectedSegment || !data) return null

    const details = {
      'En préparation': {
        count: data.enPreparation,
        description: 'Chantiers en phase de préparation',
        icon: '🏗️'
      },
      'En cours': {
        count: data.enCours,
        description: 'Chantiers actuellement en cours',
        icon: '⚡'
      },
      'Terminés': {
        count: data.termines,
        description: 'Chantiers terminés avec succès',
        icon: '✅'
      }
    }

    return details[selectedSegment as keyof typeof details]
  }

  const segmentDetails = getSegmentDetails()

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Répartition des chantiers
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setViewMode('doughnut')
                setAnimationDuration(800)
                setTimeout(() => setAnimationDuration(1000), 100)
              }}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'doughnut'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vue circulaire"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setViewMode('bar')
                setAnimationDuration(800)
                setTimeout(() => setAnimationDuration(1000), 100)
              }}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'bar'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Vue en barres"
            >
              <ChartBarIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setViewMode('line')
                setAnimationDuration(800)
                setTimeout(() => setAnimationDuration(1000), 100)
              }}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'line'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Évolution temporelle"
            >
              <ArrowTrendingUpIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Statistiques rapides */}
        <div className="mt-3 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Total: {total}</span>
          {total > 0 && (
            <>
              <span>•</span>
              <span>Actifs: {data ? data.enPreparation + data.enCours : 0}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex-grow flex items-center justify-center" style={{ minHeight: '150px' }}>
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-500 animate-spin"></div>
            </div>
          ) : !chartData || total === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <ChartBarIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun chantier à afficher</p>
            </div>
          ) : (
            <>
              {viewMode === 'doughnut' ? (
                <Doughnut data={chartData as ChartData<'doughnut', number[], string>} options={doughnutOptions} />
              ) : viewMode === 'bar' ? (
                <Bar data={chartData as ChartData<'bar', number[], string>} options={barOptions} />
              ) : (
                <Line data={chartData as ChartData<'line', number[], string>} options={lineOptions} />
              )}
            </>
          )}
        </div>

        {/* Détails du segment sélectionné */}
        {selectedSegment && segmentDetails && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{segmentDetails.icon}</span>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  {selectedSegment}: {segmentDetails.count}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {segmentDetails.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedSegment(null)}
              className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Fermer les détails
            </button>
          </div>
        )}

        {/* Instructions d'interaction */}
        {viewMode === 'doughnut' && total > 0 && !selectedSegment && (
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡 Cliquez sur un segment pour plus de détails
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 
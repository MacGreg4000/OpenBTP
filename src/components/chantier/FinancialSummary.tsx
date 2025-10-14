'use client'
import { useState, useEffect } from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import type { ChartData } from 'chart.js'
// import { Depense } from '@/types/depense'
// import { EtatAvancement } from '@/types/etat-avancement'
import { 
  calculateTotalRevenue, 
  calculateTotalSubcontractorCosts,
  calculateTotalExpenses,
  calculateNetResult,
  calculateMargin,
  groupExpensesByCategory,
  prepareDonutChartData,
  prepareLineChartData
} from '@/utils/financial-calculations'

// Enregistrer les composants Chart.js nécessaires
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement,
  Title
)

interface FinancialSummaryProps {
  chantierId: string
  etatId?: string
}

export default function FinancialSummary({ chantierId }: FinancialSummaryProps) {
  // type EtatRow = Record<string, unknown>;
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [financialData, setFinancialData] = useState({
    totalRevenue: 0,
    totalSubcontractorCosts: 0,
    totalExpenses: 0,
    netResult: 0,
    margin: 0
  })
  
  const [donutChartData, setDonutChartData] = useState<{ labels: string[]; datasets: Array<{ data: number[]; backgroundColor: string[]; borderWidth: number }> } | null>(null)
  const [lineChartData, setLineChartData] = useState<ChartData<'line'> | null>(null)
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Récupérer tous les états d'avancement du chantier
        const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`)
        if (!etatsResponse.ok) {
          throw new Error('Erreur lors de la récupération des états d\'avancement')
        }
        const etatsData = await etatsResponse.json()
        const setEtatsAvancement = (_v: unknown) => {}
        setEtatsAvancement(etatsData)
        
        // Récupérer les dépenses du chantier
        const depensesResponse = await fetch(`/api/chantiers/${chantierId}/depenses`)
        if (!depensesResponse.ok) {
          throw new Error('Erreur lors de la récupération des dépenses')
        }
        const depensesData = await depensesResponse.json()
        const setDepenses = (_v: unknown) => {}
        setDepenses(depensesData)
        
        // Pour l'instant, les états sous-traitants sont vides (fonctionnalité à venir)
        const setEtatsSoustraitants = (_v: unknown) => {}
        setEtatsSoustraitants([])
        
        // Calculer les données financières
        const totalRevenue = calculateTotalRevenue(etatsData)
        const totalSubcontractorCosts = calculateTotalSubcontractorCosts([])
        const totalExpenses = calculateTotalExpenses(depensesData)
        const netResult = calculateNetResult(totalRevenue, totalSubcontractorCosts, totalExpenses)
        const margin = calculateMargin(totalRevenue, netResult)
        
        setFinancialData({
          totalRevenue,
          totalSubcontractorCosts,
          totalExpenses,
          netResult,
          margin
        })
        
        // Préparer les données pour les graphiques
        const expensesByCategory = groupExpensesByCategory(depensesData)
        const donutData = prepareDonutChartData(expensesByCategory)
        setDonutChartData({
          labels: donutData.labels,
          datasets: [
            {
              data: donutData.data,
              backgroundColor: donutData.backgroundColor,
              borderWidth: 1
            }
          ]
        })
        
        const lineData = prepareLineChartData(etatsData, [], depensesData)
        setLineChartData({
          labels: lineData.labels,
          datasets: lineData.datasets.map((ds: { label?: string; data?: number[]; borderColor?: string; backgroundColor?: string; tension?: number; pointRadius?: number }) => ({
            label: ds.label ?? '',
            data: (ds.data ?? []) as number[],
            borderColor: ds.borderColor ?? 'rgba(59,130,246,0.8)',
            backgroundColor: ds.backgroundColor ?? 'rgba(59,130,246,0.2)',
            tension: ds.tension ?? 0.3,
            pointRadius: ds.pointRadius ?? 2
          }))
        })
        
        setError(null)
      } catch (err) {
        console.error('Erreur lors du chargement des données financières:', err)
        setError('Erreur lors du chargement des données financières')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [chantierId])
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Résumé Financier
        </h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
          Résumé Financier
        </h2>
        <div className="text-red-500 dark:text-red-400 p-4 text-center">
          {error}
        </div>
      </div>
    )
  }
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount)
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Résumé Financier
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Récapitulatif des montants */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
            Récapitulatif
          </h3>
          
          <div className="space-y-4">
             <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">États d&apos;avancement:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(financialData.totalRevenue)}
              </span>
            </div>
            
             <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">États sous-traitants:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                - {formatCurrency(financialData.totalSubcontractorCosts)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Dépenses directes:</span>
              <span className="font-medium text-red-600 dark:text-red-400">
                - {formatCurrency(financialData.totalExpenses)}
              </span>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-800 dark:text-gray-200 font-semibold">RÉSULTAT NET:</span>
                <span className={`font-bold text-lg ${
                  financialData.netResult >= 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrency(financialData.netResult)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">Marge:</span>
              <span className={`font-medium ${
                financialData.margin >= 20 
                  ? 'text-green-600 dark:text-green-400' 
                  : financialData.margin >= 10 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-red-600 dark:text-red-400'
              }`}>
                {financialData.margin.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Graphiques */}
        <div className="space-y-6">
          {/* Donut chart */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              Répartition des dépenses
            </h3>
            <div className="h-64 flex justify-center items-center">
              {donutChartData && donutChartData.datasets[0].data.length > 0 ? (
                <Doughnut 
                  data={donutChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right',
                        labels: {
                          color: 'rgb(156, 163, 175)'
                        }
                      }
                    }
                  }} 
                />
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center">
                  Aucune dépense enregistrée
                </div>
              )}
            </div>
          </div>
          
          {/* Line chart */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
              Évolution du résultat
            </h3>
            <div className="h-64 flex justify-center items-center">
              {lineChartData && lineChartData.labels.length > 0 ? (
                <Line 
                  data={lineChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: {
                          color: 'rgb(156, 163, 175)'
                        }
                      }
                    },
                    scales: {
                      y: {
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value as number);
                          },
                          color: 'rgb(156, 163, 175)'
                        }
                      },
                      x: {
                        ticks: {
                          color: 'rgb(156, 163, 175)'
                        }
                      }
                    }
                  }} 
                />
              ) : (
             <div className="text-gray-500 dark:text-gray-400 text-center">
               Données insuffisantes pour afficher l&apos;évolution
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
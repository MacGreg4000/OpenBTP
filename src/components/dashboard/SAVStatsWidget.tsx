'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { 
  StatutSAV, 
  PrioriteSAV,
  LABELS_STATUT_SAV,
  COULEURS_STATUT_SAV,
  COULEURS_PRIORITE_SAV
} from '@/types/sav'

interface SAVStats {
  total: number
  nouveaux: number
  enCours: number
  critiques: number
  resolus: number
  pourcentageResolution: number
  tempsResolutionMoyen: number // en jours
  ticketsRecents: Array<{ id: string; numTicket: string; titre: string; priorite: PrioriteSAV; statut: StatutSAV; chantier: string }>
}

export default function SAVStatsWidget() {
  const [stats, setStats] = useState<SAVStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSAVStats()
  }, [])

  const fetchSAVStats = async () => {
    try {
      setError(null)
      // Pour l'instant, simuler des données
      // Une fois l'API prête :
      // const response = await fetch('/api/dashboard/sav-stats')
      // const data = await response.json()
      
      // Données de test temporaires
      const mockStats: SAVStats = {
        total: 15,
        nouveaux: 3,
        enCours: 7,
        critiques: 2,
        resolus: 5,
        pourcentageResolution: 33.3,
        tempsResolutionMoyen: 4.5,
        ticketsRecents: [
          {
            id: '1',
            numTicket: 'SAV-2024-0015',
            titre: 'Fissures carrelage salon',
            priorite: PrioriteSAV.HAUTE,
            statut: StatutSAV.NOUVEAU,
            chantier: 'Villa Martin'
          },
          {
            id: '2', 
            numTicket: 'SAV-2024-0014',
            titre: 'Retouche peinture',
            priorite: PrioriteSAV.NORMALE,
            statut: StatutSAV.EN_COURS,
            chantier: 'Appartement Dupont'
          },
          {
            id: '3',
            numTicket: 'SAV-2024-0013', 
            titre: 'Problème plomberie',
            priorite: PrioriteSAV.CRITIQUE,
            statut: StatutSAV.ASSIGNE,
            chantier: 'Maison Dubois'
          }
        ]
      }
      
      setStats(mockStats)
      setLoading(false)
    } catch (error) {
      console.error('Erreur lors de la récupération des stats SAV:', error)
      setError('Erreur lors du chargement des statistiques SAV')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center text-red-600 dark:text-red-400">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* En-tête */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Après-Vente
          </h3>
          <Link href="/sav">
            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer" />
          </Link>
        </div>
      </div>

      {/* Statistiques principales */}
      <div className="p-6 space-y-6">
        {/* KPIs en grille */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg mx-auto mb-2">
              <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total tickets</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mx-auto mb-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.nouveaux}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Nouveaux</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg mx-auto mb-2">
              <ClockIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.enCours}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">En cours</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg mx-auto mb-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.critiques}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Critiques</p>
          </div>
        </div>

        {/* Métriques de performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux de résolution</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.pourcentageResolution.toFixed(1)}%
                </p>
              </div>
              <div className="flex items-center text-green-600 dark:text-green-400">
                <ArrowTrendingUpIcon className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Temps moyen</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats.tempsResolutionMoyen} j
                </p>
              </div>
              <div className="flex items-center text-blue-600 dark:text-blue-400">
                <ClockIcon className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Tickets récents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Tickets récents
            </h4>
            <Link href="/sav" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
              Voir tout
            </Link>
          </div>
          
          <div className="space-y-2">
            {stats.ticketsRecents.map((ticket) => (
              <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {ticket.titre}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      #{ticket.numTicket}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {ticket.chantier}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${COULEURS_STATUT_SAV[ticket.statut as StatutSAV]}`}>
                    {LABELS_STATUT_SAV[ticket.statut as StatutSAV]}
                  </span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${COULEURS_PRIORITE_SAV[ticket.priorite as PrioriteSAV]}`}>
                    {ticket.priorite === PrioriteSAV.CRITIQUE ? '🔥' : 
                     ticket.priorite === PrioriteSAV.HAUTE ? '⚠️' : 
                     ticket.priorite === PrioriteSAV.NORMALE ? '📝' : '📋'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div className="flex space-x-2">
          <Link href="/sav/nouveau" className="flex-1">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Nouveau ticket
            </button>
          </Link>
          <Link href="/sav" className="flex-1">
            <button className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors">
              Gérer SAV
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  PlusIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { 
  TicketSAV, 
  StatutSAV, 
  PrioriteSAV,
  TypeTicketSAV,
  LABELS_STATUT_SAV,
  LABELS_PRIORITE_SAV,
  LABELS_TYPE_TICKET_SAV,
  COULEURS_STATUT_SAV,
  COULEURS_PRIORITE_SAV
} from '@/types/sav'
import { Button } from '@/components/ui'

export default function ChantierSAVPage() {
  const params = useParams()
  const { data: session } = useSession()
  const chantierId = params.chantierId as string
  
  const [tickets, setTickets] = useState<TicketSAV[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchTicketsSAV = useCallback(async () => {
    try {
      setError(null)
      // Pour l'instant, simuler des données
      // Une fois l'API prête :
      // const response = await fetch(`/api/sav?chantierId=${chantierId}`)
      // const data = await response.json()
      
      // Données de test temporaires
      const mockTickets: TicketSAV[] = [
        {
          id: '1',
          numTicket: 'SAV-2024-0001',
          chantierId: chantierId,
          titre: 'Fissures dans le carrelage du salon',
          description: 'Plusieurs fissures sont apparues dans le carrelage du salon après 3 mois',
          type: TypeTicketSAV.DEFAUT_CONFORMITE,
          priorite: PrioriteSAV.HAUTE,
          statut: StatutSAV.NOUVEAU,
          localisation: 'Salon, zone centrale',
          dateDemande: '2024-01-15T10:00:00Z',
          dateInterventionSouhaitee: '2024-01-22T14:00:00Z',
          coutEstime: 500,
          createdBy: session?.user?.id || 'user1',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-15T10:00:00Z',
          chantier: {
            id: 'ch1',
            chantierId: chantierId,
            nomChantier: 'Rénovation Villa Martin',
            clientNom: 'M. Martin'
          }
        },
        {
          id: '2',
          numTicket: 'SAV-2024-0002',
          chantierId: chantierId,
          titre: 'Retouche peinture cuisine',
          description: 'Retouche nécessaire sur la peinture de la cuisine suite à des égratignures',
          type: TypeTicketSAV.RETOUCHE,
          priorite: PrioriteSAV.NORMALE,
          statut: StatutSAV.EN_COURS,
          localisation: 'Cuisine, mur sud',
          dateDemande: '2024-01-10T14:30:00Z',
          dateIntervention: '2024-01-18T09:00:00Z',
          coutEstime: 150,
          coutReel: 120,
          createdBy: session?.user?.id || 'user1',
          createdAt: '2024-01-10T14:30:00Z',
          updatedAt: '2024-01-18T09:00:00Z',
          chantier: {
            id: 'ch2',
            chantierId: chantierId,
            nomChantier: 'Rénovation Villa Martin',
            clientNom: 'M. Martin'
          }
        }
      ]
      
      setTickets(mockTickets)
      setLoading(false)
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets SAV:', error)
      setError('Erreur lors du chargement des tickets SAV')
      setLoading(false)
    }
  }, [chantierId, session])

  useEffect(() => {
    fetchTicketsSAV()
  }, [fetchTicketsSAV])
  
  // Calcul des statistiques pour ce chantier
  const stats = {
    total: tickets.length,
    nouveaux: tickets.filter(t => t.statut === StatutSAV.NOUVEAU).length,
    enCours: tickets.filter(t => [StatutSAV.EN_COURS, StatutSAV.PLANIFIE, StatutSAV.ASSIGNE].includes(t.statut)).length,
    resolus: tickets.filter(t => [StatutSAV.RESOLU, StatutSAV.CLOS].includes(t.statut)).length,
    critiques: tickets.filter(t => t.priorite === PrioriteSAV.CRITIQUE).length
  }
  
  if (loading) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Service Après-Vente
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Tickets SAV pour ce chantier
          </p>
        </div>
        
        <Link href={`/sav/nouveau?chantierId=${chantierId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <PlusIcon className="h-5 w-5 mr-2" />
            Nouveau ticket
          </Button>
        </Link>
      </div>
      
      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Nouveaux</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.nouveaux}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-orange-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">En cours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.enCours}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Résolus</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.resolus}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critiques</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.critiques}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Liste des tickets */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tickets SAV ({tickets.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {tickets.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                Aucun ticket SAV pour ce chantier
              </p>
              <Link href={`/sav/nouveau?chantierId=${chantierId}`}>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Créer le premier ticket
                </Button>
              </Link>
            </div>
          ) : (
            tickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {ticket.titre}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        #{ticket.numTicket}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-3">
                      {ticket.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>📍 {ticket.localisation}</span>
                      {ticket.coutEstime && (
                        <span>💰 {ticket.coutEstime}€ estimé</span>
                      )}
                      <span>📅 {new Date(ticket.dateDemande).toLocaleDateString('fr-FR')}</span>
                    </div>
                    
                    <div className="flex items-center space-x-3 mt-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COULEURS_STATUT_SAV[ticket.statut]}`}>
                        {LABELS_STATUT_SAV[ticket.statut]}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COULEURS_PRIORITE_SAV[ticket.priorite]}`}>
                        {LABELS_PRIORITE_SAV[ticket.priorite]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {LABELS_TYPE_TICKET_SAV[ticket.type]}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <Link href={`/sav/${ticket.id}`}>
                      <Button variant="secondary" size="sm">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 
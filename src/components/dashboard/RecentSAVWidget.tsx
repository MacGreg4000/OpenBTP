'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { 
  StatutSAV, 
  PrioriteSAV,
  LABELS_STATUT_SAV,
  COULEURS_STATUT_SAV,
  COULEURS_PRIORITE_SAV
} from '@/types/sav'

interface TicketSAV {
  id: string
  numTicket: string
  titre: string
  priorite: PrioriteSAV
  statut: StatutSAV
  dateDemande: string
  nomLibre?: string | null
  chantier?: {
    id: string
    chantierId: string
    nomChantier: string
    clientNom?: string
  } | null
}

export default function RecentSAVWidget() {
  const [tickets, setTickets] = useState<TicketSAV[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchRecentSAV()
  }, [])

  const fetchRecentSAV = async () => {
    try {
      setError(null)
      // Ne garder que les tickets à traiter (exclure résolus/clos/annulés)
      // Note: EN_PAUSE n'existe pas dans l'enum, on utilise les statuts disponibles
      const statutsActifs = [
        StatutSAV.NOUVEAU,
        StatutSAV.ASSIGNE,
        StatutSAV.EN_COURS,
        StatutSAV.EN_ATTENTE,
        StatutSAV.PLANIFIE,
        StatutSAV.EN_ATTENTE_PIECES,
        StatutSAV.EN_ATTENTE_VALIDATION
      ]
      
      // Essayer d'abord sans filtre de statut pour éviter les erreurs
      let response = await fetch(`/api/sav?pageSize=10&page=1`, {
        cache: 'no-store'
      })
      
      // Si ça échoue, essayer avec les statuts
      if (!response.ok) {
        response = await fetch(`/api/sav?pageSize=10&page=1&statut=${statutsActifs.join(',')}`, {
          cache: 'no-store'
        })
      }
      
      if (!response.ok) {
        // Essayer de récupérer le message d'erreur de l'API
        let errorMessage = 'Erreur lors de la récupération des tickets SAV'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.details || errorMessage
        } catch {
          // Si on ne peut pas parser le JSON, utiliser le message par défaut
        }
        console.error('Erreur API SAV:', errorMessage, response.status)
        // Ne pas bloquer le dashboard, juste afficher un message d'erreur discret
        setTickets([])
        setError('Impossible de charger les tickets SAV')
        setLoading(false)
        return
      }
      
      const data = await response.json()
      
      // L'API retourne { data: tickets[], meta: {...} }
      const ticketsList = Array.isArray(data) ? data : (data.data || [])
      
      if (!Array.isArray(ticketsList)) {
        console.warn('Format de réponse inattendu:', data)
        setTickets([])
        setLoading(false)
        return
      }
      
      // Filtre de sécurité côté client pour exclure les statuts clos/résolus/annulés
      const filtered = ticketsList.filter(
        (t) => t && ![StatutSAV.RESOLU, StatutSAV.CLOS, StatutSAV.ANNULE].includes(t.statut)
      )
      setTickets(filtered.slice(0, 10))
      setLoading(false)
    } catch (error) {
      console.error('Erreur lors de la récupération des tickets SAV:', error)
      // Ne pas bloquer le dashboard, juste afficher un message d'erreur discret
      setTickets([])
      setError('Impossible de charger les tickets SAV')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(date)
    } catch {
      return dateString
    }
  }

  return (
    <div className="bg-gradient-to-br from-white via-red-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      {/* Contenu principal scrollable et flexible */}
      <div className="overflow-y-auto flex-grow p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              </div>
            ))}
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto mt-4"></div>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <WrenchScrewdriverIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium">Aucun ticket SAV enregistré</p>
            <Link 
              href="/sav/nouveau" 
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 hover:scale-105 transition-all duration-200"
            >
              Créer un ticket SAV
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 dark:hover:from-red-900/20 dark:hover:to-orange-900/20 hover:border-red-300 dark:hover:border-red-600 hover:shadow-lg transition-all duration-200 group"
              >
                <Link href={`/sav/${ticket.id}`} className="block">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {ticket.numTicket}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COULEURS_PRIORITE_SAV[ticket.priorite]}`}>
                      {ticket.priorite === PrioriteSAV.CRITIQUE && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
                      {ticket.priorite}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${COULEURS_STATUT_SAV[ticket.statut]}`}>
                      {LABELS_STATUT_SAV[ticket.statut]}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                    {ticket.titre}
                  </h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Chantier:
                    </span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 truncate">
                      {ticket.chantier ? (
                        <>
                          {ticket.chantier.nomChantier}
                          {ticket.chantier.clientNom && (
                            <span className="text-gray-600 dark:text-gray-400 font-normal"> • {ticket.chantier.clientNom}</span>
                          )}
                        </>
                      ) : ticket.nomLibre ? (
                        ticket.nomLibre
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400 italic">SAV libre</span>
                      )}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {formatDate(ticket.dateDemande)}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
            {/* Bouton "Nouveau ticket SAV" moderne */}
            <div className="mt-6 pt-4 border-t-2 border-gray-200/50 dark:border-gray-700/50 text-center">
              <Link
                href="/sav/nouveau" 
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 hover:scale-105 transition-all duration-200"
              >
                + Nouveau ticket SAV
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


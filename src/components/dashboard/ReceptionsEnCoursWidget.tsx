'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon } from '@heroicons/react/24/outline'

interface ReceptionEnCours {
  id: string
  nomChantier: string
  client: string
  dateReceptionPrevue: string
  // Potentiellement d'autres champs comme 'statut' ou 'responsable'
}

export default function ReceptionsEnCoursWidget() {
  const [receptions, setReceptions] = useState<ReceptionEnCours[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReceptionsEnCours = async () => {
      try {
        setLoading(true)
        // Cet endpoint sera créé ensuite avec des données factices
        const response = await fetch('/api/dashboard/receptions-en-cours')
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des réceptions en cours')
        }
        
        const data = await response.json()
        setReceptions(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError("Impossible de charger les réceptions en cours")
      } finally {
        setLoading(false)
      }
    }

    fetchReceptionsEnCours()
  }, [])
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-2/3"></div>
        {[...Array(2)].map((_, i) => ( // Simule 2 éléments en chargement
          <div key={i} className="mb-4 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Réceptions en cours
        </h2>
        <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          {error}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Réceptions en cours
        </h2>
        {/* <Link 
          href="/receptions" // Lien à ajuster si vous avez une page dédiée
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center"
        >
          Voir toutes
          <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
        </Link> */}
      </div>
      
      {receptions.length === 0 ? (
        <div className="text-center py-6">
          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-gray-500 dark:text-gray-400">Aucune réception en cours</p>
          {/* Optionnel: Lien pour créer une réception
          <Link 
            href="/receptions/creer" // Lien à ajuster
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Planifier une réception
          </Link>
          */}
        </div>
      ) : (
        <div className="space-y-3">
          {receptions.map((reception) => (
            <div 
              key={reception.id} 
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
            >
              {/* Lien à ajuster vers la page de détail de la réception */}
              <Link href={`/receptions/${reception.id}`} className="block">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Chantier: {reception.nomChantier}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Client: {reception.client}
                </p>
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>Date prévue: {format(new Date(reception.dateReceptionPrevue), 'dd/MM/yyyy', { locale: fr })}</span>
                  {/* Vous pourriez ajouter d'autres infos ici, comme le statut si pertinent */}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
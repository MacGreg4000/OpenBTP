'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CalendarIcon } from '@heroicons/react/24/outline'

interface ReceptionEnCours {
  id: string
  chantierId: string
  nomChantier: string
  client: string
  dateReceptionPrevue: string
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
      <div className="bg-gradient-to-br from-white via-green-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 border-b-2 border-green-200/50 dark:border-green-700/50">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 animate-pulse"></div>
        </div>
        <div className="p-6 animate-pulse space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-gradient-to-br from-white via-red-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-red-200/50 dark:border-red-700/50 h-full flex flex-col overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 border-b-2 border-green-200/50 dark:border-green-700/50 flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
            <CalendarIcon className="h-4 w-4 text-white"/>
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              Réceptions en cours
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Planification des livraisons</p>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-xl border-2 border-red-200 dark:border-red-700 text-red-700 dark:text-red-400 font-semibold">
            {error}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-gradient-to-br from-white via-green-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      {/* En-tête moderne du widget */}
      <div className="px-6 py-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 dark:from-green-900/20 dark:to-emerald-900/20 border-b-2 border-green-200/50 dark:border-green-700/50 flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
          <CalendarIcon className="h-4 w-4 text-white"/>
        </div>
        <div>
          <h2 className="text-lg font-black text-gray-900 dark:text-white">
            Réceptions en cours
          </h2>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Planification des livraisons</p>
        </div>
      </div>
      
      {/* Contenu principal scrollable */}
      <div className="overflow-y-auto flex-grow p-6">
      {receptions.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarIcon className="h-10 w-10 text-green-500 dark:text-green-400" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucune réception en cours</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Aucune réception planifiée pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {receptions.map((reception) => (
            <div 
              key={reception.id} 
              className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20 hover:border-green-300 dark:hover:border-green-600 hover:shadow-lg transition-all duration-200 group"
            >
              <Link href={`/chantiers/${reception.chantierId}/reception/${reception.id}`} className="block">
                <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                  {reception.nomChantier}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium">
                  Client: <span className="font-bold">{reception.client}</span>
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-700 dark:text-green-400 text-xs font-bold">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {format(new Date(reception.dateReceptionPrevue), 'dd/MM/yyyy', { locale: fr })}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
} 
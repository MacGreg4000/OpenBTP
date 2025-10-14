'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardDocumentListIcon, PlusIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BonRegie {
  id: number
  dates: string
  client: string
  nomChantier: string
  description: string
  tempsChantier: number | null
  nombreTechniciens: number | null
  materiaux: string
  nomSignataire: string
  dateSignature: string
  createdAt: string
  chantierId: string | null
}

export default function BonsRegieSection({ chantierId }: { chantierId: string }) {
  const [bonsRegie, setBonsRegie] = useState<BonRegie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchBonsRegie = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/chantiers/${chantierId}/bons-regie`)
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des bons de régie')
        }
        
        const data = await response.json()
        setBonsRegie(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger les bons de régie')
      } finally {
        setLoading(false)
      }
    }
    
    fetchBonsRegie()
  }, [chantierId])
  
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" />
            Bons de régie
          </h2>
          <ArrowPathIcon className="h-5 w-5 text-gray-400 dark:text-gray-500 animate-spin" />
        </div>
        <div className="animate-pulse space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-md"></div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" />
            Bons de régie
          </h2>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 rounded-md">
          {error}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
          <ClipboardDocumentListIcon className="h-6 w-6 mr-2 text-blue-500 dark:text-blue-400" />
          Bons de régie
        </h2>
        <Link
          href="/public/bon-regie"
          className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
        >
          <PlusIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
          Créer
        </Link>
      </div>
      
      {bonsRegie.length === 0 ? (
        <div className="text-center py-8 px-4">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Aucun bon de régie associé à ce chantier
          </p>
          <Link
            href="/public/bon-regie"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Créer un bon de régie
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bonsRegie.map((bon) => (
            <div
              key={bon.id}
              className="border border-gray-200 dark:border-gray-700 rounded-md p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {bon.description}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{bon.dates}</span> - {bon.tempsChantier || 0}h × {bon.nombreTechniciens || 1} techniciens
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Signé par {bon.nomSignataire} le {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/bon-regie/${bon.id}`}
                    className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/20 px-3 py-1 text-sm font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    Détails
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 
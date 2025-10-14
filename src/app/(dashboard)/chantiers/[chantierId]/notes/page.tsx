'use client'
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { AdminTasksContent } from '@/components/chantier/AdminTasksContent'
import { NotesContent } from '@/components/chantier/NotesContent'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { type Chantier } from '@/types/chantier'

export default function NotesPage() {
  const router = useRouter()
  const params = useParams()
  const chantierId = (params?.chantierId as string) || null
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!chantierId) return;
    
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}`)
        if (response.ok) {
          const data = await response.json()
          setChantier(data)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du chantier:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchChantier()
  }, [chantierId])

  if (!chantierId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DocumentExpirationAlert />
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-8 overflow-hidden">
          {/* Motif de fond sophistiqué */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-700/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-4 left-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 right-4 w-24 h-24 bg-purple-300/20 rounded-full blur-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers/${chantierId}/etats`)}
                className="mr-4 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl border border-white/30 hover:border-white/50 hover:scale-105"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center mb-3">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <svg className="w-6 h-6 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span className="font-bold text-xl">📝 Notes et tâches administratives</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  {!loading && chantier && (
                    <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      🏗️ {chantier.nomChantier}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 bg-orange-500/80 backdrop-blur-sm rounded-full text-sm font-bold shadow-sm ring-2 ring-orange-300/50">
                    📋 Gestion administrative
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tâches administratives */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Tâches administratives</h2>
              </div>
              <AdminTasksContent chantierId={chantierId} />
            </div>

            {/* Notes et choix clients */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4 border-b pb-2 border-gray-200 dark:border-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notes et choix clients</h2>
              </div>
              <NotesContent chantierId={chantierId} debug={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
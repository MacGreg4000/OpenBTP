'use client'
import { useParams } from 'next/navigation'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { AdminTasksContent } from '@/components/chantier/AdminTasksContent'
import { NotesContent } from '@/components/chantier/NotesContent'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

export default function NotesPage() {
  const params = useParams()
  const chantierId = (params?.chantierId as string) || null

  if (!chantierId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <DocumentExpirationAlert />
      
      {/* Header léger style backdrop-blur */}
      <div className="mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Effet de fond subtil avec dégradé purple/pink (couleur de l'icône Notes) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/60 via-purple-700/60 to-pink-800/60 dark:from-purple-600/30 dark:via-purple-700/30 dark:to-pink-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <ClipboardDocumentListIcon className="w-6 h-6 mr-3 text-purple-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-purple-900 dark:text-white">
                    Notes et tâches administratives
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenu principal */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
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
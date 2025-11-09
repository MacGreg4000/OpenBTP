'use client'
import { useState, useEffect, use } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline'
import DocumentsContent from '@/components/chantier/DocumentsContent'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

export default function DocumentsPage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params);
  const [chantierId, setChantierId] = useState<string | null>(null)

  // Attendre les paramètres de route
  useEffect(() => {
    const initParams = async () => {
      const awaitedParams = await params;
      setChantierId(awaitedParams.chantierId);
    };
    
    initParams();
  }, [params]);

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
          {/* Effet de fond subtil avec dégradé vert (couleur de l'icône Documents) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/60 via-teal-700/60 to-cyan-800/60 dark:from-emerald-600/30 dark:via-teal-700/30 dark:to-cyan-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <DocumentDuplicateIcon className="w-6 h-6 mr-3 text-emerald-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-emerald-900 dark:text-white">
                    Documents du chantier
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
          <DocumentsContent chantierId={chantierId} />
        </div>
      </div>
    </div>
  )
} 
'use client'
import { useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function EditRapportPage(props: { params: Promise<{ chantierId: string; documentId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  
  // Rediriger vers la page de création en passant le documentId comme paramètre d'URL
  useEffect(() => {
    if (!params.chantierId || !params.documentId) return;
    
    router.push(`/chantiers/${params.chantierId}/rapports/nouveau?edit=${params.documentId}`);
  }, [params.chantierId, params.documentId, router]);

  // Afficher un chargement pendant la redirection
  return (
    <div className="container mx-auto py-10 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center">
          <Link
            href={`/chantiers/${params.chantierId}/rapports`}
            className="mr-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Chargement de l'éditeur de rapport...
          </h1>
        </div>
        
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
        
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
          Redirection vers l'éditeur de rapport en cours...
        </p>
      </div>
    </div>
  );
} 
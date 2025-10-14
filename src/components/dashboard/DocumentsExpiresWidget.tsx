import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import Link from 'next/link'
import { ExclamationCircleIcon, ClockIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

interface Document {
  id: string
  nom: string
  type: string
  dateExpiration: string
  isExpired: boolean
  expiresInDays: number | null
  Ouvrier: {
    id: string
    nom: string
    prenom: string
    sousTraitantId: string
  }
  soustraitant: {
    id: string
    nom: string
  }
}

export default function DocumentsExpiresWidget() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDocumentsExpires = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/dashboard/documents-expires')
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des documents')
        }
        
        const data = await response.json()
        setDocuments(data)
      } catch (err) {
        console.error('Erreur:', err)
        setError('Impossible de charger les documents expirés')
      } finally {
        setLoading(false)
      }
    }

    fetchDocumentsExpires()
  }, [])

  const getDocumentTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      carte_identite: "Carte d'identité",
      limosa: "Certificat Limosa",
      a1: "Attestation A1",
      livre_parts: "Livre des parts",
      attestation_onss: "Attestation ONSS",
      permis_travail: "Permis de travail",
      diplome: "Diplôme",
      certificat_medical: "Certificat médical",
      autre: "Autre document"
    }
    return types[type] || type
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Documents expirés</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Documents à surveiller</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Expirés ou expirant prochainement</p>
        </div>
        {documents.length > 0 && (
          <Link 
            href="/documents-expires"
            className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 flex items-center whitespace-nowrap"
          >
            Voir tous <ArrowTopRightOnSquareIcon className="h-4 w-4 ml-1" />
          </Link>
        )}
      </div>
      
      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500 dark:text-red-400">{error}</div>
        ) : documents.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <ExclamationCircleIcon className="h-10 w-10 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
            Aucun document expiré ou à surveiller.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Ouvrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {documents.slice(0, 5).map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {doc.isExpired ? (
                        <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                      ) : (
                        <ClockIcon className="h-5 w-5 text-yellow-500 mr-2" />
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {getDocumentTypeName(doc.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{doc.Ouvrier.prenom} {doc.Ouvrier.nom}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{doc.soustraitant?.nom || 'Sans sous-traitant'}</div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className={`text-sm ${doc.isExpired ? 'text-red-500' : 'text-yellow-500'}`}>
                      {format(new Date(doc.dateExpiration), 'dd/MM/yyyy', { locale: fr })}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.isExpired 
                        ? `Expiré depuis ${Math.abs(doc.expiresInDays || 0)} jours` 
                        : `Expire dans ${doc.expiresInDays} jours`}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/sous-traitants/${doc.Ouvrier.sousTraitantId}/ouvriers/${doc.Ouvrier.id}/documents`}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                    >
                      <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
} 
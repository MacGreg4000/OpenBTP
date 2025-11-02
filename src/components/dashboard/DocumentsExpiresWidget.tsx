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
      <div className="bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mb-2.5"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-full"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-white via-red-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-red-200/50 dark:border-red-700/50 p-6">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Documents expirés</h3>
        <div className="flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-white via-orange-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 h-full flex flex-col overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-900/20 dark:to-red-900/20 border-b-2 border-orange-200/50 dark:border-orange-700/50 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
            <ClockIcon className="h-4 w-4 text-white"/>
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Documents à surveiller</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Expirés ou expirant prochainement</p>
          </div>
        </div>
        {documents.length > 0 && (
          <Link 
            href="/documents-expires"
            className="text-xs font-bold text-orange-600 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-all duration-200 whitespace-nowrap"
          >
            Voir tous <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      
      <div className="overflow-y-auto flex-grow">
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">Chargement...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ExclamationCircleIcon className="h-10 w-10 text-red-500 dark:text-red-400" />
            </div>
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-10 w-10 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucun document expiré ou à surveiller</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Tous vos documents sont à jour !</p>
          </div>
        ) : (
          <table className="min-w-full divide-y-2 divide-gray-200/50 dark:divide-gray-700/50">
            <thead className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Ouvrier
                </th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Expiration
                </th>
                <th className="relative px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {documents.slice(0, 5).map((doc) => (
                <tr key={doc.id} className="hover:bg-gradient-to-r hover:from-orange-50/50 hover:to-red-50/50 dark:hover:from-orange-900/10 dark:hover:to-red-900/10 transition-all duration-200">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${doc.isExpired ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        {doc.isExpired ? (
                          <ExclamationCircleIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
                        ) : (
                          <ClockIcon className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
                        )}
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {getDocumentTypeName(doc.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{doc.Ouvrier.prenom} {doc.Ouvrier.nom}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mt-1">{doc.soustraitant?.nom || 'Sans sous-traitant'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-bold ${doc.isExpired ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'}`}>
                      {format(new Date(doc.dateExpiration), 'dd/MM/yyyy', { locale: fr })}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      {doc.isExpired 
                        ? `⚠️ Expiré depuis ${Math.abs(doc.expiresInDays || 0)} jours` 
                        : `⏰ Expire dans ${doc.expiresInDays} jours`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/sous-traitants/${doc.Ouvrier.sousTraitantId}/ouvriers/${doc.Ouvrier.id}/documents`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 hover:scale-110 transition-all duration-200"
                    >
                      <ArrowTopRightOnSquareIcon className="h-4 w-4" />
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
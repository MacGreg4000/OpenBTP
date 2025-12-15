'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PageHeader } from '@/components/PageHeader'
import { ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline'

interface DocumentExpire {
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

export default function DocumentsExpiresPage() {
  const { status } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<DocumentExpire[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status !== 'authenticated') return

    const fetchAllDocuments = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch('/api/dashboard/documents-expires', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des documents')
        }

        const data = await response.json()
        setDocuments(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erreur lors du chargement des documents expirés:', err)
        setError("Impossible de charger la liste des documents expirés")
      } finally {
        setLoading(false)
      }
    }

    fetchAllDocuments()
  }, [status, router])

  const getDocumentTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      carte_identite: "Carte d'identité",
      limosa: 'Certificat Limosa',
      a1: 'Attestation A1',
      livre_parts: 'Livre des parts',
      attestation_onss: 'Attestation ONSS',
      permis_travail: 'Permis de travail',
      diplome: 'Diplôme',
      certificat_medical: 'Attestation Sécurité',
      autre: 'Autre document',
    }
    return types[type] || type
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm font-medium">
            Chargement de la page…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-red-50/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Documents expirés"
        subtitle="Vue détaillée de tous les documents expirés ou proches de l'expiration"
        icon={ExclamationCircleIcon}
        badge="Conformité"
        badgeColor="from-orange-500 via-red-500 to-rose-600"
        gradientColor="from-orange-500/10 via-red-500/10 to-rose-600/10"
        leftAction={
          <button
            type="button"
            onClick={() => router.push('/')}
            className="inline-flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200 shadow-md hover:shadow-lg border border-gray-200/60 dark:border-gray-700/60 p-1.5 hover:-translate-x-0.5 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        }
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl shadow-xl border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 dark:from-orange-900/20 dark:to-red-900/20 border-b border-orange-200/60 dark:border-orange-700/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <ClockIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">
                  Suivi des documents
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {documents.length === 0
                    ? 'Aucun document expiré ou proche de l’échéance'
                    : `${documents.length} document${
                        documents.length > 1 ? 's' : ''
                      } à contrôler`}
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                Chargement des documents expirés…
              </p>
            </div>
          ) : error ? (
            <div className="p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <ExclamationCircleIcon className="h-9 w-9 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-red-600 dark:text-red-400 font-semibold mb-2">
                {error}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Merci de réessayer plus tard. Si le problème persiste, contactez
                l’administrateur.
              </p>
            </div>
          ) : documents.length === 0 ? (
            <div className="p-10 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <svg
                  className="h-12 w-12 text-green-500 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                Tous vos documents sont à jour
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                Aucun document n’est expiré ou proche de l’échéance. Vous êtes
                en conformité.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Document
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Ouvrier
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Sous-traitant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Expiration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Délai
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            doc.isExpired
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                          }`}
                        >
                          {doc.isExpired ? (
                            <>
                              <ExclamationCircleIcon className="h-4 w-4" />
                              Expiré
                            </>
                          ) : (
                            <>
                              <ClockIcon className="h-4 w-4" />
                              À surveiller
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {getDocumentTypeName(doc.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                        {doc.Ouvrier.prenom} {doc.Ouvrier.nom}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {doc.soustraitant?.nom || 'Sans sous-traitant'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {format(new Date(doc.dateExpiration), 'dd/MM/yyyy', {
                          locale: fr,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {doc.expiresInDays == null
                          ? '-'
                          : doc.isExpired
                          ? `Expiré depuis ${Math.abs(
                              doc.expiresInDays,
                            )} jour${Math.abs(doc.expiresInDays) > 1 ? 's' : ''}`
                          : `Dans ${doc.expiresInDays} jour${
                              (doc.expiresInDays || 0) > 1 ? 's' : ''
                            }`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Link
                          href={`/sous-traitants/${doc.Ouvrier.sousTraitantId}/ouvriers/${doc.Ouvrier.id}/documents`}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold shadow-sm transition-colors"
                        >
                          Ouvrir le dossier
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}



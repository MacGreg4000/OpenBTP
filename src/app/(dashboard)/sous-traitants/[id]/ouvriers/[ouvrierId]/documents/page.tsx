'use client'
import { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon,
  DocumentTextIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/PageHeader'
import SelectField from '@/components/ui/SelectField'

interface Document {
  id: string
  nom: string
  type: string
  url: string
  dateExpiration: string | null
  createdAt: string
}

interface Ouvrier {
  id: string
  nom: string
  prenom: string
  documentouvrier?: Document[]
  documents?: Document[]
  sousTraitant?: {
    id: string
    nom: string
  }
}

interface DeleteModalProps {
  isOpen: boolean
  document: Document | null
  onClose: () => void
  onConfirm: () => Promise<void>
  isDeleting: boolean
}

function DeleteModal({ isOpen, document, onClose, onConfirm, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Confirmer la suppression</h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Êtes-vous sûr de vouloir supprimer le document "{document?.nom}" ? 
          Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpload: (formData: FormData) => Promise<void>
  isUploading: boolean
}

function UploadModal({ isOpen, onClose, onUpload, isUploading }: UploadModalProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedType, setSelectedType] = useState('')
  const [dateExpiration, setDateExpiration] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    await onUpload(formData)
    formRef.current?.reset()
    setSelectedType('')
    setDateExpiration('')
  }

  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ajouter un document</h3>
        <form ref={formRef} onSubmit={handleSubmit} className="mt-4 space-y-4">
          <SelectField
            label="Type de document"
            id="type"
            name="type"
            required
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="mt-1"
          >
            <option value="">Sélectionner un type</option>
            <option value="carte_identite">Carte d'identité</option>
            <option value="limosa">Certificat Limosa</option>
            <option value="a1">Attestation A1</option>
            <option value="livre_parts">Livre des parts</option>
            <option value="attestation_onss">Attestation ONSS</option>
            <option value="permis_travail">Permis de travail</option>
            <option value="diplome">Diplôme</option>
            <option value="certificat_medical">Attestation Sécurité</option>
            <option value="autre">Autre document</option>
          </SelectField>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fichier *
            </label>
            <input
              type="file"
              id="file"
              name="file"
              required
              className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300
                dark:hover:file:bg-blue-800"
            />
          </div>

          <div>
            <label htmlFor="dateExpiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Date d'expiration
            </label>
            <input
              type="date"
              id="dateExpiration"
              name="dateExpiration"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50"
            >
              {isUploading ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DocumentsOuvrierPage(
  props: { 
    params: Promise<{ id: string, ouvrierId: string }> 
  }
) {
  const params = use(props.params);
  const router = useRouter()
  const { data: session } = useSession()
  const [ouvrier, setOuvrier] = useState<Ouvrier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadModal, setUploadModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    document: Document | null
  }>({
    isOpen: false,
    document: null
  })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (session) {
      loadOuvrier()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  const loadOuvrier = async () => {
    try {
      const response = await fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}?include=documents`)
      if (!response.ok) throw new Error('Erreur lors du chargement des données')
      const data = await response.json()
      setOuvrier(data)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (formData: FormData) => {
    setIsUploading(true)
    try {
      const response = await fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}/documents`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi du document')

      await loadOuvrier()
      setUploadModal(false)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de l\'envoi du document')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.document) return

    setIsDeleting(true)
    try {
      const response = await fetch(
        `/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}/documents/${deleteModal.document.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      await loadOuvrier()
      setDeleteModal({ isOpen: false, document: null })
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la suppression du document')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    </div>
  )
  if (!ouvrier) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Ouvrier non trouvé</div>
      </div>
    </div>
  )

  const getDocumentTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      carte_identite: "Carte d'identité",
      limosa: "Certificat Limosa",
      a1: "Attestation A1",
      livre_parts: "Livre des parts",
      attestation_onss: "Attestation ONSS",
      permis_travail: "Permis de travail",
      diplome: "Diplôme",
      certificat_medical: "Attestation Sécurité",
      autre: "Autre document"
    }
    return types[type] || type
  }

  const isDocumentExpired = (dateExpiration: string | null) => {
    if (!dateExpiration) return false
    return new Date(dateExpiration) < new Date()
  }

  const isDocumentNearExpiration = (dateExpiration: string | null) => {
    if (!dateExpiration) return false
    const expirationDate = new Date(dateExpiration)
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)
    return expirationDate <= oneMonthFromNow && expirationDate > new Date()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={`Documents de ${ouvrier.prenom} ${ouvrier.nom}`}
        icon={DocumentTextIcon}
        breadcrumbs={[
          { label: 'Sous-traitants', href: '/sous-traitants' },
          { label: ouvrier?.sousTraitant?.nom || '', href: `/sous-traitants/${params.id}/ouvriers` },
          { label: `${ouvrier?.prenom} ${ouvrier?.nom}` || '', href: `/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}` },
          { label: 'Documents' }
        ]}
        actions={[
          {
            label: 'Retour',
            icon: ArrowLeftIcon,
            onClick: () => router.push(`/sous-traitants/${params.id}/ouvriers`),
            variant: 'secondary' as const
          },
          {
            label: 'Nouveau document',
            icon: PlusIcon,
            onClick: () => setUploadModal(true),
            variant: 'primary' as const
          }
        ]}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date d'ajout</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Expiration</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {(ouvrier.documents || ouvrier.documentouvrier || []).map((document) => (
                    <tr key={document.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex items-center">
                          {(isDocumentExpired(document.dateExpiration) || isDocumentNearExpiration(document.dateExpiration)) && (
                            <ExclamationCircleIcon 
                              className={`h-5 w-5 mr-2 ${
                                isDocumentExpired(document.dateExpiration) 
                                  ? 'text-red-500 dark:text-red-400' 
                                  : 'text-yellow-500 dark:text-yellow-400'
                              }`}
                            />
                          )}
                          {getDocumentTypeName(document.type)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {format(new Date(document.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {document.dateExpiration 
                          ? format(new Date(document.dateExpiration), 'dd/MM/yyyy', { locale: fr })
                          : 'N/A'
                        }
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end gap-2">
                          <a
                            href={document.url}
                            download
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => setDeleteModal({ isOpen: true, document })}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      </div>

      <UploadModal
        isOpen={uploadModal}
        onClose={() => setUploadModal(false)}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        document={deleteModal.document}
        onClose={() => setDeleteModal({ isOpen: false, document: null })}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      </div>
    </div>
  )
} 
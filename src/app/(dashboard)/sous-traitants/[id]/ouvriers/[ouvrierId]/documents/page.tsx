'use client'
import { useState, useEffect, useRef, use } from 'react';
import { useSession } from 'next-auth/react'
import { 
  PlusIcon, 
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Breadcrumb } from '@/components/Breadcrumb'
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full">
        <h3 className="text-lg font-medium text-gray-900">Confirmer la suppression</h3>
        <p className="mt-2 text-sm text-gray-500">
          Êtes-vous sûr de vouloir supprimer le document "{document?.nom}" ? 
          Cette action est irréversible.
        </p>
        <div className="mt-4 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900">Ajouter un document</h3>
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
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Fichier *
            </label>
            <input
              type="file"
              id="file"
              name="file"
              required
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label htmlFor="dateExpiration" className="block text-sm font-medium text-gray-700">
              Date d'expiration
            </label>
            <input
              type="date"
              id="dateExpiration"
              name="dateExpiration"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="mt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
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
  // const router = useRouter()
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

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!ouvrier) return <div className="p-8">Ouvrier non trouvé</div>

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
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Sous-traitants', href: '/sous-traitants' },
          { label: ouvrier?.sousTraitant?.nom || '', href: `/sous-traitants/${params.id}/ouvriers` },
          { label: `${ouvrier?.prenom} ${ouvrier?.nom}` || '', href: `/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}` },
          { label: 'Documents' }
        ]}
      />

      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:tracking-tight">
            Documents de {ouvrier.prenom} {ouvrier.nom}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <button
            onClick={() => setUploadModal(true)}
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Nouveau document
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date d'ajout</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Expiration</th>
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(ouvrier.documents || ouvrier.documentouvrier || []).map((document) => (
                    <tr key={document.id}>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          {(isDocumentExpired(document.dateExpiration) || isDocumentNearExpiration(document.dateExpiration)) && (
                            <ExclamationCircleIcon 
                              className={`h-5 w-5 mr-2 ${
                                isDocumentExpired(document.dateExpiration) 
                                  ? 'text-red-500' 
                                  : 'text-yellow-500'
                              }`} 
                            />
                          )}
                          {getDocumentTypeName(document.type)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {format(new Date(document.createdAt), 'dd/MM/yyyy', { locale: fr })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
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
                            className="text-red-600 hover:text-red-900"
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
  )
} 
'use client'
import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation'
import { 
  PencilIcon, 
  QrCodeIcon,
  UserIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  PhotoIcon,
  CameraIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PretModal from '@/components/outillage/PretModal'
import RetourPretModal from '@/components/outillage/RetourPretModal'
import QRCodeModal from '@/components/outillage/QRCodeModal'
import { useNotification } from '@/hooks/useNotification'
import Image from 'next/image'

interface Machine {
  id: string
  nom: string
  modele: string
  numeroSerie: string | null
  localisation: string
  statut: 'DISPONIBLE' | 'PRETE' | 'EN_PANNE' | 'EN_REPARATION' | 'MANQUE_CONSOMMABLE'
  dateAchat: string | null
  qrCode: string
  commentaire: string | null
  createdAt: string
  updatedAt: string
}

interface Pret {
  id: string
  datePret: string
  dateRetourPrevue: string
  dateRetourEffective: string | null
  statut: 'EN_COURS' | 'TERMINE'
  user: {
    name: string | null
    email: string
  }
  emprunteur: string
}

export default function MachinePage(props: { params: Promise<{ machineId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const { showNotification, NotificationComponent } = useNotification()
  const [machine, setMachine] = useState<Machine | null>(null)
  const [prets, setPrets] = useState<Pret[]>([])
  const [showPretModal, setShowPretModal] = useState(false)
  const [showRetourModal, setShowRetourModal] = useState(false)
  const [selectedPretId, setSelectedPretId] = useState<string | null>(null)
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMachine()
    fetchPrets()
    fetchPhoto()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.machineId])

  const fetchMachine = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`)
      if (!response.ok) throw new Error('Erreur lors de la récupération de la machine')
      const data = await response.json()
      setMachine(data)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchPrets = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}/prets`)
      if (!response.ok) throw new Error('Erreur lors de la récupération des prêts')
      const data = await response.json()
      setPrets(data)
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const fetchPhoto = async () => {
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`)
      if (response.ok) {
        const data = await response.json()
        if (data.exists) {
          setPhotoUrl(data.url)
        } else {
          setPhotoUrl(null)
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de la photo:', error)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      showNotification('Erreur', 'Le fichier doit être une image', 'error')
      return
    }

    // Vérifier la taille (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('Erreur', 'Le fichier est trop volumineux (max 10MB)', 'error')
      return
    }

    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      const data = await response.json()
      setPhotoUrl(data.url)
      showNotification('Succès', 'Photo uploadée avec succès', 'success')
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      showNotification('Erreur', `Erreur lors de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handlePhotoDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette photo ?')) {
      return
    }

    setDeletingPhoto(true)
    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}/photo`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      setPhotoUrl(null)
      showNotification('Succès', 'Photo supprimée avec succès', 'success')
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      showNotification('Erreur', `Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const getStatutStyle = (statut: Machine['statut']) => {
    const styles = {
      DISPONIBLE: 'bg-green-100 text-green-800',
      PRETE: 'bg-blue-100 text-blue-800',
      EN_PANNE: 'bg-red-100 text-red-800',
      EN_REPARATION: 'bg-yellow-100 text-yellow-800',
      MANQUE_CONSOMMABLE: 'bg-orange-100 text-orange-800'
    }
    return styles[statut]
  }

  const handleRetourClick = (pretId: string) => {
    setSelectedPretId(pretId)
    setShowRetourModal(true)
  }

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la machine "${machine?.nom}" ?\n\nCette action est irréversible et supprimera également tous les prêts associés.`)) {
      return
    }

    try {
      const response = await fetch(`/api/outillage/machines/${params.machineId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }

      // Rediriger vers la liste après suppression
      router.push('/outillage')
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      showNotification({
        type: 'error',
        title: 'Erreur',
        message: error instanceof Error ? error.message : 'Erreur inconnue lors de la suppression'
      })
    }
  }

  if (!machine) return null

  return (
    <div className="max-w-[1600px] mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="lg:flex lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {machine.nom}
          </h2>
          <div className="mt-1 flex flex-col sm:mt-0 sm:flex-row sm:flex-wrap sm:space-x-6">
            <div className="mt-2 flex items-center text-sm text-gray-500">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatutStyle(machine.statut)}`}>
                {machine.statut.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex lg:ml-4 lg:mt-0 space-x-3">
          <button
            type="button"
            onClick={() => router.push('/outillage')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowUturnLeftIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Retour à la liste
          </button>
          <button
            type="button"
            onClick={() => setShowPretModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <UserIcon className="-ml-1 mr-2 h-5 w-5" />
            Nouveau prêt
          </button>
          <button
            type="button"
            onClick={() => router.push(`/outillage/${machine.id}/edit`)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PencilIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            Modifier
          </button>
          <button
            type="button"
            onClick={() => setShowQRCodeModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <QrCodeIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
            QR Code
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <TrashIcon className="-ml-1 mr-2 h-5 w-5 text-red-500" />
            Supprimer
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Photo de la machine */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Photo de la machine
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            {photoUrl ? (
              <div className="relative">
                <div className="relative w-full h-64 rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={photoUrl}
                    alt={machine.nom}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <CameraIcon className="h-4 w-4 mr-2" />
                    {uploadingPhoto ? 'Upload...' : 'Remplacer'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePhotoDelete}
                    disabled={deletingPhoto}
                    className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Supprimer
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center py-6">
                    <PhotoIcon className="w-12 h-12 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Cliquez pour ajouter une photo</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, JPEG (max. 10Mo)
                    </p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    ref={fileInputRef}
                  />
                </label>
                {uploadingPhoto && (
                  <p className="mt-2 text-sm text-gray-500 text-center">Upload en cours...</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Informations de la machine */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Informations
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Modèle</dt>
                <dd className="mt-1 text-sm text-gray-900">{machine.modele}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Numéro de série</dt>
                <dd className="mt-1 text-sm text-gray-900">{machine.numeroSerie || '-'}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Localisation</dt>
                <dd className="mt-1 text-sm text-gray-900">{machine.localisation}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Date d'achat</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {machine.dateAchat 
                    ? format(new Date(machine.dateAchat), 'dd MMMM yyyy', { locale: fr })
                    : '-'
                  }
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Commentaire</dt>
                <dd className="mt-1 text-sm text-gray-900">{machine.commentaire || '-'}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Historique des prêts */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Historique des prêts
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <ul role="list" className="divide-y divide-gray-200">
              {prets.map((pret) => (
                <li key={pret.id} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserIcon className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {pret.emprunteur}
                        </p>
                        <p className="text-sm text-gray-500">
                          Du {format(new Date(pret.datePret), 'dd/MM/yyyy', { locale: fr })}
                          {' '}au {format(new Date(pret.dateRetourPrevue), 'dd/MM/yyyy', { locale: fr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        pret.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {pret.statut === 'EN_COURS' ? 'En cours' : 'Terminé'}
                      </span>
                      {pret.statut === 'EN_COURS' && (
                        <button
                          onClick={() => handleRetourClick(pret.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Retourner l'outil"
                        >
                          <ArrowUturnLeftIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
              {prets.length === 0 && (
                <li className="px-4 py-4 text-sm text-gray-500 text-center">
                  Aucun prêt enregistré
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de prêt à implémenter */}
      {showPretModal && (
        <PretModal 
          machineId={machine.id} 
          onClose={() => setShowPretModal(false)}
          onSuccess={() => {
            setShowPretModal(false)
            fetchPrets()
            fetchMachine()
          }}
        />
      )}

      {showRetourModal && selectedPretId && (
        <RetourPretModal
          pretId={selectedPretId}
          onClose={() => {
            setShowRetourModal(false)
            setSelectedPretId(null)
          }}
          onSuccess={() => {
            setShowRetourModal(false)
            setSelectedPretId(null)
            fetchPrets()
            fetchMachine()
          }}
        />
      )}

      {showQRCodeModal && machine && (
        <QRCodeModal
          machineId={machine.id}
          machineName={machine.nom}
          qrCodeValue={`${window.location.origin}/outillage/${machine.id}`}
          onClose={() => setShowQRCodeModal(false)}
        />
      )}

      <NotificationComponent />
    </div>
  )
} 
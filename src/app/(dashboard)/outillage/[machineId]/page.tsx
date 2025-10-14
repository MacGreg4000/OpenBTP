'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { 
  PencilIcon, 
  QrCodeIcon,
  UserIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PretModal from '@/components/outillage/PretModal'
import RetourPretModal from '@/components/outillage/RetourPretModal'
import QRCodeModal from '@/components/outillage/QRCodeModal'

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
  const [machine, setMachine] = useState<Machine | null>(null)
  const [prets, setPrets] = useState<Pret[]>([])
  const [showPretModal, setShowPretModal] = useState(false)
  const [showRetourModal, setShowRetourModal] = useState(false)
  const [selectedPretId, setSelectedPretId] = useState<string | null>(null)
  const [showQRCodeModal, setShowQRCodeModal] = useState(false)

  useEffect(() => {
    fetchMachine()
    fetchPrets()
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

  if (!machine) return null

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
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
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
    </div>
  )
} 
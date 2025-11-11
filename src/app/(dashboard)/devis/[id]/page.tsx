'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

interface Devis {
  id: string
  numeroDevis: string
  dateCreation: string
  dateValidite: string
  statut: string
  observations: string | null
  conditionsGenerales: string | null
  remiseGlobale: number
  montantHT: number
  montantTVA: number
  montantTTC: number
  convertedToCommandeId: string | null
  client: {
    id: string
    nom: string
    email: string
    telephone: string | null
    adresse: string | null
  }
  createur: {
    id: string
    name: string
    email: string
  }
  lignes: Array<{
    id: string
    ordre: number
    type: string
    article: string | null
    description: string | null
    unite: string | null
    quantite: number | null
    prixUnitaire: number | null
    remise: number
    total: number | null
  }>
}

interface Chantier {
  id: string
  nomChantier: string
  adresse: string | null
}

export default function DevisDetailPage() {
  const router = useRouter()
  const params = useParams()
  const devisId = params?.id as string

  const [devis, setDevis] = useState<Devis | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [selectedChantierId, setSelectedChantierId] = useState('')
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    if (devisId) {
      loadDevis()
    }
  }, [devisId])

  const loadDevis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/devis/${devisId}`)
      if (response.ok) {
        const data = await response.json()
        setDevis(data)
      } else {
        router.push('/devis')
      }
    } catch (error) {
      console.error('Erreur lors du chargement du devis:', error)
      router.push('/devis')
    } finally {
      setLoading(false)
    }
  }

  const loadChantiers = async () => {
    if (!devis) return
    try {
      const response = await fetch(`/api/chantiers?clientId=${devis.client.id}`)
      if (response.ok) {
        const data = await response.json()
        setChantiers(Array.isArray(data) ? data : data.chantiers || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
    }
  }

  const handleChangeStatus = async (newStatus: string) => {
    if (!devis) return
    
    if (!confirm(`Êtes-vous sûr de vouloir passer ce devis en "${getStatutLabel(newStatus)}" ?`)) {
      return
    }

    try {
      const response = await fetch(`/api/devis/${devis.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      })

      if (response.ok) {
        await loadDevis()
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors du changement de statut')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du changement de statut')
    }
  }

  const handleDuplicate = async () => {
    if (!devis) return
    
    if (!confirm('Voulez-vous dupliquer ce devis ?')) {
      return
    }

    try {
      const response = await fetch(`/api/devis/${devis.id}/duplicate`, {
        method: 'POST'
      })

      if (response.ok) {
        const newDevis = await response.json()
        router.push(`/devis/${newDevis.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la duplication')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la duplication')
    }
  }

  const handleDelete = async () => {
    if (!devis) return
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.')) {
      return
    }

    try {
      const response = await fetch(`/api/devis/${devis.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/devis')
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la suppression')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const handleConvert = async () => {
    if (!selectedChantierId) {
      alert('Veuillez sélectionner un chantier')
      return
    }

    try {
      setConverting(true)
      const response = await fetch(`/api/devis/${devisId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId: selectedChantierId })
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message || 'Devis converti avec succès')
        await loadDevis()
        setShowConvertModal(false)
        // Optionnel : rediriger vers la commande créée
        if (result.commande?.id) {
          router.push(`/chantiers/${selectedChantierId}/commande?id=${result.commande.id}`)
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la conversion')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la conversion')
    } finally {
      setConverting(false)
    }
  }

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE: 'En attente',
      ACCEPTE: 'Accepté',
      REFUSE: 'Refusé',
      CONVERTI: 'Converti',
      EXPIRE: 'Expiré'
    }
    return labels[statut] || statut
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const isExpired = () => {
    if (!devis) return false
    return new Date(devis.dateValidite) < new Date() && devis.statut === 'EN_ATTENTE'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!devis) {
    return null
  }

  const canEdit = devis.statut === 'BROUILLON'
  const canConvert = devis.statut === 'ACCEPTE'

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/devis')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Devis {devis.numeroDevis}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Créé le {formatDate(devis.dateCreation)} par {devis.createur.name}
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <a
            href={`/api/devis/${devisId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Télécharger PDF
          </a>

          <button
            onClick={handleDuplicate}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            Dupliquer
          </button>

          {canEdit && (
            <button
              onClick={() => router.push(`/devis/${devis.id}/edit`)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              Modifier
            </button>
          )}

          {canConvert && (
            <button
              onClick={() => {
                loadChantiers()
                setShowConvertModal(true)
              }}
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Convertir en commande
            </button>
          )}

          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-600 rounded-md text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Supprimer
          </button>
        </div>
      </div>

      {/* Alerte expiration */}
      {isExpired() && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-800 dark:text-red-300 font-medium">
              Ce devis a expiré le {formatDate(devis.dateValidite)}
            </p>
          </div>
        </div>
      )}

      {/* Informations générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Client</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Nom:</span>
              <span className="ml-2 text-gray-900 dark:text-white font-medium">{devis.client.nom}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Email:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{devis.client.email}</span>
            </div>
            {devis.client.telephone && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Téléphone:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{devis.client.telephone}</span>
              </div>
            )}
            {devis.client.adresse && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Adresse:</span>
                <span className="ml-2 text-gray-900 dark:text-white">{devis.client.adresse}</span>
              </div>
            )}
          </div>
        </div>

        {/* Détails devis */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Détails du devis</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Statut:</span>
              <span className="ml-2">
                <StatusBadge statut={devis.statut} />
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Validité:</span>
              <span className={`ml-2 ${isExpired() ? 'text-red-600 font-medium' : 'text-gray-900 dark:text-white'}`}>
                {formatDate(devis.dateValidite)}
              </span>
            </div>
            {devis.remiseGlobale > 0 && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Remise globale:</span>
                <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">
                  {devis.remiseGlobale}%
                </span>
              </div>
            )}
          </div>

          {/* Actions de statut */}
          {devis.statut !== 'CONVERTI' && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {devis.statut === 'BROUILLON' && (
                <button
                  onClick={() => handleChangeStatus('EN_ATTENTE')}
                  className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Envoyer au client
                </button>
              )}
              {devis.statut === 'EN_ATTENTE' && (
                <>
                  <button
                    onClick={() => handleChangeStatus('ACCEPTE')}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Marquer comme accepté
                  </button>
                  <button
                    onClick={() => handleChangeStatus('REFUSE')}
                    className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <XCircleIcon className="h-4 w-4 mr-2" />
                    Marquer comme refusé
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Observations */}
      {devis.observations && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Observations</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {devis.observations}
          </p>
        </div>
      )}

      {/* Lignes du devis */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lignes du devis</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Article</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Unité</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qté</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prix U.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remise</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {devis.lignes.map((ligne, index) => {
                if (ligne.type === 'TITRE') {
                  return (
                    <tr key={ligne.id} className="bg-orange-50 dark:bg-orange-900/20">
                      <td colSpan={8} className="px-4 py-3 text-base font-bold text-gray-900 dark:text-white">
                        {ligne.description || ligne.article}
                      </td>
                    </tr>
                  )
                }
                if (ligne.type === 'SOUS_TITRE') {
                  return (
                    <tr key={ligne.id} className="bg-blue-50 dark:bg-blue-900/20">
                      <td colSpan={8} className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 pl-8">
                        {ligne.description || ligne.article}
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={ligne.id}>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{ligne.article}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{ligne.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{ligne.unite}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">{ligne.quantite}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {formatCurrency(Number(ligne.prixUnitaire))}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                      {ligne.remise > 0 ? `${ligne.remise}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                      {formatCurrency(Number(ligne.total))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Montant HT</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(Number(devis.montantHT))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(Number(devis.montantTVA))}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total TTC</span>
              <span className="text-orange-600 dark:text-orange-400">
                {formatCurrency(Number(devis.montantTTC))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Conditions générales */}
      {devis.conditionsGenerales && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Conditions générales de vente</h2>
          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {devis.conditionsGenerales}
          </pre>
        </div>
      )}

      {/* Modal de conversion */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Convertir en commande
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Sélectionnez le chantier auquel associer cette commande :
            </p>
            <select
              value={selectedChantierId}
              onChange={(e) => setSelectedChantierId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 mb-6"
            >
              <option value="">Choisir un chantier...</option>
              {chantiers.map((chantier) => (
                <option key={chantier.id} value={chantier.id}>
                  {chantier.nomChantier} {chantier.adresse && `- ${chantier.adresse}`}
                </option>
              ))}
            </select>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConvertModal(false)}
                disabled={converting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleConvert}
                disabled={converting || !selectedChantierId}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {converting ? 'Conversion...' : 'Convertir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant de badge de statut
function StatusBadge({ statut }: { statut: string }) {
  const config: Record<string, { label: string; color: string }> = {
    BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    EN_ATTENTE: { label: 'En attente', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
    ACCEPTE: { label: 'Accepté', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    REFUSE: { label: 'Refusé', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
    CONVERTI: { label: 'Converti', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
    EXPIRE: { label: 'Expiré', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' }
  }

  const { label, color } = config[statut] || { label: statut, color: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  )
}


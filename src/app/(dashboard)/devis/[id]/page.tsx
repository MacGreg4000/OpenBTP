'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { 
  PencilIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  DocumentTextIcon,
  EyeIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { useConfirmation } from '@/components/modals/confirmation-modal'

interface Devis {
  id: string
  numeroDevis: string
  typeDevis: 'DEVIS' | 'AVENANT'
  reference: string | null
  dateCreation: string
  dateValidite: string
  statut: string
  observations: string | null
  tauxTVA: number
  remiseGlobale: number
  montantHT: number
  montantTVA: number
  montantTTC: number
  convertedToCommandeId: string | null
  convertedToEtatId: string | null
  chantierId: string | null
  client: {
    id: string
    nom: string
    email: string
    telephone: string | null
    adresse: string | null
  }
  chantier?: {
    chantierId: string
    nomChantier: string
    adresse: string | null
  } | null
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
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation()

  const loadDevis = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/devis/${devisId}`)
      if (response.ok) {
        const data = (await response.json()) as Devis
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
  }, [devisId, router])

  useEffect(() => {
    if (devisId) {
      void loadDevis()
    }
  }, [devisId, loadDevis])

  const loadChantiers = async () => {
    if (!devis) return
    try {
      const response = await fetch(`/api/chantiers?clientId=${devis.client.id}`)
      if (response.ok) {
        const data = (await response.json()) as Chantier[] | { chantiers?: Chantier[] }
        const chantiersData = Array.isArray(data) ? data : data.chantiers ?? []
        setChantiers(chantiersData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
    }
  }

  const handleChangeStatus = async (newStatus: string) => {
    if (!devis) return
    
    showConfirmation({
      title: 'Confirmer le changement de statut',
      message: `Êtes-vous sûr de vouloir passer ce devis en "${getStatutLabel(newStatus)}" ?`,
      type: 'warning',
      confirmText: 'Confirmer',
      cancelText: 'Annuler',
      onConfirm: async () => {
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
            showConfirmation({
              title: 'Erreur',
              message: error.error || 'Erreur lors du changement de statut',
              type: 'error',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
          }
        } catch (error) {
          console.error('Erreur:', error)
            showConfirmation({
              title: 'Erreur',
              message: 'Erreur lors du changement de statut',
              type: 'error',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
        }
      }
    })
  }

  const handleSendToClient = async () => {
    if (!devis) return
    
    showConfirmation({
      title: 'Envoyer le devis au client',
      message: 'Voulez-vous envoyer ce devis au client ? Il passera en statut "En attente".',
      type: 'info',
      confirmText: 'Envoyer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/devis/${devis.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: 'EN_ATTENTE' })
          })

          if (response.ok) {
            await loadDevis()
            showConfirmation({
              title: 'Succès',
              message: 'Le devis a été envoyé au client et est maintenant en attente de validation.',
              type: 'success',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
          } else {
            const error = await response.json()
            showConfirmation({
              title: 'Erreur',
              message: error.error || 'Erreur lors de l\'envoi du devis',
              type: 'error',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
          }
        } catch (error) {
          console.error('Erreur:', error)
          showConfirmation({
            title: 'Erreur',
            message: 'Erreur lors de l\'envoi du devis',
            type: 'error',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: () => {}
          })
        }
      }
    })
  }

  const handleDuplicate = async () => {
    if (!devis) return
    
    showConfirmation({
      title: 'Dupliquer le devis',
      message: 'Voulez-vous dupliquer ce devis ?',
      type: 'info',
      confirmText: 'Dupliquer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/devis/${devis.id}/duplicate`, {
            method: 'POST'
          })

          if (response.ok) {
            const newDevis = await response.json()
            router.push(`/devis/${newDevis.id}`)
          } else {
            const error = await response.json()
            showConfirmation({
              title: 'Erreur',
              message: error.error || 'Erreur lors de la duplication',
              type: 'error',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
          }
        } catch (error) {
          console.error('Erreur:', error)
          showConfirmation({
            title: 'Erreur',
            message: 'Erreur lors de la duplication',
            type: 'error',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: () => {}
          })
        }
      }
    })
  }

  const handleDelete = async () => {
    if (!devis) return
    
    showConfirmation({
      title: 'Supprimer le devis',
      message: 'Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible.',
      type: 'warning',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/devis/${devis.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            router.push('/devis')
          } else {
            const error = await response.json()
            showConfirmation({
              title: 'Erreur',
              message: error.error || 'Erreur lors de la suppression',
              type: 'error',
              confirmText: 'OK',
              showCancel: false,
              onConfirm: () => {}
            })
          }
        } catch (error) {
          console.error('Erreur:', error)
          showConfirmation({
            title: 'Erreur',
            message: 'Erreur lors de la suppression',
            type: 'error',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: () => {}
          })
        }
      }
    })
  }

  const handleConvert = async () => {
    // Pour les DEVIS, on doit sélectionner un chantier
    // Pour les AVENANTS, le chantier est déjà défini dans le devis
    const chantierId = devis?.typeDevis === 'AVENANT' 
      ? devis.chantierId 
      : selectedChantierId

    if (!chantierId) {
      showConfirmation({
        title: 'Chantier requis',
        message: 'Veuillez sélectionner un chantier',
        type: 'warning',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
      return
    }

    try {
      setConverting(true)
      const response = await fetch(`/api/devis/${devisId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.type === 'AVENANT') {
          showConfirmation({
            title: 'Succès',
            message: 'L\'avenant a été ajouté avec succès à l\'état d\'avancement du chantier.',
            type: 'success',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: () => {
              setShowConvertModal(false)
              // Rediriger vers les états d'avancement du chantier
              if (result.etatAvancement?.chantierId) {
                router.push(`/chantiers/${result.etatAvancement.chantierId}/etats`)
              }
            }
          })
          await loadDevis()
        } else {
          showConfirmation({
            title: 'Succès',
            message: result.message || 'Devis converti en commande avec succès',
            type: 'success',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: () => {
              setShowConvertModal(false)
              // Rediriger vers la commande créée
              // Utiliser l'ID métier du chantier (chantierId) pour la route, pas l'ID primaire
              const chantierIdForRoute = result.commande?.Chantier?.chantierId || chantierId
              if (result.commande?.id) {
                router.push(`/chantiers/${chantierIdForRoute}/commande?id=${result.commande.id}`)
              }
            }
          })
          await loadDevis()
        }
      } else {
        const error = await response.json()
        showConfirmation({
          title: 'Erreur',
          message: error.error || 'Erreur lors de la conversion',
          type: 'error',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => {}
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
      showConfirmation({
        title: 'Erreur',
        message: 'Erreur lors de la conversion',
        type: 'error',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={`${devis.numeroDevis}${devis.reference ? ` - ${devis.reference}` : ''}`}
        subtitle={`Créé le ${formatDate(devis.dateCreation)} par ${devis.createur.name}`}
        icon={DocumentTextIcon}
        badgeColor="from-orange-600 via-orange-700 to-red-700"
        gradientColor="from-orange-600/10 via-orange-700/10 to-red-700/10"
        leftAction={
          <button
            onClick={() => router.push('/devis')}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Retour à la liste des devis"
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Badges à droite du titre */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                devis.typeDevis === 'DEVIS' 
                  ? 'bg-blue-500/90 text-white'
                  : 'bg-orange-500/90 text-white'
              }`}>
                {devis.typeDevis === 'DEVIS' ? '📄 Devis' : '📋 Avenant'}
              </span>
              {isExpired() && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold bg-red-500/90 text-white">
                  Expiré
                </span>
              )}
            </div>
            
            {/* Séparateur visuel */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
            
            {/* Boutons d'action */}
            <a
              href={`/api/devis/${devisId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span className="hidden sm:inline">PDF</span>
            </a>

            <button
              onClick={handleDuplicate}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
            >
              <DocumentDuplicateIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Dupliquer</span>
            </button>

            {canEdit && (
              <button
                onClick={() => router.push(`/devis/${devis.id}/edit`)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
              >
                <PencilIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Modifier</span>
              </button>
            )}

            {canConvert && (
              <button
                onClick={() => {
                  loadChantiers()
                  setShowConvertModal(true)
                }}
                className="inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {devis.typeDevis === 'DEVIS' ? 'Convertir en commande' : 'Ajouter comme avenant'}
                </span>
                <span className="sm:hidden">Convertir</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 dark:border-red-600 rounded-lg shadow-sm text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Carte Chantier (si avenant) */}
        {devis.typeDevis === 'AVENANT' && devis.chantier && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-orange-200/50 dark:border-orange-700/50 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏗️</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span>Chantier associé</span>
                    <span className="text-base font-bold text-orange-900 dark:text-orange-300">- {devis.chantier.nomChantier}</span>
                    <a
                      href={`/chantiers/${devis.chantier.chantierId}`}
                      className="inline-flex items-center justify-center p-1 text-orange-700 dark:text-orange-300 hover:text-orange-900 dark:hover:text-orange-100 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
                      title="Voir le chantier"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </a>
                  </div>
                  <div className="text-xs font-normal text-gray-600 dark:text-gray-400">Cet avenant sera ajouté à l'état d'avancement de ce chantier</div>
                </div>
              </div>
            </h2>
            {devis.chantier.adresse && (
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Adresse</span>
                <span className="text-sm text-gray-900 dark:text-white text-right max-w-xs">{devis.chantier.adresse}</span>
              </div>
            )}
          </div>
        )}

        {/* Informations générales avec design moderne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Client */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
              Client
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Nom</span>
                <span className="text-gray-900 dark:text-white font-semibold text-right">{devis.client.nom}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Email</span>
                <span className="text-gray-900 dark:text-white text-right">{devis.client.email}</span>
              </div>
              {devis.client.telephone && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Téléphone</span>
                  <span className="text-gray-900 dark:text-white text-right">{devis.client.telephone}</span>
                </div>
              )}
              {devis.client.adresse && (
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Adresse</span>
                  <span className="text-gray-900 dark:text-white text-right max-w-xs">{devis.client.adresse}</span>
                </div>
              )}
            </div>
          </div>

          {/* Détails devis */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-2xl transition-shadow duration-300">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
              Détails du devis
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Statut</span>
                <StatusBadge statut={devis.statut} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Validité</span>
                <span className={`font-semibold ${isExpired() ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                  {formatDate(devis.dateValidite)}
                </span>
              </div>
              {devis.remiseGlobale > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">Remise globale</span>
                  <span className="text-orange-600 dark:text-orange-400 font-bold">
                    {devis.remiseGlobale}%
                  </span>
                </div>
              )}
            </div>

            {/* Actions de statut */}
            {devis.statut !== 'CONVERTI' && (
              <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-700/50 space-y-3">
                <button
                  onClick={handleSendToClient}
                  disabled={devis.statut !== 'BROUILLON'}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 transform hover:scale-[1.02] ${
                    devis.statut === 'BROUILLON'
                      ? 'bg-gradient-to-r from-orange-600 via-orange-700 to-red-700 hover:from-orange-700 hover:via-orange-800 hover:to-red-800 shadow-lg hover:shadow-xl ring-2 ring-orange-300/50 dark:ring-orange-500/50'
                      : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Envoyer au client
                </button>

                <button
                  onClick={() => handleChangeStatus('ACCEPTE')}
                  disabled={devis.statut === 'ACCEPTE' || devis.statut === 'CONVERTI'}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 transform hover:scale-[1.02] ${
                    devis.statut !== 'ACCEPTE' && devis.statut !== 'CONVERTI'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl ring-2 ring-green-300/50 dark:ring-green-500/50'
                      : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Marquer comme accepté
                </button>

                <button
                  onClick={() => handleChangeStatus('REFUSE')}
                  disabled={devis.statut === 'REFUSE' || devis.statut === 'CONVERTI'}
                  className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-[1.02] ${
                    devis.statut !== 'REFUSE' && devis.statut !== 'CONVERTI'
                      ? 'text-gray-700 dark:text-gray-200 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-600 dark:hover:to-gray-500 shadow hover:shadow-lg ring-2 ring-gray-300/50 dark:ring-gray-500/50'
                      : 'text-white bg-gray-300 dark:bg-gray-600 cursor-not-allowed opacity-50'
                  }`}
                >
                  <XCircleIcon className="h-5 w-5" />
                  Marquer comme refusé
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Observations */}
        {devis.observations && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
              Observations
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
              {devis.observations}
            </p>
          </div>
        )}

        {/* Lignes du devis */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
            Lignes du devis
          </h2>
          <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle px-6">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Article</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Unité</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Qté</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Prix U.</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Remise</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {devis.lignes.map((ligne, index) => {
                    if (ligne.type === 'TITRE') {
                      return (
                        <tr key={ligne.id} className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10">
                          <td colSpan={8} className="px-4 py-4 text-base font-bold text-gray-900 dark:text-white">
                            {ligne.description || ligne.article}
                          </td>
                        </tr>
                      )
                    }
                    if (ligne.type === 'SOUS_TITRE') {
                      return (
                        <tr key={ligne.id} className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10">
                          <td colSpan={8} className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 pl-8">
                            {ligne.description || ligne.article}
                          </td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={ligne.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{ligne.article}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{ligne.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{ligne.unite}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white font-medium">{ligne.quantite}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                          {formatCurrency(Number(ligne.prixUnitaire))}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                          {ligne.remise > 0 ? `${ligne.remise}%` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(Number(ligne.total))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totaux */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <div className="max-w-md w-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-gray-200/50 dark:border-gray-600/50">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200/50 dark:border-gray-600/50">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">Montant HT</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(Number(devis.montantHT))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-200/50 dark:border-gray-600/50">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">TVA ({devis.tauxTVA}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(Number(devis.montantTVA))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Total TTC</span>
                    <span className="text-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                      {formatCurrency(Number(devis.montantTTC))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note sur les CGV */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/50 rounded-2xl p-5 backdrop-blur-sm shadow-xl">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">Note :</span> Les conditions générales de vente seront incluses dans le PDF généré, selon le template configuré dans les paramètres de l'entreprise.
          </p>
        </div>

        {/* Modal de conversion */}
        {showConvertModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-orange-600 to-orange-700">
                <h3 className="text-lg font-semibold text-white">
                  {devis.typeDevis === 'DEVIS' 
                    ? '📄 Convertir en commande' 
                    : '📋 Convertir l\'avenant'}
                </h3>
              </div>
              <div className="p-6">
                {devis.typeDevis === 'DEVIS' ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Sélectionnez le chantier auquel associer cette commande :
                    </p>
                    <select
                      value={selectedChantierId}
                      onChange={(e) => setSelectedChantierId(e.target.value)}
                      className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 mb-6 transition-all"
                    >
                      <option value="">Choisir un chantier...</option>
                      {chantiers.map((chantier) => (
                        <option key={chantier.id} value={chantier.id}>
                          {chantier.nomChantier} {chantier.adresse && `- ${chantier.adresse}`}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Cet avenant sera ajouté comme ligne dans l'état d'avancement du chantier :
                    </p>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 mb-6 border border-orange-200 dark:border-orange-700">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🏗️</span>
                        <span className="font-bold text-orange-900 dark:text-orange-300">
                          {devis.chantier?.nomChantier || 'Chantier'}
                        </span>
                      </div>
                      {devis.chantier?.adresse && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 ml-8">
                          {devis.chantier.adresse}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Une ligne avenant sera créée dans l'état d'avancement "Brouillon" avec la description "{devis.numeroDevis}{devis.reference ? ` - ${devis.reference}` : ''}" et le montant HT. Le PDF sera sauvegardé dans les documents du chantier.
                    </p>
                  </>
                )}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConvertModal(false)}
                    disabled={converting}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConvert}
                    disabled={converting || (devis.typeDevis === 'DEVIS' && !selectedChantierId)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                  >
                    {converting ? 'Conversion...' : 'Convertir'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {ConfirmationModalComponent}
    </div>
  )
}

// Composant de badge de statut
function StatusBadge({ statut }: { statut: string }) {
  const config: Record<string, { label: string; color: string }> = {
    BROUILLON: { label: 'Brouillon', color: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-200 ring-2 ring-gray-300/50 dark:ring-gray-500/50' },
    EN_ATTENTE: { label: 'En attente', color: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-300 ring-2 ring-blue-300/50 dark:ring-blue-500/50' },
    ACCEPTE: { label: 'Accepté', color: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-300 ring-2 ring-green-300/50 dark:ring-green-500/50' },
    REFUSE: { label: 'Refusé', color: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/50 dark:to-red-800/50 dark:text-red-300 ring-2 ring-red-300/50 dark:ring-red-500/50' },
    CONVERTI: { label: 'Converti', color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900/50 dark:to-orange-800/50 dark:text-orange-300 ring-2 ring-orange-300/50 dark:ring-orange-500/50' },
    EXPIRE: { label: 'Expiré', color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 dark:from-orange-900/50 dark:to-orange-800/50 dark:text-orange-300 ring-2 ring-orange-300/50 dark:ring-orange-500/50' }
  }

  const { label, color } = config[statut] || { label: statut, color: 'bg-gray-100 text-gray-800' }

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${color}`}>
      {label}
    </span>
  )
}


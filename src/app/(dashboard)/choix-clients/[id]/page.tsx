'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  DocumentTextIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast, { Toaster } from 'react-hot-toast'

const STATUTS = {
  BROUILLON: { label: 'Brouillon', color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
  PRE_CHOIX: { label: 'Pré-choix', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  CHOIX_DEFINITIF: { label: 'Choix définitif', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' }
}

const FINITIONS_LABELS: Record<string, string> = {
  BRILLANT: 'Brillant',
  MAT: 'Mat',
  SATINE: 'Satiné',
  STRUCTURE: 'Structuré',
  POLI: 'Poli',
  ANTIDERAPANT: 'Anti-dérapant'
}

const TYPES_JOINT_LABELS: Record<string, string> = {
  EPOXY: 'Époxy',
  CIMENT: 'Ciment',
  SILICONE: 'Silicone',
  POLYURETHANE: 'Polyuréthane'
}

export default function ViewChoixClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [choixClient, setChoixClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    fetchChoixClient()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchChoixClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/choix-clients/${id}`)
      const data = await response.json()
      
      if (data.success) {
        setChoixClient(data.choixClient)
      } else {
        toast.error('Choix client non trouvé')
        router.push('/choix-clients')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement')
      router.push('/choix-clients')
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true)
      toast.loading('Génération du PDF en cours...')
      
      const response = await fetch(`/api/choix-clients/${id}/generate-pdf`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la génération du PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `choix-client-${choixClient.nomClient.replace(/\s/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.dismiss()
      toast.success('PDF généré avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.dismiss()
      toast.error('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      setSendingEmail(true)
      toast.loading('Envoi de l\'email en cours...')
      
      const response = await fetch(`/api/choix-clients/${id}/send-email`, {
        method: 'POST'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l\'envoi')
      }
      
      toast.dismiss()
      toast.success('Email envoyé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.dismiss()
      toast.error('Erreur lors de l\'envoi de l\'email')
    } finally {
      setSendingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      </div>
    )
  }

  if (!choixClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      {/* Header avec retour */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {choixClient.nomClient}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Visite du {format(new Date(choixClient.dateVisite), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/choix-clients/${id}/edit`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Modifier
              </Link>
              <button
                onClick={handleGeneratePDF}
                disabled={generatingPDF}
                className="inline-flex items-center px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentTextIcon className="h-4 w-4 mr-2" />
                {generatingPDF ? 'Génération...' : 'PDF'}
              </button>
              {choixClient.emailClient && (
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {sendingEmail ? 'Envoi...' : 'Email'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Informations générales */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Informations Générales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Statut</span>
            <div className="mt-1">
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${STATUTS[choixClient.statut as keyof typeof STATUTS].color}`}>
                {STATUTS[choixClient.statut as keyof typeof STATUTS].label}
              </span>
            </div>
          </div>
          {choixClient.telephoneClient && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Téléphone</span>
              <p className="text-gray-900 dark:text-white mt-1">{choixClient.telephoneClient}</p>
            </div>
          )}
          {choixClient.emailClient && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <p className="text-gray-900 dark:text-white mt-1">{choixClient.emailClient}</p>
            </div>
          )}
          {choixClient.chantier && (
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Chantier associé</span>
              <Link
                href={`/chantiers/${choixClient.chantier.chantierId}`}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mt-1 block"
              >
                {choixClient.chantier.nomChantier}
              </Link>
            </div>
          )}
        </div>
        {choixClient.notesGenerales && (
          <div className="mt-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">Notes générales</span>
            <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">
              {choixClient.notesGenerales}
            </p>
          </div>
        )}
      </div>

      {/* Détails des choix */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Choix des Revêtements ({choixClient.detailsChoix?.length || 0})
        </h2>
        
        {choixClient.detailsChoix && choixClient.detailsChoix.length > 0 ? (
          <div className="space-y-4">
            {choixClient.detailsChoix.map((detail: any) => (
              <div 
                key={detail.id} 
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 border-gray-200 dark:border-gray-700 p-6"
                style={{ borderLeft: `6px solid ${detail.couleurPlan}` }}
              >
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 rounded-full border-2 border-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: detail.couleurPlan }}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      Choix #{detail.numeroChoix} - {detail.type}
                    </h3>
                    
                    {/* Localisation */}
                    {detail.localisations && detail.localisations.length > 0 && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Localisation(s): </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {detail.localisations.map((loc: string, idx: number) => (
                            <span key={idx} className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full">
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Produit */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mb-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Marque: </span>
                        <span className="text-gray-900 dark:text-white">{detail.marque}</span>
                      </div>
                      {detail.collection && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Collection: </span>
                          <span className="text-gray-900 dark:text-white">{detail.collection}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Modèle: </span>
                        <span className="text-gray-900 dark:text-white">{detail.modele}</span>
                      </div>
                      {detail.reference && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Référence: </span>
                          <span className="text-gray-900 dark:text-white">{detail.reference}</span>
                        </div>
                      )}
                      {detail.couleur && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Couleur: </span>
                          <span className="text-gray-900 dark:text-white">{detail.couleur}</span>
                        </div>
                      )}
                      {detail.finition && (
                        <div>
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Finition: </span>
                          <span className="text-gray-900 dark:text-white">{FINITIONS_LABELS[detail.finition] || detail.finition}</span>
                        </div>
                      )}
                    </div>

                    {/* Format */}
                    {(detail.formatLongueur || detail.formatLargeur || detail.epaisseur) && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Format: </span>
                        <span className="text-gray-900 dark:text-white">
                          {detail.formatLongueur && detail.formatLargeur 
                            ? `${detail.formatLongueur} × ${detail.formatLargeur} cm`
                            : detail.formatLongueur 
                              ? `${detail.formatLongueur} cm`
                              : detail.formatLargeur 
                                ? `${detail.formatLargeur} cm`
                                : ''}
                          {detail.epaisseur && ` - ${detail.epaisseur} mm`}
                        </span>
                      </div>
                    )}

                    {/* Surface */}
                    {detail.surfaceEstimee && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Surface estimée: </span>
                        <span className="text-gray-900 dark:text-white">{detail.surfaceEstimee} m²</span>
                      </div>
                    )}

                    {/* Joints */}
                    {(detail.couleurJoint || detail.largeurJoint || detail.typeJoint) && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Joints: </span>
                        <span className="text-gray-900 dark:text-white">
                          {detail.couleurJoint && `${detail.couleurJoint}`}
                          {detail.largeurJoint && ` - ${detail.largeurJoint} mm`}
                          {detail.typeJoint && ` - ${TYPES_JOINT_LABELS[detail.typeJoint] || detail.typeJoint}`}
                        </span>
                      </div>
                    )}

                    {/* Pose */}
                    {(detail.typePose || detail.sensPose) && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Pose: </span>
                        <span className="text-gray-900 dark:text-white">
                          {detail.typePose}
                          {detail.sensPose && ` - Sens: ${detail.sensPose}`}
                        </span>
                      </div>
                    )}

                    {detail.particularitesPose && (
                      <div className="mb-3">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Particularités: </span>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{detail.particularitesPose}</p>
                      </div>
                    )}

                    {detail.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes: </span>
                        <p className="text-gray-900 dark:text-white whitespace-pre-wrap mt-1">{detail.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">Aucun choix ajouté</p>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}


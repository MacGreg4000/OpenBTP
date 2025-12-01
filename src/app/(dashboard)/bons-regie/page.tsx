'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { PageHeader } from '@/components/PageHeader'
import { 
  DocumentTextIcon, 
  PlusIcon, 
  ChevronDownIcon,
  LinkIcon,
  CheckIcon,
  ShareIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BonRegie {
  id: number
  dates: string
  client: string
  nomChantier: string
  description: string
  tempsChantier: number | null
  nombreTechniciens: number | null
  materiaux: string | null
  nomSignataire: string
  dateSignature: string
  createdAt: string
  chantierId: string | null
}

interface Chantier {
  chantierId: string
  nomChantier: string
}

export default function BonsRegiePage() {
  const { data: session } = useSession()
  const [bonsRegie, setBonsRegie] = useState<BonRegie[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // État pour garder l'ID du bon de régie actuellement en cours d'édition
  const [editingBonId, setEditingBonId] = useState<number | null>(null)
  // ID du chantier sélectionné pour l'association
  const [selectedChantierId, setSelectedChantierId] = useState<string>('')
  // État pour montrer le statut de mise à jour
  const [updating, setUpdating] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [copied, setCopied] = useState(false)
  const [bonToDelete, setBonToDelete] = useState<number | null>(null)
  
  // Vérifier si l'utilisateur est administrateur
  const isAdmin = session?.user?.role === 'ADMIN'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Récupérer tous les bons de régie (ENDPOINT MIS A JOUR)
        const bonsResponse = await fetch('/api/public/bon-regie')
        if (!bonsResponse.ok) {
          throw new Error('Erreur lors de la récupération des bons de régie')
        }
        const bonsData = await bonsResponse.json()
        setBonsRegie(bonsData)
        
        // Récupérer tous les chantiers pour l'association
        const chantiersResponse = await fetch('/api/chantiers')
        if (!chantiersResponse.ok) {
          throw new Error('Erreur lors de la récupération des chantiers')
        }
        const chantiersJson = await chantiersResponse.json()
        const chantiersData = Array.isArray(chantiersJson) ? chantiersJson : chantiersJson.data
        
        // Formater les données des chantiers
        type RawChantier = { chantierId: string; nomChantier: string }
        const formattedChantiers = (Array.isArray(chantiersData) ? chantiersData : []).map((chantier: RawChantier) => ({
          chantierId: chantier.chantierId,
          nomChantier: chantier.nomChantier
        }))
        
        setChantiers(formattedChantiers)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Impossible de charger les données')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])
  
  const handleShareLink = () => {
    const publicUrl = `${window.location.origin}/public/bon-regie`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Lien copié dans le presse-papiers');
    }).catch(err => {
      console.error('Erreur lors de la copie du lien:', err);
      toast.error('Impossible de copier le lien.');
    });
  };

  // Associer un bon de régie à un chantier
  const handleAssociateToChantierId = async () => {
    if (!editingBonId || !selectedChantierId) return
    
    try {
      setUpdating(true)
      
      // Appel API pour mettre à jour l'association
      const response = await fetch(`/api/bon-regie/${editingBonId}/associate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ chantierId: selectedChantierId })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'association du bon au chantier')
      }
      
      const result = await response.json()
      console.log('✅ Association réussie:', result)
      
      // Mise à jour de l'état local
      setBonsRegie(prev => 
        prev.map(bon => 
          bon.id === editingBonId 
            ? { ...bon, chantierId: selectedChantierId } 
            : bon
        )
      )
      
      // Afficher le message de succès avec information sur le PDF
      setUpdateSuccess(true)
      if (result.pdfGenerated) {
        console.log('✅ PDF généré et ajouté aux documents du chantier')
      } else {
        console.log('⚠️ Association réussie mais PDF non généré')
      }
      setTimeout(() => {
        setUpdateSuccess(false)
        setEditingBonId(null)
      }, 3000)
    } catch (error) {
      console.error('❌ Erreur:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'association du bon au chantier'
      toast.error(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  // Supprimer un bon de régie (admin seulement)
  const handleDelete = async (bonId: number) => {
    try {
      const response = await fetch(`/api/bon-regie/${bonId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }))
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }
      
      // Mettre à jour la liste locale
      setBonsRegie(prev => prev.filter(bon => bon.id !== bonId))
      setBonToDelete(null)
      toast.success('Bon de régie supprimé avec succès')
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 w-64 mb-6 rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/3 mb-4 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/2 mb-4 rounded"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/4 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
          {error}
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }
  
  // Calculer les statistiques pour les KPIs
  const totalBons = bonsRegie.length
  const bonsAssocies = bonsRegie.filter(b => b.chantierId).length
  const bonsNonAssocies = bonsRegie.filter(b => !b.chantierId).length

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalBons}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Associés</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{bonsAssocies}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Non associés</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{bonsNonAssocies}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-teal-50/20 to-cyan-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Bons de régie"
        subtitle="Gestion des bons de régie et association aux chantiers"
        icon={DocumentTextIcon}
        badgeColor="from-teal-600 via-cyan-600 to-blue-700"
        gradientColor="from-teal-600/10 via-cyan-600/10 to-blue-700/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareLink}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <ShareIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{copied ? 'Lien copié!' : 'Partager le lien'}</span>
              <span className="sm:hidden">{copied ? 'Copié!' : 'Partager'}</span>
            </button>
            <Link
              href="/public/bon-regie"
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-700 hover:to-cyan-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Nouveau bon de régie</span>
              <span className="sm:hidden">Nouveau</span>
            </Link>
          </div>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {bonsRegie.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
          <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
            Aucun bon de régie enregistré
          </p>
          <Link
            href="/public/bon-regie"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Créer un bon de régie
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bonsRegie.map((bon) => (
            <div
              key={bon.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                <div className="space-y-2 flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {bon.description}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">{bon.nomChantier}</span> - Client: {bon.client}
                  </p>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <span>Dates: {bon.dates}</span>
                      <span>Temps: {bon.tempsChantier || 0}h x {bon.nombreTechniciens || 1} ouvriers</span>
                      <span>
                        Signé par {bon.nomSignataire} le {format(new Date(bon.dateSignature), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  {bon.chantierId ? (
                    <>
                      <div className="inline-flex items-center px-3 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-sm">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Associé à un chantier
                      </div>
                      <Link 
                        href={`/chantiers/${bon.chantierId}/documents`}
                        className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                      >
                        <DocumentTextIcon className="h-4 w-4 mr-1" />
                        Voir dans Documents
                      </Link>
                    </>
                  ) : (
                    <>
                      {editingBonId === bon.id ? (
                        <div className="space-y-2">
                          <div className="relative">
                            <select
                              value={selectedChantierId}
                              onChange={(e) => setSelectedChantierId(e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                            >
                              <option value="">Sélectionner un chantier</option>
                              {chantiers.map((chantier) => (
                                <option key={chantier.chantierId} value={chantier.chantierId}>
                                  {chantier.nomChantier}
                                </option>
                              ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={handleAssociateToChantierId}
                              disabled={!selectedChantierId || updating}
                              className="inline-flex items-center justify-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 w-full"
                            >
                              {updating ? 'Association...' : 'Associer'}
                            </button>
                            <button
                              onClick={() => setEditingBonId(null)}
                              className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600 w-1/3"
                            >
                              Annuler
                            </button>
                          </div>
                          
                          {updateSuccess && (
                            <div className="text-sm text-green-600 dark:text-green-400">
                              ✅ Association réussie! Le PDF a été généré et ajouté aux documents du chantier.
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBonId(bon.id)
                            setSelectedChantierId('')
                          }}
                          className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                        >
                          <LinkIcon className="h-4 w-4 mr-1" />
                          Associer à un chantier
                        </button>
                      )}
                    </>
                  )}
                  
                  <Link
                    href={`/bon-regie/${bon.id}`}
                    className="inline-flex items-center justify-center px-3 py-1 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-1" />
                    Voir détails
                  </Link>
                  
                  {isAdmin && (
                    <button
                      onClick={() => setBonToDelete(bon.id)}
                      className="inline-flex items-center justify-center px-3 py-1 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                      title="Supprimer ce bon de régie"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {bonToDelete && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirmer la suppression
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer ce bon de régie ? Cette action est irréversible.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBonToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(bonToDelete)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
} 
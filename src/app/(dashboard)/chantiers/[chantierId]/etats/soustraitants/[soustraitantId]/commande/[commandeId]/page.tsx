'use client'
import { useState, useEffect, use, useCallback } from 'react';
import { useSession } from 'next-auth/react'
// removed unused useRouter
import { 
  ArrowLeftIcon,
  DocumentCheckIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  HashtagIcon,
  CurrencyEuroIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast' // Toaster déplacé vers RootClientProviders
import Link from 'next/link'
import NumericInput from '@/components/ui/NumericInput'

interface LigneCommande {
  id: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

interface CommandeSousTraitant {
  id: number;
  reference: string;
  dateCommande: string;
  sousTotal: number;
  tauxTVA: number;
  tva: number;
  total: number;
  statut: string;
  estVerrouillee: boolean;
  soustraitantNom: string;
  soustraitantEmail: string;
  lignes: LigneCommande[];
}

export default function CommandeSousTraitantPage(
  props: {
    params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }>
  }
) {
  const params = use(props.params);
  const { data: session } = useSession()
  

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commande, setCommande] = useState<CommandeSousTraitant | null>(null)
  const [ligneEnEdition, setLigneEnEdition] = useState<number | null>(null)
  const [lignesTemp, setLignesTemp] = useState<{[key: number]: LigneCommande}>({})
  const [submitting, setSubmitting] = useState(false)

  const fetchCommande = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}`)
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Commande sous-traitant non trouvée')
        } else {
          throw new Error('Erreur lors de la récupération de la commande sous-traitant')
        }
        return
      }
      
      const data = await response.json()
      setCommande(data)
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [params.chantierId, params.soustraitantId, params.commandeId])

  useEffect(() => {
    if (session) {
      fetchCommande()
    }
  }, [session, fetchCommande])

  const handleEditLigne = (id: number) => {
    if (commande && commande.estVerrouillee) {
      toast.error('La commande est verrouillée et ne peut pas être modifiée')
      return
    }
    
    const ligne = commande?.lignes.find(l => l.id === id)
    if (ligne) {
      setLignesTemp(prev => ({ ...prev, [id]: { ...ligne } }))
      setLigneEnEdition(id)
    }
  }

  const handleCancelEdit = () => {
    setLigneEnEdition(null)
  }

  const handleSaveLigne = async (id: number) => {
    if (!commande) return
    
    const ligne = lignesTemp[id]
    if (!ligne) return
    
    try {
      setSubmitting(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/lignes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: ligne.description,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de la ligne')
      }
      
      // Mettre à jour l'UI
      setCommande({
        ...commande,
        lignes: commande.lignes.map(l => l.id === id ? {
          ...l,
          description: ligne.description,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
          total: ligne.prixUnitaire * ligne.quantite
        } : l)
      })
      
      // Recalculer les totaux
      await fetchCommande()
      
      setLigneEnEdition(null)
      toast.success('Ligne mise à jour avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour de la ligne')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLigne = async (id: number) => {
    if (!commande) return
    
    if (commande.estVerrouillee) {
      toast.error('La commande est verrouillée et ne peut pas être modifiée')
      return
    }
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ligne ?')) {
      return
    }
    
    try {
      setSubmitting(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/lignes/${id}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de la ligne')
      }
      
      // Mettre à jour l'UI
      setCommande({
        ...commande,
        lignes: commande.lignes.filter(l => l.id !== id)
      })
      
      // Recalculer les totaux
      await fetchCommande()
      
      toast.success('Ligne supprimée avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de la ligne')
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (id: number, field: keyof LigneCommande, value: string | number) => {
    setLignesTemp(prev => {
      const ligneTemp = prev[id] || {}
      let nouvelleValeur = value
      
      // Convertir en nombre si nécessaire
      if (field === 'prixUnitaire' || field === 'quantite') {
        nouvelleValeur = parseFloat(value as string) || 0
      }
      
      // Mettre à jour le total
      const updatedLigne = {
        ...ligneTemp,
        [field]: nouvelleValeur
      } as LigneCommande
      
      if (field === 'prixUnitaire' || field === 'quantite') {
        updatedLigne.total = updatedLigne.prixUnitaire * updatedLigne.quantite
      }
      
      return { ...prev, [id]: updatedLigne }
    })
  }

  const handleVerrouillage = async () => {
    if (!commande) return;

    try {
      setSubmitting(true);
      const nouvelEtatVerrouillage = !commande.estVerrouillee;

      // Utiliser les routes dédiées selon l'action
      const endpoint = nouvelEtatVerrouillage 
        ? `validate`  // Route POST /validate pour valider
        : `unlock`;   // Route POST /unlock pour déverrouiller

      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorMessage = `Erreur lors du ${nouvelEtatVerrouillage ? 'verrouillage' : 'déverrouillage'}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Si le corps de la réponse n'est pas JSON ou est vide
        }
        throw new Error(errorMessage);
      }

      // Recharger les données complètes pour avoir toutes les informations à jour (y compris les lignes)
      await fetchCommande();

      toast.success(`Commande ${nouvelEtatVerrouillage ? 'verrouillée' : 'déverrouillée'} avec succès`);

    } catch (error: unknown) {
      console.error('Erreur dans handleVerrouillage:', error);
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error(message || `Une erreur est survenue lors de la tentative de ${commande.estVerrouillee ? 'déverrouillage' : 'verrouillage'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenererPDF = () => {
    if (!commande) return
    
    // Utiliser la nouvelle API moderne avec Puppeteer
    window.open(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/pdf-modern`, '_blank')
  }

  const handleEnvoyerEmail = async () => {
    if (!commande) return
    
    try {
      setSubmitting(true)
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/send-email`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi de l\'email')
      }
      
      toast.success('Email envoyé avec succès')
    } catch {
      console.error('Erreur: envoi email')
      toast.error('Erreur lors de l\'envoi de l\'email')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement de la commande...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-red-200 dark:bg-gray-800/80 dark:border-red-700">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XMarkIcon className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Erreur</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link
            href={`/chantiers/${params.chantierId}/etats`}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Retour
          </Link>
        </div>
      </div>
    </div>
  )

  if (!commande) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-yellow-200 dark:bg-gray-800/80 dark:border-yellow-700">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <DocumentCheckIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-2">Commande introuvable</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">La commande demandée n'existe pas ou n'est plus accessible.</p>
          <Link
            href={`/chantiers/${params.chantierId}/etats`}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Retour
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}
      
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* En-tête avec navigation */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <Link href={`/chantiers/${params.chantierId}/etats`}>
              <button className="p-3 bg-white/80 backdrop-blur-sm border-2 border-gray-200 hover:bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-200 rounded-xl text-gray-600 hover:text-blue-600 dark:bg-gray-800/80 dark:border-gray-700 dark:hover:border-blue-600 dark:text-gray-300 dark:hover:text-blue-400">
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
            </Link>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                  Commande sous-traitant
                </h1>
                {commande.estVerrouillee && (
                  <div className="flex items-center px-3 py-1 bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 rounded-full border border-orange-200 dark:border-orange-700">
                    <LockClosedIcon className="h-4 w-4 text-orange-600 dark:text-orange-400 mr-1" />
                    <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Verrouillée</span>
                  </div>
                )}
              </div>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <DocumentCheckIcon className="h-4 w-4 mr-1 text-blue-500" />
                  <span className="font-medium">{commande.reference || `Commande #${commande.id}`}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <BuildingOfficeIcon className="h-4 w-4 mr-1 text-green-500" />
                  <span className="font-medium">{commande.soustraitantNom}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap text-[0]">
            {commande.estVerrouillee && (
              <>
                <button
                  onClick={handleGenererPDF}
                  disabled={submitting}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-base"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  PDF
                </button>
                
                {commande.soustraitantEmail && (
                  <button
                    onClick={handleEnvoyerEmail}
                    disabled={submitting}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 text-base"
                  >
                    <EnvelopeIcon className="h-5 w-5 mr-2" />
                    Envoyer
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={handleVerrouillage}
              disabled={submitting}
              className={`inline-flex items-center px-6 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50 text-base ${
                commande.estVerrouillee
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {commande.estVerrouillee ? 'Déverrouillage...' : 'Verrouillage...'}
                </>
              ) : (
                <>
                  {commande.estVerrouillee ? (
                    <>
                      <LockOpenIcon className="h-5 w-5 mr-2" />
                      Déverrouiller
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5 mr-2" />
                      Valider et verrouiller
                    </>
                  )}
                </>
              )}
            </button>
            
            {commande.estVerrouillee && (
              <Link
                href={`/chantiers/${params.chantierId}/etats/soustraitants/${params.soustraitantId}/etat/nouveau`}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-base"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Nouvel état
              </Link>
            )}
          </div>
        </div>
        
        {/* Carte principale */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl border-0 dark:bg-gray-800/80 overflow-hidden">
          {/* En-tête de la carte */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <ClipboardDocumentListIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Détail de la commande</h2>
                <p className="text-blue-100 text-sm mt-1">
                  {commande.lignes.length} ligne{commande.lignes.length > 1 ? 's' : ''} • Total: {commande.sousTotal.toLocaleString('fr-FR')} €
                </p>
              </div>
            </div>
          </div>
          
          {/* Tableau des lignes */}
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '120px' }} />
                </colgroup>
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                    <th className="px-4 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center">
                        <HashtagIcon className="h-4 w-4 mr-1" />
                        Art.
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">
                      Description
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-700 dark:text-gray-200">
                      Unité
                    </th>
                    <th className="px-4 py-4 text-right font-semibold text-gray-700 dark:text-gray-200">
                      Quantité
                    </th>
                    <th className="px-4 py-4 text-right font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center justify-end">
                        <CurrencyEuroIcon className="h-4 w-4 mr-1" />
                        P.U.
                      </div>
                    </th>
                    <th className="px-4 py-4 text-right font-semibold text-gray-700 dark:text-gray-200">
                      <div className="flex items-center justify-end">
                        <CurrencyEuroIcon className="h-4 w-4 mr-1" />
                        Total
                      </div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-700 dark:text-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commande.lignes.map((ligne, index) => {
                    const isEditing = ligneEnEdition === ligne.id;
                    const ligneTemp = lignesTemp[ligne.id];
                    
                    return (
                      <tr 
                        key={ligne.id} 
                        className={`
                          border-b border-gray-100 dark:border-gray-700 transition-all duration-200
                          ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750'}
                          ${isEditing 
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-sm' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {ligne.article}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          {isEditing ? (
                            <textarea
                              value={ligneTemp?.description || ''}
                              onChange={(e) => handleInputChange(ligne.id, 'description', e.target.value)}
                              className="w-full px-3 py-2 border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 resize-none"
                              rows={2}
                              placeholder="Description de la ligne..."
                            />
                          ) : (
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {ligne.description}
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">
                            {ligne.unite}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-right">
                          {isEditing ? (
                            <NumericInput
                              value={ligneTemp?.quantite ?? ligne.quantite}
                              onChangeNumber={(val)=> handleInputChange(ligne.id, 'quantite', val)}
                              step="0.01"
                              className="w-20 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                            />
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {ligne.quantite.toLocaleString('fr-FR')}
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 text-right">
                          {isEditing ? (
                            <NumericInput
                              value={ligneTemp?.prixUnitaire ?? ligne.prixUnitaire}
                              onChangeNumber={(val)=> handleInputChange(ligne.id, 'prixUnitaire', val)}
                              step="0.01"
                              className="w-24 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                            />
                          ) : (
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {ligne.prixUnitaire.toLocaleString('fr-FR')} €
                            </span>
                          )}
                        </td>
                        
                        <td className="px-4 py-4 text-right">
                          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            {isEditing && ligneTemp
                              ? (ligneTemp.prixUnitaire * ligneTemp.quantite).toLocaleString('fr-FR')
                              : ligne.total.toLocaleString('fr-FR')
                            } €
                          </span>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex justify-center space-x-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveLigne(ligne.id)}
                                  disabled={submitting}
                                  className="p-2 bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 rounded-lg transition-all duration-200 disabled:opacity-50"
                                  title="Enregistrer"
                                >
                                  <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={submitting}
                                  className="p-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 disabled:opacity-50"
                                  title="Annuler"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {!commande.estVerrouillee && (
                                  <>
                                    <button
                                      onClick={() => handleEditLigne(ligne.id)}
                                      disabled={submitting}
                                      className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 rounded-lg transition-all duration-200 disabled:opacity-50"
                                      title="Modifier"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLigne(ligne.id)}
                                      disabled={submitting}
                                      className="p-2 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-700 rounded-lg transition-all duration-200 disabled:opacity-50"
                                      title="Supprimer"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Section résumé financier simplifiée (sans TTC) */}
          <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-end">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 min-w-80">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-200 font-semibold">Total HT</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white">{commande.sousTotal.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
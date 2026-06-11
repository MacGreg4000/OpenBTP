'use client'
import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

interface LigneTarif {
  id: string
  type: string
  article: string | null
  descriptif: string
  unite: string | null
  prixUnitaire: number | null
  remarques: string | null
}

export default function CommandeSousTraitantPage(
  props: {
    params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }>
  }
) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()
  

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commande, setCommande] = useState<CommandeSousTraitant | null>(null)
  const [ligneEnEdition, setLigneEnEdition] = useState<number | null>(null)
  const [lignesTemp, setLignesTemp] = useState<{[key: number]: LigneCommande}>({})
  const [submitting, setSubmitting] = useState(false)
  const [deletingCommande, setDeletingCommande] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [tarifsPanelOpen, setTarifsPanelOpen] = useState(false)
  const [tarifs, setTarifs] = useState<LigneTarif[]>([])
  const [tarifsLoading, setTarifsLoading] = useState(false)
  const [tarifsSearch, setTarifsSearch] = useState('')

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

  const openTarifsPanel = async () => {
    setTarifsPanelOpen(true)
    if (tarifs.length > 0) return
    setTarifsLoading(true)
    try {
      const res = await fetch(`/api/sous-traitants/${params.soustraitantId}/tarifs`)
      const data = await res.json()
      setTarifs(Array.isArray(data) ? data : [])
    } catch {
      setTarifs([])
    } finally {
      setTarifsLoading(false)
    }
  }

  const filteredTarifs = useMemo(() => {
    if (!tarifsSearch.trim()) return tarifs
    const q = tarifsSearch.toLowerCase()
    return tarifs.filter(t =>
      t.descriptif.toLowerCase().includes(q) ||
      t.article?.toLowerCase().includes(q) ||
      t.remarques?.toLowerCase().includes(q)
    )
  }, [tarifs, tarifsSearch])

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

  const addLigneWithType = async (type: 'QP' | 'FF' | 'TITRE' | 'SOUS_TITRE') => {
    if (!commande) return
    const isSectionType = type === 'TITRE' || type === 'SOUS_TITRE'
    const ordre = commande.lignes.length
    try {
      const res = await fetch(
        `/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}/lignes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article: isSectionType ? '' : '',
            description: type === 'TITRE' ? 'Nouveau titre' : type === 'SOUS_TITRE' ? 'Nouveau sous-titre' : 'Nouvelle ligne',
            type,
            unite: isSectionType ? '' : 'U',
            prixUnitaire: 0,
            quantite: isSectionType ? 0 : 1,
            ordre
          })
        }
      )
      if (!res.ok) throw new Error('Erreur création ligne')
      const nouvelleLigne = await res.json()
      setCommande(prev => {
        if (!prev) return prev
        return {
          ...prev,
          lignes: [
            ...prev.lignes,
            {
              id: nouvelleLigne.id as number,
              ordre,
              article: nouvelleLigne.article as string || '',
              description: nouvelleLigne.description as string || '',
              type: nouvelleLigne.type as string || type,
              unite: nouvelleLigne.unite as string || '',
              prixUnitaire: typeof nouvelleLigne.prixUnitaire === 'string' ? parseFloat(nouvelleLigne.prixUnitaire) : (nouvelleLigne.prixUnitaire as number) || 0,
              quantite: typeof nouvelleLigne.quantite === 'string' ? parseFloat(nouvelleLigne.quantite) : (nouvelleLigne.quantite as number) || 0,
              total: typeof nouvelleLigne.total === 'string' ? parseFloat(nouvelleLigne.total) : (nouvelleLigne.total as number) || 0,
            }
          ]
        }
      })
      // Passer en édition immédiatement pour les lignes normales
      if (!isSectionType) {
        setLigneEnEdition(nouvelleLigne.id as number)
      }
    } catch {
      toast.error('Erreur lors de l\'ajout de la ligne')
    }
  }

  const addLigne = () => addLigneWithType('QP')
  const addTitreLigne = () => addLigneWithType('TITRE')
  const addSousTitreLigne = () => addLigneWithType('SOUS_TITRE')

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
          // Si le corps de la réponse n'est pas JSON, essayer de lire le texte
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage = errorText;
            }
          } catch {
            // Si même le texte ne peut pas être lu, utiliser le message par défaut
          }
        }
        throw new Error(errorMessage);
      }

      // La réponse est OK, recharger les données complètes pour avoir toutes les informations à jour (y compris les lignes)
      // On ne parse pas la réponse car elle peut ne pas contenir toutes les données (pas de lignes)
      // fetchCommande() récupérera toutes les données complètes
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

  const handleDeleteCommande = async () => {
    setShowDeleteModal(false)
    try {
      setDeletingCommande(true)
      const response = await fetch(
        `/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes/${params.commandeId}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la suppression')
      }
      toast.success('Commande supprimée avec succès')
      router.push(`/chantiers/${params.chantierId}/etats`)
    } catch (error: unknown) {
      console.error('Erreur:', error)
      const message = error instanceof Error ? error.message : 'Une erreur est survenue'
      toast.error(message)
    } finally {
      setDeletingCommande(false)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}

      {/* Modale de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 border border-red-200 dark:border-red-700">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Supprimer la commande
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Vous êtes sur le point de supprimer la commande&nbsp;
                  <strong className="text-gray-900 dark:text-white">{commande.reference || `#${commande.id}`}</strong> de&nbsp;
                  <strong className="text-gray-900 dark:text-white">{commande.soustraitantNom}</strong>.
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  Cette action est irréversible. Les lignes de commande seront également supprimées.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deletingCommande}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteCommande}
                disabled={deletingCommande}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow transition disabled:opacity-50"
              >
                {deletingCommande ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Confirmer la suppression
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/60 via-orange-600/60 to-amber-700/60 dark:from-orange-500/30 dark:via-orange-600/30 dark:to-amber-700/30" />
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/chantiers/${params.chantierId}/etats`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm text-white shadow-sm shadow-orange-900/30 hover:bg-white/30 transition"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">Retour</span>
                  </Link>

                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30 text-white">
                    <ClipboardDocumentListIcon className="h-5 w-5 mr-3" />
                    <span className="text-base sm:text-lg font-bold">Commande sous-traitant</span>
                  </div>

                  {commande.estVerrouillee && (
                    <span className="inline-flex items-center px-3 py-1 bg-white/25 text-white border border-white/40 rounded-full text-xs font-semibold shadow-sm">
                      <LockClosedIcon className="h-4 w-4 mr-1" />
                      Verrouillée
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/90">
                  <span className="inline-flex items-center gap-2">
                    <DocumentCheckIcon className="h-4 w-4" />
                    {commande.reference || `Commande #${commande.id}`}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <BuildingOfficeIcon className="h-4 w-4" />
                    {commande.soustraitantNom}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CurrencyEuroIcon className="h-4 w-4" />
                    {commande.total.toLocaleString('fr-FR')} € TTC
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {session?.user?.role === 'ADMIN' && (
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    disabled={deletingCommande || submitting}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/80 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-red-600/90 transition disabled:opacity-60"
                    title="Supprimer la commande (admin uniquement)"
                  >
                    <TrashIcon className="h-5 w-5" />
                    Supprimer
                  </button>
                )}

                {commande.estVerrouillee && (
                  <>
                    <button
                      onClick={handleGenererPDF}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition disabled:opacity-60"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      PDF
                    </button>

                    {commande.soustraitantEmail && (
                      <button
                        onClick={handleEnvoyerEmail}
                        disabled={submitting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition disabled:opacity-60"
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                        Envoyer
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={tarifsPanelOpen ? () => setTarifsPanelOpen(false) : openTarifsPanel}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg ${
                    tarifsPanelOpen
                      ? 'bg-white text-blue-700 shadow-inner'
                      : 'bg-white/25 backdrop-blur-sm text-white hover:bg-white/35'
                  }`}
                >
                  <ClipboardDocumentListIcon className="h-5 w-5" />
                  {tarifsPanelOpen ? 'Fermer tarifs' : 'Tarifs ST'}
                </button>

                <button
                  onClick={handleVerrouillage}
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition disabled:opacity-60 ${
                    commande.estVerrouillee
                      ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      {commande.estVerrouillee ? 'Déverrouillage...' : 'Validation...'}
                    </>
                  ) : commande.estVerrouillee ? (
                    <>
                      <LockOpenIcon className="h-5 w-5" />
                      Déverrouiller
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5" />
                      Valider et verrouiller
                    </>
                  )}
                </button>

                {commande.estVerrouillee && (
                  <Link
                    href={`/chantiers/${params.chantierId}/etats/soustraitants/${params.soustraitantId}/etat/nouveau`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition"
                  >
                    <PlusIcon className="h-5 w-5" />
                    Nouvel état
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8">
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 rounded-full text-sm font-semibold">
                    <ClipboardDocumentListIcon className="h-4 w-4" />
                    Lignes de commande
                  </span>
                  <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    {commande.lignes.length} ligne{commande.lignes.length > 1 ? 's' : ''}
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Total HT : {commande.sousTotal.toLocaleString('fr-FR')} €
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <colgroup>
                    <col style={{ width: '80px' }} />
                    <col />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '140px' }} />
                    <col style={{ width: '160px' }} />
                    <col style={{ width: '120px' }} />
                  </colgroup>
                  <thead className="bg-gray-50 dark:bg-gray-800/70">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Art.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Unité</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Quantité</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">P.U.</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Total</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {commande.lignes.map((ligne, index) => {
                      const isEditing = ligneEnEdition === ligne.id;
                      const ligneTemp = lignesTemp[ligne.id];

                      return (
                        <tr
                          key={ligne.id}
                          className={`transition-colors ${
                            isEditing
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : index % 2 === 0
                                ? 'bg-white dark:bg-gray-800'
                                : 'bg-gray-50 dark:bg-gray-800/80'
                          }`}
                        >
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                              {ligne.article}
                            </span>
                          </td>
                          <td className="px-4 py-4 align-top">
                            {isEditing ? (
                              <textarea
                                value={ligneTemp?.description || ''}
                                onChange={(e) => handleInputChange(ligne.id, 'description', e.target.value)}
                                className="w-full px-3 py-2 text-sm border-2.border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ligne.description}</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-center text-sm text-gray-600 dark:text-gray-300">
                            {ligne.unite}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isEditing ? (
                              <NumericInput
                                value={ligneTemp?.quantite ?? ligne.quantite}
                                onChangeNumber={(val) => handleInputChange(ligne.id, 'quantite', val)}
                                step="0.01"
                                className="w-24 px-3 py-2 text-sm text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              />
                            ) : (
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{ligne.quantite.toLocaleString('fr-FR')}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            {isEditing ? (
                              <NumericInput
                                value={ligneTemp?.prixUnitaire ?? ligne.prixUnitaire}
                                onChangeNumber={(val) => handleInputChange(ligne.id, 'prixUnitaire', val)}
                                step="0.01"
                                className="w-24 px-3 py-2 text-sm text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                              />
                            ) : (
                              <span className="font-semibold text-gray-900 dark:text-gray-100">{ligne.prixUnitaire.toLocaleString('fr-FR')} €</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="font-bold text-gray-900 dark:text-gray-100">
                              {isEditing && ligneTemp
                                ? (ligneTemp.prixUnitaire * ligneTemp.quantite).toLocaleString('fr-FR')
                                : ligne.total.toLocaleString('fr-FR')
                              } €
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() => handleSaveLigne(ligne.id)}
                                    disabled={submitting}
                                    className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 transition disabled:opacity-50"
                                    title="Enregistrer"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    disabled={submitting}
                                    className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition disabled:opacity-50"
                                    title="Annuler"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </>
                              ) : (
                                !commande.estVerrouillee && (
                                  <>
                                    <button
                                      onClick={() => handleEditLigne(ligne.id)}
                                      disabled={submitting}
                                      className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 transition disabled:opacity-50"
                                      title="Modifier"
                                    >
                                      <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteLigne(ligne.id)}
                                      disabled={submitting}
                                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 transition disabled:opacity-50"
                                      title="Supprimer"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!commande.estVerrouillee && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-600/10 via-blue-700/10 to-indigo-800/10 dark:from-blue-600/5 dark:via-blue-700/5 dark:to-indigo-800/5">
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={addTitreLigne}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-blue-900 dark:text-white bg-white/70 dark:bg-white/10 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md"
                    >
                      <span className="text-lg leading-none font-bold">T</span>
                      Ajouter un titre
                    </button>
                    <button
                      onClick={addSousTitreLigne}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-blue-900 dark:text-white bg-white/60 dark:bg-white/10 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-md"
                    >
                      <span className="text-base leading-none italic">t</span>
                      Ajouter un sous-titre
                    </button>
                    <button
                      onClick={addLigne}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <PlusIcon className="h-5 w-5" />
                      Ajouter une ligne
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informations générales</h2>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Référence</label>
                    <input
                      type="text"
                      value={commande.reference || ''}
                      onChange={(e) => setCommande({ ...commande, reference: e.target.value })}
                      disabled={commande.estVerrouillee}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition"
                      placeholder="Référence de la commande"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <input
                      type="date"
                      value={commande.dateCommande ? new Date(commande.dateCommande).toISOString().slice(0, 10) : ''}
                      onChange={(e) => setCommande({ ...commande, dateCommande: e.target.value })}
                      disabled={commande.estVerrouillee}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paramètres</h2>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Taux de TVA (%)</label>
                  <div className="relative">
                    <select
                      value={commande.tauxTVA}
                      onChange={(e) => {
                        const newTauxTVA = parseFloat(e.target.value);
                        const newTVA = commande.sousTotal * (newTauxTVA / 100);
                        const newTotal = commande.sousTotal + newTVA;
                        setCommande({
                          ...commande,
                          tauxTVA: newTauxTVA,
                          tva: newTVA,
                          total: newTotal
                        });
                      }}
                      disabled={commande.estVerrouillee}
                      className="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition"
                    >
                      <option value="0">0%</option>
                      <option value="6">6%</option>
                      <option value="21">21%</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Résumé financier</h2>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">Sous-total HT</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{commande.sousTotal.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-300">TVA ({commande.tauxTVA}%)</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{commande.tva.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total TTC</span>
                    <span className="text-xl font-bold text-orange-600 dark:text-orange-300">{commande.total.toLocaleString('fr-FR')} €</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {tarifsPanelOpen && (
        <div className="fixed top-0 right-0 h-full w-80 z-40 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="min-w-0">
              <p className="text-xs opacity-75">Liste de prix</p>
              <p className="font-semibold text-sm truncate">{commande?.soustraitantNom}</p>
            </div>
            <button onClick={() => setTarifsPanelOpen(false)} className="ml-2 p-1 rounded hover:bg-white/20 transition">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <input
              type="text"
              placeholder="Rechercher..."
              value={tarifsSearch}
              onChange={e => setTarifsSearch(e.target.value)}
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {tarifsLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Chargement...</div>
            ) : filteredTarifs.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">
                {tarifsSearch ? 'Aucun résultat' : 'Aucune ligne de tarif'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredTarifs.map(tarif => {
                  if (tarif.type === 'TITRE') return (
                    <div key={tarif.id} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">{tarif.descriptif}</p>
                    </div>
                  )
                  if (tarif.type === 'SOUS_TITRE') return (
                    <div key={tarif.id} className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-semibold italic text-gray-500 dark:text-gray-400">{tarif.descriptif}</p>
                    </div>
                  )
                  return (
                    <div key={tarif.id} className="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {tarif.article && <p className="text-[10px] font-mono text-gray-400 mb-0.5">{tarif.article}</p>}
                          <p className="text-sm text-gray-900 dark:text-white leading-snug">{tarif.descriptif}</p>
                          {tarif.remarques && <p className="text-xs text-gray-400 mt-0.5 italic">{tarif.remarques}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {tarif.prixUnitaire != null && (
                            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              {tarif.prixUnitaire.toLocaleString('fr-FR')} €
                            </p>
                          )}
                          {tarif.unite && <p className="text-xs text-gray-400">{tarif.unite}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <p className="text-xs text-gray-400 text-center">
              {tarifs.filter(t => t.type === 'LIGNE').length} articles dans la liste de prix
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 
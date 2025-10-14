'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  DocumentCheckIcon,
  CheckIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast' // Toaster déplacé vers RootClientProviders
import Link from 'next/link'
import EtatAvancementUnifie from '@/components/etat-avancement/EtatAvancementUnifie'
import { SoustraitantEtat, AvenantSoustraitantEtat } from '@/types/etat-avancement'

interface CommandeSousTraitant {
  id: number;
  reference: string;
  soustraitantNom: string;
  lignes: {
    id: number;
    article: string;
    description: string;
    type: string;
    unite: string;
    prixUnitaire: number;
    quantite: number;
    total: number;
  }[];
}

export default function NouvelEtatAvancementPage(
  props: {
    params: Promise<{ chantierId: string; soustraitantId: string }>
  }
) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commandeValidee, setCommandeValidee] = useState<CommandeSousTraitant | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<SoustraitantEtat | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingEtatId, setEditingEtatId] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Vérifier si on édite un état existant (paramètre URL)
        const urlParams = new URLSearchParams(window.location.search)
        const etatId = urlParams.get('etatId')
        setEditingEtatId(etatId)
        
        if (etatId && etatId !== '0') {
          // Mode édition : charger l'état existant
          const etatResponse = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatId}`)
          
          if (!etatResponse.ok) {
            throw new Error('Erreur lors de la récupération de l\'état d\'avancement')
          }
          
          const etatData = await etatResponse.json()
          console.log('État existant chargé:', etatData)
          
          setEtatAvancement(etatData)
          setLoading(false)
          return
        }
        
        // Mode création : récupérer la commande sous-traitant validée
        const commandesResponse = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/commandes`)
        
        if (!commandesResponse.ok) {
          throw new Error('Erreur lors de la récupération des commandes sous-traitant')
        }
        
        const commandes = await commandesResponse.json()
        console.log('Commandes récupérées:', commandes)
        
        const commandeValidee = commandes.find((c: { estVerrouillee: boolean }) => c.estVerrouillee)
        
        if (!commandeValidee) {
          setError('Aucune commande sous-traitant validée trouvée pour ce sous-traitant')
          setLoading(false)
          return
        }

        // Vérifier si la commande a des lignes
        if (!commandeValidee.lignes || !Array.isArray(commandeValidee.lignes) || commandeValidee.lignes.length === 0) {
          console.error('La commande ne contient pas de lignes valides:', commandeValidee)
          setError('Commande invalide ou sans lignes')
          setLoading(false)
          return
        }
        
        console.log('Commande validée avec lignes:', commandeValidee)
        setCommandeValidee(commandeValidee)
        
        // 2. Récupérer le dernier état d'avancement
        const etatsResponse = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement`)
        
        let dernierEtat: { numero: number; estFinalise: boolean; lignes?: Array<{ article: string; quantiteTotale: number; montantTotal: number }> } | null = null
        
        if (etatsResponse.ok) {
          const etats = await etatsResponse.json()
          
          if (etats && etats.length > 0) {
            dernierEtat = etats.reduce((max: { numero: number }, etat: { numero: number }) => 
              etat.numero > max.numero ? etat : max, etats[0]) as typeof dernierEtat
            
            if (!dernierEtat.estFinalise) {
              setError('L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état')
              setLoading(false)
              return
            }
          }
        }
        
        // 3. Préparer le nouvel état d'avancement au format unifié
        const nouvelEtat: SoustraitantEtat = {
          id: 0, // Temporaire pour la création
          chantierId: params.chantierId,
          soustraitantId: params.soustraitantId,
          numero: dernierEtat ? dernierEtat.numero + 1 : 1,
          date: new Date(),
          commentaires: '',
          estFinalise: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: session?.user?.email || '',
          commandeSousTraitantId: commandeValidee.id,
          avenants: [],
          lignes: commandeValidee.lignes.map((ligne: { article: string; description: string; type?: string; unite: string; prixUnitaire: number; quantite: number }, index: number) => {
            const lignePrecedente = dernierEtat?.lignes?.find((l) => l.article === ligne.article)
            
            const quantitePrecedente = lignePrecedente ? lignePrecedente.quantiteTotale : 0
            const montantPrecedent = lignePrecedente ? lignePrecedente.montantTotal : 0
            
            return {
              id: -(index + 1), // ID temporaire négatif unique (pour éviter conflit avec vrais IDs)
              soustraitantEtatId: 0,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type || 'QP',
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: quantitePrecedente,
              quantiteActuelle: 0,
              quantiteTotale: quantitePrecedente,
              montantPrecedent: montantPrecedent,
              montantActuel: 0,
              montantTotal: montantPrecedent,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
        }
        
        setEtatAvancement(nouvelEtat)
        setLoading(false)
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
        setError('Erreur lors du chargement des données')
        setLoading(false)
      }
    }
    
    if (session) {
      fetchData()
    }
  }, [session, params.chantierId, params.soustraitantId])

  const handleSaveEtat = async (finalise: boolean = false) => {
    if (!etatAvancement) return
    
    try {
      setSaving(true)
      
      const dataToSend = {
        soustraitantId: params.soustraitantId,
        numero: etatAvancement.numero,
        date: etatAvancement.date,
        commentaires: etatAvancement.commentaires || '',
        estFinalise: finalise,
        lignes: etatAvancement.lignes.map(ligne => ({
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: ligne.prixUnitaire,
          quantite: ligne.quantite,
          quantitePrecedente: ligne.quantitePrecedente,
          quantiteActuelle: ligne.quantiteActuelle,
          quantiteTotale: ligne.quantiteTotale,
          montantPrecedent: ligne.montantPrecedent,
          montantActuel: ligne.montantActuel,
          montantTotal: ligne.montantTotal
        })),
        avenants: etatAvancement.avenants
      }
      
      let response;
      
      if (editingEtatId && editingEtatId !== '0') {
        // Mode édition : utiliser PUT
        response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${editingEtatId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            commentaires: etatAvancement.commentaires || '',
            estFinalise: finalise
          }),
        })
      } else {
        // Mode création : utiliser POST
        response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        })
      }
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }
      
      const savedEtat = await response.json()
      
      toast.success(finalise ? 'État d\'avancement finalisé avec succès' : 'État d\'avancement sauvegardé avec succès')
      
      if (editingEtatId && editingEtatId !== '0') {
        // Mode édition : rester sur la page, mettre à jour l'état
        setEtatAvancement(savedEtat)
      } else {
        // Mode création : rediriger vers la page d'édition de l'état créé  
        router.push(`/chantiers/${params.chantierId}/etats/soustraitants/${params.soustraitantId}/etat/${savedEtat.id}`)
      }
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleReopenEtat = async () => {
    if (!etatAvancement || !editingEtatId) return
    
    try {
      setValidating(true)
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${editingEtatId}/rouvrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la réouverture de l\'état d\'avancement')
      }
      
      const updatedEtat = await response.json()
      setEtatAvancement(updatedEtat)
      
      toast.success('État d\'avancement réouvert avec succès !')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la réouverture')
    } finally {
      setValidating(false)
    }
  }

  const handleValidation = async () => {
    return handleSaveEtat(true)
  }

  const handleGenererPDF = async () => {
    if (!etatAvancement || etatAvancement.id <= 0) return
    
    try {
      toast.loading('Génération du PDF en cours...', { id: 'pdf-generation' })
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats-avancement/${etatAvancement.id}/pdf-modern`, {
        method: 'GET',
        signal: AbortSignal.timeout(90000) // 90 secondes
      })

      if (!response.ok) {
        toast.dismiss('pdf-generation')
        let errorMessage = 'Erreur lors de la génération du PDF'
        try {
          const errorData = await response.json()
          if (errorData?.error) {
            errorMessage = errorData.error
          }
        } catch (e) {
          console.error('Impossible de parser l\'erreur:', e)
        }
        toast.error(errorMessage)
        throw new Error(errorMessage)
      }

      const blob = await response.blob()
      
      if (blob.size === 0) {
        toast.dismiss('pdf-generation')
        toast.error('Le PDF généré est vide')
        return
      }

      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `etat-avancement-soustraitant-${params.chantierId}-n${etatAvancement.numero}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.dismiss('pdf-generation')
      toast.success('PDF téléchargé avec succès')
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      toast.dismiss('pdf-generation')
      toast.error('Erreur lors de la génération du PDF')
    }
  }

  const handleCommentairesChange = (commentaires: string) => {
    if (etatAvancement) {
      setEtatAvancement({
        ...etatAvancement,
        commentaires
      })
    }
  }

  const handleQuantitesChange = (quantites: { [key: number]: number }) => {
    if (etatAvancement) {
      const lignesModifiees = etatAvancement.lignes.map(ligne => ({
        ...ligne,
        quantiteActuelle: quantites[ligne.id] ?? ligne.quantiteActuelle,
        quantiteTotale: (quantites[ligne.id] ?? ligne.quantiteActuelle) + ligne.quantitePrecedente,
        montantActuel: (quantites[ligne.id] ?? ligne.quantiteActuelle) * ligne.prixUnitaire,
        montantTotal: ((quantites[ligne.id] ?? ligne.quantiteActuelle) * ligne.prixUnitaire) + ligne.montantPrecedent
      }))
      
      setEtatAvancement({
        ...etatAvancement,
        lignes: lignesModifiees
      })
    }
  }

  const handleAvenantsChange = (avenants: Array<
    Omit<AvenantSoustraitantEtat, 'soustraitantEtatId' | 'createdAt' | 'updatedAt'> & Partial<Pick<AvenantSoustraitantEtat, 'soustraitantEtatId' | 'createdAt' | 'updatedAt'>>
  >) => {
    if (etatAvancement) {
      const normalized: AvenantSoustraitantEtat[] = avenants.map((a) => ({
        id: a.id,
        soustraitantEtatId: a.soustraitantEtatId ?? 0,
        article: a.article,
        description: a.description,
        type: a.type,
        unite: a.unite,
        prixUnitaire: a.prixUnitaire,
        quantite: a.quantite,
        quantiteActuelle: a.quantiteActuelle,
        quantitePrecedente: a.quantitePrecedente,
        quantiteTotale: a.quantiteTotale,
        montantPrecedent: a.montantPrecedent,
        montantActuel: a.montantActuel,
        montantTotal: a.montantTotal,
        createdAt: a.createdAt ?? new Date(),
        updatedAt: a.updatedAt ?? new Date(),
      }))

      setEtatAvancement({
        ...etatAvancement,
        avenants: normalized,
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Chargement des données...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 text-center border border-red-200 dark:bg-gray-800/80 dark:border-red-700">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XMarkIcon className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Erreur</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <Link
              href={`/chantiers/${params.chantierId}/etats/soustraitants`}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Retour
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!etatAvancement) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  {editingEtatId && editingEtatId !== '0' ? 'Éditer état d\'avancement sous-traitant' : 'Nouvel état d\'avancement sous-traitant'}
                </h1>
                <div className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full border border-blue-200 dark:border-blue-700">
                  <DocumentCheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-1" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">État #{etatAvancement.numero}</span>
                </div>
              </div>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{commandeValidee?.soustraitantNom}</span>
                </div>
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Commande: {commandeValidee?.reference}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {etatAvancement.id > 0 && (
              <button
                onClick={handleGenererPDF}
                disabled={saving || validating}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                PDF
              </button>
            )}
            
            {!etatAvancement.estFinalise ? (
              <button
                onClick={handleValidation}
                disabled={saving || validating}
                className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
              >
                {saving || validating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    {editingEtatId && editingEtatId !== '0' ? 'Validation...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    {editingEtatId && editingEtatId !== '0' ? 'Valider l\'état' : 'Créer l\'état d\'avancement'}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleReopenEtat}
                disabled={saving || validating}
                className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Réouverture...
                  </>
                ) : (
                  <>
                    <PencilSquareIcon className="h-5 w-5 mr-2" />
                    Réouvrir l'état
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Composant unifié pour l'état d'avancement */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <EtatAvancementUnifie
            etat={etatAvancement}
            type="soustraitant"
            chantierId={params.chantierId}
            etatId={etatAvancement.id.toString()}
            soustraitantId={params.soustraitantId}
            onCommentairesChange={handleCommentairesChange}
            onQuantitesChange={handleQuantitesChange}
            onAvenantsChange={handleAvenantsChange}
          />
        </div>
      </div>
    </div>
  )
} 
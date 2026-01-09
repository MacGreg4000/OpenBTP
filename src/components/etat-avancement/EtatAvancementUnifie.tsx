'use client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { EtatAvancement, SoustraitantEtat, EtatAvancementSummary, AvenantEtatAvancement, AvenantSoustraitantEtat } from '@/types/etat-avancement'
import { TrashIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import NumericInput from '@/components/ui/NumericInput'
import { roundToTwoDecimals } from '@/utils/calculs'

// Fonction helper pour formater les montants avec 2 décimales
const formatMontant = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface EtatAvancementUnifieProps {
  etat: EtatAvancement | SoustraitantEtat
  type: 'client' | 'soustraitant'
  chantierId: string
  etatId: string
  soustraitantId?: string
  onCommentairesChange?: (commentaires: string) => void
  onQuantitesChange?: (quantites: { [key: number]: number }) => void
  onAvenantsChange?: (avenants: (AvenantEtatAvancement | AvenantSoustraitantEtat)[]) => void
}

export default function EtatAvancementUnifie({
  etat,
  type,
  chantierId,
  etatId,
  soustraitantId,
  onCommentairesChange,
  onQuantitesChange,
  onAvenantsChange,
}: EtatAvancementUnifieProps) {
  const router = useRouter()
  const [isEditingComments, setIsEditingComments] = useState(false)

  // Fonction utilitaire pour vérifier le type d'avenant
  // const isAvenantClient = (avenant: AvenantEtatAvancement | AvenantSoustraitantEtat): avenant is AvenantEtatAvancement => {
  //   return 'etatAvancementId' in avenant
  // }
  const [commentaires, setCommentaires] = useState(etat.commentaires || '')
  const [summary, setSummary] = useState<EtatAvancementSummary>({
    totalCommandeInitiale: { precedent: 0, actuel: 0, total: 0 },
    totalAvenants: { precedent: 0, actuel: 0, total: 0 },
    totalGeneral: { precedent: 0, actuel: 0, total: 0 }
  })
  const [quantites, setQuantites] = useState<{ [key: number]: number }>({})
  const [avenants, setAvenants] = useState<(AvenantEtatAvancement | AvenantSoustraitantEtat)[]>(etat.avenants)
  interface AvenantValues {
    article: string;
    description: string;
    type: string;
    unite: string;
    prixUnitaire: number;
    quantite: number;
    quantiteActuelle: number;
    quantitePrecedente: number;
    quantiteTotale: number;
    montantPrecedent: number;
    montantActuel: number;
    montantTotal: number;
  }
  
  const [avenantValues, setAvenantValues] = useState<Record<number, AvenantValues>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [debounceTimers, setDebounceTimers] = useState<Record<string, NodeJS.Timeout>>({})

  // ID sous-traitant résolu et stable
  const resolvedSoustraitantId = useMemo(() => (
    soustraitantId ?? (etat as SoustraitantEtat).soustraitantId
  ), [soustraitantId, etat])

  // Construire l'URL de base selon le type (stabilisé pour hooks)
  const getBaseApiUrl = useCallback(() => {
    if (type === 'soustraitant') {
      return `/api/chantiers/${chantierId}/soustraitants/${resolvedSoustraitantId}/etats-avancement`
    }
    return `/api/chantiers/${chantierId}/etats-avancement`
  }, [type, resolvedSoustraitantId, chantierId])

  // Choisir l'etatId effectif (soustraitant utilise l'ID numérique réel)
  const effectiveEtatId = type === 'soustraitant' ? String(etat.id) : etatId
  
  // Pour les nouveaux états (id = 0), désactiver les modifications
  const isNewEtat = effectiveEtatId === '0' || etat.id === 0

  // Mettre à jour les commentaires lorsque etat change
  useEffect(() => {
    setCommentaires(etat.commentaires || '');
  }, [etat]);

  // Utiliser une référence pour suivre si c'est le premier chargement
  const isInitialMount = useRef(true)
  const previousEtatId = useRef<number | null>(null)

  useEffect(() => {
    // Ne réinitialiser que si l'ID de l'état change (nouvel état) ou au premier chargement
    const currentEtatId = etat.id
    const shouldReinitialize = isInitialMount.current || previousEtatId.current !== currentEtatId

    if (shouldReinitialize) {
      // Initialiser les quantités avec les valeurs actuelles
      const initialQuantites = etat.lignes.reduce((acc, ligne) => {
        acc[ligne.id] = ligne.quantiteActuelle || 0
        return acc
      }, {} as { [key: number]: number })
      setQuantites(initialQuantites)

      // Initialiser les valeurs des avenants
      const initialAvenantValues = etat.avenants.reduce((acc, avenant) => {
        acc[avenant.id] = {
          article: avenant.article || '',
          description: avenant.description || '',
          type: avenant.type || 'QP',
          unite: avenant.unite || 'Pièces',
          prixUnitaire: avenant.prixUnitaire || 0,
          quantite: avenant.quantite || 0,
          quantiteActuelle: avenant.quantiteActuelle || 0,
          quantitePrecedente: avenant.quantitePrecedente || 0,
          quantiteTotale: avenant.quantiteTotale || 0,
          montantPrecedent: avenant.montantPrecedent || 0,
          montantActuel: avenant.montantActuel || 0,
          montantTotal: avenant.montantTotal || 0
        }
        return acc
      }, {} as typeof avenantValues)
      
      setAvenantValues(initialAvenantValues)
      setAvenants(etat.avenants)
      
      previousEtatId.current = currentEtatId
      isInitialMount.current = false
    } else {
      // Mettre à jour seulement les nouvelles lignes/avenants sans écraser les valeurs existantes
      setQuantites(prev => {
        const updated = { ...prev }
        etat.lignes.forEach(ligne => {
          // Ne mettre à jour que si la ligne n'existe pas déjà dans l'état local
          if (!(ligne.id in updated)) {
            updated[ligne.id] = ligne.quantiteActuelle || 0
          }
        })
        return updated
      })

      setAvenantValues(prev => {
        const updated = { ...prev }
        etat.avenants.forEach(avenant => {
          if (!(avenant.id in updated)) {
            updated[avenant.id] = {
              article: avenant.article || '',
              description: avenant.description || '',
              type: avenant.type || 'QP',
              unite: avenant.unite || 'Pièces',
              prixUnitaire: avenant.prixUnitaire || 0,
              quantite: avenant.quantite || 0,
              quantiteActuelle: avenant.quantiteActuelle || 0,
              quantitePrecedente: avenant.quantitePrecedente || 0,
              quantiteTotale: avenant.quantiteTotale || 0,
              montantPrecedent: avenant.montantPrecedent || 0,
              montantActuel: avenant.montantActuel || 0,
              montantTotal: avenant.montantTotal || 0
            }
          }
        })
        return updated
      })

      setAvenants(etat.avenants)
    }
  }, [etat])

  // Utilisation de useMemo pour éviter les recalculs inutiles et les boucles
  const memoizedCalculatedLignes = useMemo(() => {
    return etat.lignes.map(ligne => {
      const quantiteActuelle = quantites[ligne.id] ?? ligne.quantiteActuelle
      const quantiteTotale = quantiteActuelle + ligne.quantitePrecedente
      const montantActuel = roundToTwoDecimals(quantiteActuelle * ligne.prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + ligne.montantPrecedent)
  
      return {
        ...ligne,
        quantiteActuelle,
        quantiteTotale,
        montantActuel,
        montantTotal
      }
    })
  }, [etat.lignes, quantites]);
  
  const memoizedCalculatedAvenants = useMemo(() => {
    return avenants.map(avenant => {
      const values = avenantValues[avenant.id] ?? avenant
      const quantiteActuelle = values.quantiteActuelle
      const quantiteTotale = quantiteActuelle + avenant.quantitePrecedente
      const montantActuel = roundToTwoDecimals(quantiteActuelle * values.prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + avenant.montantPrecedent)
  
      return {
        ...avenant,
        ...values,
        quantiteTotale,
        montantActuel,
        montantTotal
      }
    })
  }, [avenants, avenantValues]);

  useEffect(() => {
    // Calculer les totaux
    const totalCommandeInitiale = {
      precedent: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => {
        if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') return sum;
        return sum + ligne.montantPrecedent;
      }, 0)),
      actuel: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => {
        if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') return sum;
        return sum + ligne.montantActuel;
      }, 0)),
      total: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => {
        if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') return sum;
        return sum + ligne.montantTotal;
      }, 0))
    }

    const totalAvenants = {
      precedent: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => {
        // Exclure les TITRE et SOUS_TITRE des calculs
        if (avenant.type === 'TITRE' || avenant.type === 'SOUS_TITRE') return sum;
        return sum + avenant.montantPrecedent;
      }, 0)),
      actuel: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => {
        // Exclure les TITRE et SOUS_TITRE des calculs
        if (avenant.type === 'TITRE' || avenant.type === 'SOUS_TITRE') return sum;
        return sum + avenant.montantActuel;
      }, 0)),
      total: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => {
        // Exclure les TITRE et SOUS_TITRE des calculs
        if (avenant.type === 'TITRE' || avenant.type === 'SOUS_TITRE') return sum;
        return sum + avenant.montantTotal;
      }, 0))
    }

    setSummary({
      totalCommandeInitiale,
      totalAvenants,
      totalGeneral: {
        precedent: roundToTwoDecimals(totalCommandeInitiale.precedent + totalAvenants.precedent),
        actuel: roundToTwoDecimals(totalCommandeInitiale.actuel + totalAvenants.actuel),
        total: roundToTwoDecimals(totalCommandeInitiale.total + totalAvenants.total)
      }
    })
  }, [memoizedCalculatedLignes, memoizedCalculatedAvenants])

  const handleQuantiteActuelleChange = async (ligneId: number, nouvelleQuantite: number) => {
    // Toujours mettre à jour l'état local immédiatement pour un retour visuel 
    setQuantites(prev => ({
      ...prev,
      [ligneId]: nouvelleQuantite
    }))
    
    // Pour les nouveaux états, seulement mettre à jour localement
    if (isNewEtat) {
      // Notifier le parent des changements de quantités
      if (onQuantitesChange) {
        onQuantitesChange({ ...quantites, [ligneId]: nouvelleQuantite })
      }
      return
    }
    
    try {

      const ligne = etat.lignes.find(l => l.id === ligneId)
      if (!ligne) {
        throw new Error('Ligne non trouvée')
      }

      // Calculer les valeurs dérivées
      const montantActuel = roundToTwoDecimals(nouvelleQuantite * ligne.prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + ligne.montantPrecedent)
      
      console.log(`Enregistrement de la quantité: ${nouvelleQuantite} pour la ligne ${ligneId}`)

      const response = await fetch(`${getBaseApiUrl()}/${effectiveEtatId}/lignes/${ligneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantiteActuelle: nouvelleQuantite,
          quantiteTotale: nouvelleQuantite + ligne.quantitePrecedente,
          montantActuel: montantActuel,
          montantTotal: montantTotal
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('Erreur serveur:', errorData)
        
        // En cas d'erreur, restaurer l'ancienne valeur
        setQuantites(prev => ({
          ...prev,
          [ligneId]: ligne.quantiteActuelle || 0
        }))
        throw new Error(errorData?.message || 'Erreur lors de la mise à jour de la quantité')
      }
      
      // Si la requête est réussie, s'assurer que l'état local est correct
      setQuantites(prev => ({
        ...prev,
        [ligneId]: nouvelleQuantite
      }))

      // Attendre un moment pour s'assurer que la mise à jour a bien eu lieu avant de rafraîchir
      setTimeout(() => {
        router.refresh()
      }, 100)
    } catch (error) {
      console.error('Erreur détaillée:', error)
      toast.error('Erreur lors de la mise à jour de la quantité')
    }
  }

  const handleAddAvenant = async () => {
    // Pour les nouveaux états, ajouter localement sans appel API
    if (isNewEtat) {
      const nouvelAvenant = {
        id: Date.now(), // ID temporaire unique
        soustraitantEtatId: 0, // Temporaire
        article: '',
        description: '',
        type: 'QP',
        unite: 'Pièces',
        prixUnitaire: 0,
        quantite: 0,
        quantiteActuelle: 0,
        quantitePrecedente: 0,
        quantiteTotale: 0,
        montantPrecedent: 0,
        montantActuel: 0,
        montantTotal: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      } as AvenantSoustraitantEtat
      
      const nouveauxAvenants = [...avenants, nouvelAvenant]
      setAvenants(nouveauxAvenants)
      setAvenantValues(prev => ({
        ...prev,
        [nouvelAvenant.id]: {
          article: nouvelAvenant.article,
          description: nouvelAvenant.description,
          type: nouvelAvenant.type,
          unite: nouvelAvenant.unite,
          prixUnitaire: nouvelAvenant.prixUnitaire,
          quantite: nouvelAvenant.quantite,
          quantiteActuelle: nouvelAvenant.quantiteActuelle,
          quantitePrecedente: nouvelAvenant.quantitePrecedente,
          quantiteTotale: nouvelAvenant.quantiteTotale,
          montantPrecedent: nouvelAvenant.montantPrecedent,
          montantActuel: nouvelAvenant.montantActuel,
          montantTotal: nouvelAvenant.montantTotal
        }
      }))
      
      // Notifier le parent des nouveaux avenants avec leurs valeurs mises à jour
      if (onAvenantsChange) {
        const avenantsSynchronises = nouveauxAvenants.map(avenant => ({
          ...avenant,
          ...(avenantValues[avenant.id] || {})
        }))
        onAvenantsChange(avenantsSynchronises)
      }
      

      
      toast.success('Avenant ajouté localement. Sauvegardez pour enregistrer.')
      return
    }
    
    try {
      const response = await fetch(`${getBaseApiUrl()}/${effectiveEtatId}/avenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: '',
          description: '',
          type: 'QP',
          unite: 'Pièces',
          prixUnitaire: 0,
          quantite: 0,
          quantitePrecedente: 0,
          quantiteActuelle: 0,
          quantiteTotale: 0,
          montantPrecedent: 0,
          montantActuel: 0,
          montantTotal: 0
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout de l\'avenant')
      }

      const nouvelAvenant = await response.json()
      
      // Mettre à jour l'état local
      setAvenants(prev => [...prev, nouvelAvenant] as (AvenantEtatAvancement | AvenantSoustraitantEtat)[])
      setAvenantValues(prev => ({
        ...prev,
        [nouvelAvenant.id]: {
          article: nouvelAvenant.article,
          description: nouvelAvenant.description,
          type: nouvelAvenant.type,
          unite: nouvelAvenant.unite,
          prixUnitaire: nouvelAvenant.prixUnitaire,
          quantite: nouvelAvenant.quantite,
          quantiteActuelle: nouvelAvenant.quantiteActuelle,
          quantitePrecedente: nouvelAvenant.quantitePrecedente,
          quantiteTotale: nouvelAvenant.quantiteTotale,
          montantPrecedent: nouvelAvenant.montantPrecedent,
          montantActuel: nouvelAvenant.montantActuel,
          montantTotal: nouvelAvenant.montantTotal
        }
      }))
      
      toast.success('Avenant ajouté avec succès')
      router.refresh()
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'ajout de l\'avenant')
    }
  }

  const handleAvenantChange = useCallback(async (avenantId: number, field: string, value: string | number) => {
    const timerKey = `${avenantId}-${field}`

    // Annuler le timer précédent s'il existe
    if (debounceTimers[timerKey]) {
      clearTimeout(debounceTimers[timerKey])
    }
    
    // Mettre à jour l'état local immédiatement pour la réactivité de l'UI
      setAvenantValues(prev => ({
        ...prev,
        [avenantId]: {
          ...(prev[avenantId] || {} as AvenantValues),
          [field]: value
        } as AvenantValues
      }))
    
    // Pour les nouveaux états ou avenants temporaires (ID négatifs), modifier localement sans appel API
    if (isNewEtat || avenantId < 0) {
      
      // Recalculer les totaux localement
      if (field === 'quantiteActuelle' || field === 'prixUnitaire') {
        const currentValues = avenantValues[avenantId] || {} as AvenantValues
        const quantiteActuelle = field === 'quantiteActuelle' ? (typeof value === 'number' ? value : parseFloat(String(value)) || 0) : (currentValues.quantiteActuelle || 0)
        const prixUnitaire = field === 'prixUnitaire' ? (typeof value === 'number' ? value : parseFloat(String(value)) || 0) : (currentValues.prixUnitaire || 0)
        
        setAvenantValues(prev => ({
          ...prev,
          [avenantId]: {
            ...(prev[avenantId] || {} as AvenantValues),
            [field]: value,
            quantiteTotale: quantiteActuelle + (currentValues.quantitePrecedente || 0),
            montantActuel: roundToTwoDecimals(quantiteActuelle * prixUnitaire),
            montantTotal: roundToTwoDecimals((quantiteActuelle * prixUnitaire) + (currentValues.montantPrecedent || 0))
          } as AvenantValues
        }))
      }
      
      // Notifier le parent des avenants mis à jour avec leurs valeurs
      if (onAvenantsChange) {
        const avenantsSynchronises = avenants.map(avenant => {
          if (avenant.id === avenantId) {
            // Pour l'avenant modifié, utiliser les nouvelles valeurs
            return {
              ...avenant,
              ...(avenantValues[avenant.id] || {}),
              [field]: value
            }
          } else {
            // Pour les autres avenants, utiliser les valeurs existantes
            return {
              ...avenant,
              ...(avenantValues[avenant.id] || {})
            }
          }
        })
        onAvenantsChange(avenantsSynchronises)
      }
      
      return
    }
    
    // Créer un nouveau timer avec debounce de 500ms pour les appels API
    const newTimer = setTimeout(async () => {
    try {
      setIsLoading(true);

      // Chercher l'avenant dans l'état local au lieu de etat.avenants
      const avenant = avenants.find(a => a.id === avenantId)
      if (!avenant) {
        throw new Error('Avenant non trouvé')
      }

      // Récupérer les valeurs mises à jour
      const updatedValues = {
        ...(avenantValues[avenantId] || {}),
        [field]: value
      }

      // S'assurer que tous les champs obligatoires sont présents
      const completeValues = {
        article: updatedValues.article || avenant.article || '',
        description: updatedValues.description || avenant.description || '',
        type: updatedValues.type || avenant.type || 'QP',
        unite: updatedValues.unite || avenant.unite || 'Pièces',
        prixUnitaire: updatedValues.prixUnitaire !== undefined ? updatedValues.prixUnitaire : (avenant.prixUnitaire || 0),
        quantite: updatedValues.quantite !== undefined ? updatedValues.quantite : (avenant.quantite || 0),
        quantiteActuelle: updatedValues.quantiteActuelle !== undefined ? updatedValues.quantiteActuelle : (avenant.quantiteActuelle || 0),
        quantitePrecedente: updatedValues.quantitePrecedente !== undefined ? updatedValues.quantitePrecedente : (avenant.quantitePrecedente || 0),
        quantiteTotale: updatedValues.quantiteTotale !== undefined ? updatedValues.quantiteTotale : (avenant.quantiteTotale || 0),
        montantPrecedent: updatedValues.montantPrecedent !== undefined ? updatedValues.montantPrecedent : (avenant.montantPrecedent || 0),
        montantActuel: updatedValues.montantActuel !== undefined ? updatedValues.montantActuel : (avenant.montantActuel || 0),
        montantTotal: updatedValues.montantTotal !== undefined ? updatedValues.montantTotal : (avenant.montantTotal || 0)
      };
      


      const response = await fetch(`${getBaseApiUrl()}/${effectiveEtatId}/avenants/${avenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: completeValues.article,
          description: completeValues.description,
          type: completeValues.type,
          unite: completeValues.unite,
          prixUnitaire: completeValues.prixUnitaire,
          quantite: completeValues.quantite,
          quantiteActuelle: completeValues.quantiteActuelle,
          quantiteTotale: completeValues.quantiteActuelle + avenant.quantitePrecedente,
          montantActuel: roundToTwoDecimals(completeValues.quantiteActuelle * completeValues.prixUnitaire),
          montantTotal: roundToTwoDecimals((completeValues.quantiteActuelle * completeValues.prixUnitaire) + avenant.montantPrecedent)
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'avenant')
      }

      const serverAvenant = await response.json()
      
      // Conserver les valeurs exactes saisies par l'utilisateur
      setAvenantValues(prev => ({
        ...prev,
        [avenantId]: completeValues
      }));
      
      // Mettre à jour l'avenant dans la liste
      setAvenants(prev => prev.map(a => {
        if (a.id === avenantId) {
          return {
            ...serverAvenant,
            [field]: completeValues[field as keyof AvenantValues]
          };
        }
        return a;
      }));

      // Attendre un court instant avant de rafraîchir
      setTimeout(() => {
        router.refresh();
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avenant:', error)
      toast.error('Erreur lors de la mise à jour de l\'avenant')
    } finally {
      setIsLoading(false)
    }
    }, 500) // Debounce de 500ms
    
    // Enregistrer le nouveau timer
    setDebounceTimers(prev => ({
      ...prev,
      [timerKey]: newTimer
    }))
  }, [debounceTimers, isNewEtat, effectiveEtatId, getBaseApiUrl, avenants, avenantValues, onAvenantsChange, router])

  const handleSaveComments = async () => {
    // Pour les nouveaux états, seulement notifier le parent (pas d'appel API)
    if (isNewEtat) {
      setIsEditingComments(false)
      if (onCommentairesChange) {
        onCommentairesChange(commentaires)
      }
      toast.success('Commentaires sauvegardés localement')
      return
    }
    
    try {
      const response = await fetch(`${getBaseApiUrl()}/${effectiveEtatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: commentaires,
          estFinalise: etat.estFinalise // Conserver l'état de finalisation
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des commentaires')
      }

      setIsEditingComments(false)
      // Notifier le parent des nouveaux commentaires
      if (onCommentairesChange) {
        onCommentairesChange(commentaires)
      }
      toast.success('Commentaires sauvegardés avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la sauvegarde des commentaires')
    }
  }

  const handleDeleteAvenant = async (avenantId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avenant ?')) {
      return
    }

    try {
      const response = await fetch(
        `${getBaseApiUrl()}/${effectiveEtatId}/avenants?avenantId=${avenantId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression de l\'avenant')
      }

      // Mettre à jour l'état local
      setAvenants(prev => prev.filter(a => a.id !== avenantId) as (AvenantEtatAvancement | AvenantSoustraitantEtat)[])
      setAvenantValues(prev => {
        const newValues = { ...prev }
        delete newValues[avenantId]
        return newValues
      })

      toast.success('Avenant supprimé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de l\'avenant')
    }
  }

  return (
    <div className="space-y-6">
      {/* Commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="font-bold text-lg">Commentaires</span>
          </div>
          {!etat.estFinalise && (
            <button
              onClick={() => {
                if (isEditingComments) {
                  handleSaveComments()
                } else {
                  setIsEditingComments(true)
                }
              }}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span>{isEditingComments ? 'Sauvegarder' : 'Modifier'}</span>
            </button>
          )}
        </div>
        
        {isEditingComments ? (
          <textarea
            value={commentaires}
            onChange={(e) => {
              setCommentaires(e.target.value)
              // Notifier le parent immédiatement du changement
              if (onCommentairesChange) {
                onCommentairesChange(e.target.value)
              }
            }}
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            rows={6}
            placeholder="Saisissez vos commentaires..."
          />
        ) : (
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            <p className="whitespace-pre-wrap">{commentaires || 'Aucun commentaire'}</p>
          </div>
        )}
      </div>

      {/* Tableau des lignes de commande initiale */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-bold text-lg">Commande initiale</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-48" />
              <col className="w-10" />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-12" />
              <col className="w-12" />
              <col className="w-20" />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-16" />
              <col className="w-16" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Art.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unité
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prix unit.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Init.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Préc.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 font-bold text-blue-700 dark:text-blue-300">
                  Q. Actuelle
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Totale
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Préc.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Act.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {memoizedCalculatedLignes.map((ligne, index) => {
                const isSectionHeader = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';

                if (isSectionHeader) {
                  return (
                    <tr
                      key={`ligne-section-${ligne.id}`}
                      className={`${ligne.type === 'TITRE' ? 'bg-blue-50/80 dark:bg-blue-900/30' : 'bg-gray-100/80 dark:bg-gray-800/40'}`}
                    >
                      <td
                        colSpan={12}
                        className="px-4 py-4 text-sm font-semibold tracking-wide text-blue-900 dark:text-blue-100 uppercase"
                      >
                        {ligne.description || ligne.article}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={`ligne-${ligne.id}`}
                    className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200`}
                  >
                    <td className="px-2 py-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                      <div className="truncate max-w-[80px]" title={ligne.article}>
                        {ligne.article}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-700 dark:text-gray-300">
                      <div className="break-words whitespace-normal" title={ligne.description}>
                        {ligne.description}
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{ligne.type}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">{ligne.unite}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                      {formatMontant(ligne.prixUnitaire)} €
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{ligne.quantite.toLocaleString('fr-FR')}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                      {ligne.quantitePrecedente.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 border-r border-blue-200 dark:border-blue-700 shadow-sm">
                      {!etat.estFinalise ? (
                        <NumericInput
                          value={quantites[ligne.id] ?? ligne.quantiteActuelle}
                          onChangeNumber={(val) => handleQuantiteActuelleChange(ligne.id, val)}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg text-center bg-white/90 dark:bg-gray-800/90 text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold shadow-sm transition-all duration-200 backdrop-blur-sm"
                        />
                      ) : (
                        <span className="font-bold text-center text-blue-800 dark:text-blue-300 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
                          {ligne.quantiteActuelle.toLocaleString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                      {ligne.quantiteTotale.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatMontant(ligne.montantPrecedent)} €</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                      {formatMontant(ligne.montantActuel)} €
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right font-bold">
                      {formatMontant(ligne.montantTotal)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tableau des avenants */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-lg ring-2 ring-amber-200 dark:ring-amber-700">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span className="font-bold text-lg">Avenants</span>
          </div>
          {!etat.estFinalise && (
            <button
              onClick={handleAddAvenant}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Ajouter un avenant</span>
            </button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 table-fixed">
            <colgroup>
              <col className="w-10" />
              <col className="w-48" />
              <col className="w-10" />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-12" />
              <col className="w-12" />
              <col className="w-20" />
              <col className="w-12" />
              <col className="w-16" />
              <col className="w-16" />
              <col className="w-16" />
            </colgroup>
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Art.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Unité
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prix unit.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Init.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Préc.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gradient-to-r from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 font-bold text-blue-700 dark:text-blue-300">
                  Q. Actuelle
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Q. Totale
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Préc.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Act.
                </th>
                <th scope="col" className="px-2 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mont. Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {memoizedCalculatedAvenants.map((avenant, index) => {
                // Un avenant provient d'un état précédent si quantitePrecedente > 0
                const isFromPreviousState = avenant.quantitePrecedente > 0
                const isSectionHeader = avenant.type === 'TITRE' || avenant.type === 'SOUS_TITRE';

                // Si c'est un titre ou sous-titre, afficher sur toute la largeur
                if (isSectionHeader) {
                  return (
                    <tr
                      key={`avenant-${avenant.id}-section`}
                      className={`${avenant.type === 'TITRE' ? 'bg-blue-50/80 dark:bg-blue-900/30' : 'bg-gray-100/80 dark:bg-gray-800/40'}`}
                    >
                      <td
                        colSpan={13}
                        className="px-3 py-4 text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-100"
                      >
                        {avenant.description || avenant.article}
                      </td>
                    </tr>
                  );
                }

                return (
                <tr key={`avenant-${avenant.id}`} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 group`}>
                  <td className="px-2 py-4 text-sm text-gray-900 dark:text-gray-100">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <input
                        type="text"
                        value={avenantValues[avenant.id]?.article || avenant.article}
                        onChange={(e) => handleAvenantChange(avenant.id, 'article', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
                      />
                    ) : (
                      <div className="truncate max-w-[80px]" title={avenant.article}>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{avenant.article}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <textarea
                        value={avenantValues[avenant.id]?.description || avenant.description}
                        onChange={(e) => {
                          handleAvenantChange(avenant.id, 'description', e.target.value)
                          // auto-resize uniquement si nécessaire
                          e.currentTarget.style.height = 'auto'
                          e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                        rows={1}
                        style={{ height: 'auto' }}
                      />
                    ) : (
                      <div className="break-words whitespace-normal" title={avenant.description}>
                        {avenant.description}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <select
                        value={avenantValues[avenant.id]?.type || avenant.type}
                        onChange={(e) => handleAvenantChange(avenant.id, 'type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="QP">QP</option>
                        <option value="FF">FF</option>
                        <option value="FG">FG</option>
                        <option value="TITRE">TITRE</option>
                        <option value="SOUS_TITRE">SOUS-TITRE</option>
                      </select>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{avenant.type}</span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <select
                        value={avenantValues[avenant.id]?.unite || avenant.unite || 'Pièces'}
                        onChange={(e) => handleAvenantChange(avenant.id, 'unite', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      >
                        <option value="Mct">Mct</option>
                        <option value="M2">M²</option>
                        <option value="M3">M³</option>
                        <option value="Heures">Heures</option>
                        <option value="Pièces">Pièces</option>
                        <option value="Fft">Forfait</option>
                      </select>
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{avenant.unite}</span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <NumericInput
                        value={avenantValues[avenant.id]?.prixUnitaire ?? avenant.prixUnitaire}
                        onChangeNumber={(val) => handleAvenantChange(avenant.id, 'prixUnitaire', val)}

                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    ) : (
                      <span className="font-medium text-right text-gray-700 dark:text-gray-300">
                        {`${formatMontant(avenant.prixUnitaire)} €`}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                    {!etat.estFinalise && !isFromPreviousState ? (
                      <NumericInput
                        value={avenantValues[avenant.id]?.quantite ?? avenant.quantite}
                        onChangeNumber={(val) => handleAvenantChange(avenant.id, 'quantite', val)}

                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                    ) : (
                      <span className="text-gray-700 dark:text-gray-300">{avenant.quantite.toLocaleString('fr-FR')}</span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                    {avenant.quantitePrecedente.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 border-r border-blue-200 dark:border-blue-700 shadow-sm">
                    {!etat.estFinalise ? (
                      <NumericInput
                        value={avenantValues[avenant.id]?.quantiteActuelle ?? avenant.quantiteActuelle}
                        onChangeNumber={(val) => handleAvenantChange(avenant.id, 'quantiteActuelle', val)}

                        className="w-full px-3 py-2 border-2 border-blue-300 dark:border-blue-600 rounded-lg text-center bg-white/90 dark:bg-gray-800/90 text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold shadow-sm transition-all duration-200 backdrop-blur-sm"
                      />
                    ) : (
                      <span className="font-bold text-center text-blue-800 dark:text-blue-300 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent block">
                        {avenant.quantiteActuelle.toLocaleString('fr-FR')}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                    {avenant.quantiteTotale.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">{formatMontant(avenant.montantPrecedent)} €</td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                    {formatMontant(avenant.montantActuel)} €
                  </td>
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-right font-bold relative">
                    {formatMontant(avenant.montantTotal)} €
                    
                    {/* Bouton de suppression flottant */}
                  {!etat.estFinalise && !isFromPreviousState && (
                      <button
                        onClick={() => handleDeleteAvenant(avenant.id)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow-lg z-10 hover:scale-110"
                        title="Supprimer cet avenant"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                  )}
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Résumé des totaux */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-200 dark:to-gray-400 bg-clip-text text-transparent">
          Résumé des montants
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-cyan-50 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/40 p-6 rounded-xl shadow-md border border-cyan-200 dark:border-cyan-700 hover:shadow-lg transition-all duration-300">
            <h3 className="font-bold text-lg mb-3 bg-gradient-to-r from-cyan-700 to-blue-700 dark:from-cyan-300 dark:to-blue-300 bg-clip-text text-transparent">
              🏗️ Commande initiale
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                <span className="font-medium">Précédent:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalCommandeInitiale.precedent)} €</span>
              </p>
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                <span className="font-medium">Actuel:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalCommandeInitiale.actuel)} €</span>
              </p>
              <div className="pt-2 border-t border-cyan-300 dark:border-cyan-600">
                <p className="font-black text-lg bg-gradient-to-r from-cyan-700 to-blue-700 dark:from-cyan-300 dark:to-blue-300 bg-clip-text text-transparent">
                  Total: {formatMontant(summary.totalCommandeInitiale.total)} €
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/40 p-6 rounded-xl shadow-md border border-emerald-200 dark:border-emerald-700 hover:shadow-lg transition-all duration-300">
            <h3 className="font-bold text-lg mb-3 bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
              📋 Avenants
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">Précédent:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalAvenants.precedent)} €</span>
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                <span className="font-medium">Actuel:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalAvenants.actuel)} €</span>
              </p>
              <div className="pt-2 border-t border-emerald-300 dark:border-emerald-600">
                <p className="font-black text-lg bg-gradient-to-r from-emerald-700 to-teal-700 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
                  Total: {formatMontant(summary.totalAvenants.total)} €
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/40 p-6 rounded-xl shadow-md border border-red-200 dark:border-red-700 hover:shadow-lg transition-all duration-300 ring-2 ring-red-300 dark:ring-red-600">
            <h3 className="font-bold text-lg mb-3 bg-gradient-to-r from-red-700 to-rose-700 dark:from-red-300 dark:to-rose-300 bg-clip-text text-transparent">
              💰 Total général
            </h3>
            <div className="space-y-2">
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">Précédent:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalGeneral.precedent)} €</span>
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                <span className="font-medium">Actuel:</span> 
                <span className="font-bold ml-2">{formatMontant(summary.totalGeneral.actuel)} €</span>
              </p>
              <div className="pt-2 border-t border-red-300 dark:border-red-600">
                <p className="font-black text-xl bg-gradient-to-r from-red-700 to-rose-700 dark:from-red-300 dark:to-rose-300 bg-clip-text text-transparent">
                  Total: {formatMontant(summary.totalGeneral.total)} €
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
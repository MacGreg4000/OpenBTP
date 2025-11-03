'use client'
import { useState, useEffect, useMemo } from 'react'
import { EtatAvancement, EtatAvancementSummary } from '@/types/etat-avancement'
import { TrashIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
// import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import NumericInput from '@/components/ui/NumericInput'
import { roundToTwoDecimals } from '@/utils/calculs'

// Fonction helper pour formater les montants avec 2 décimales
const formatMontant = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface EtatAvancementClientProps {
  etatAvancement: EtatAvancement
  chantierId: string
  etatId: string
}

export default function EtatAvancementClient({
  etatAvancement,
  chantierId,
  etatId,
}: EtatAvancementClientProps) {
  // const router = useRouter()
  const [isEditingComments, setIsEditingComments] = useState(false)
  const [commentaires, setCommentaires] = useState(etatAvancement.commentaires || '')
  const [summary, setSummary] = useState<EtatAvancementSummary>({
    totalCommandeInitiale: { precedent: 0, actuel: 0, total: 0 },
    totalAvenants: { precedent: 0, actuel: 0, total: 0 },
    totalGeneral: { precedent: 0, actuel: 0, total: 0 }
  })
  const [quantites, setQuantites] = useState<{ [key: number]: number }>({})
  const [avenants, setAvenants] = useState(etatAvancement.avenants)
  
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
  const [, setIsLoading] = useState(false)

  // Ajouter un log pour déboguer
  console.log('Avenants reçus dans EtatAvancementClient:', etatAvancement.avenants);
  console.log('Commentaires reçus dans EtatAvancementClient:', etatAvancement.commentaires);

  // Mettre à jour les commentaires lorsque etatAvancement change
  useEffect(() => {
    console.log('etatAvancement a changé, mise à jour des commentaires:', etatAvancement.commentaires);
    setCommentaires(etatAvancement.commentaires || '');
  }, [etatAvancement]);

  useEffect(() => {
    // Initialiser les quantités avec les valeurs actuelles
    const initialQuantites = etatAvancement.lignes.reduce((acc, ligne) => {
      acc[ligne.id] = ligne.quantiteActuelle || 0
      return acc
    }, {} as { [key: number]: number })
    setQuantites(initialQuantites)

    // Initialiser les valeurs des avenants
    const initialAvenantValues = etatAvancement.avenants.reduce((acc, avenant) => {
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
    
    console.log('Valeurs initiales des avenants:', initialAvenantValues);
    setAvenantValues(initialAvenantValues)
    
    // Mettre à jour l'état des avenants pour s'assurer qu'ils sont correctement initialisés
    setAvenants(etatAvancement.avenants);
  }, [etatAvancement])

  // Utilisation de useMemo pour éviter les recalculs inutiles et les boucles
  const memoizedCalculatedLignes = useMemo(() => {
    return etatAvancement.lignes.map(ligne => {
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
  }, [etatAvancement.lignes, quantites]);
  
  const memoizedCalculatedAvenants = useMemo(() => {
    return avenants.map(avenant => {
      const values = avenantValues[avenant.id] ?? {
        article: avenant.article,
        description: avenant.description,
        type: avenant.type,
        unite: avenant.unite,
        prixUnitaire: avenant.prixUnitaire,
        quantite: avenant.quantite,
        quantiteActuelle: avenant.quantiteActuelle,
        quantitePrecedente: avenant.quantitePrecedente,
        quantiteTotale: avenant.quantiteTotale,
        montantPrecedent: avenant.montantPrecedent,
        montantActuel: avenant.montantActuel,
        montantTotal: avenant.montantTotal,
      } as AvenantValues
      const quantiteActuelle = values.quantiteActuelle
      const quantiteTotale = quantiteActuelle + avenant.quantitePrecedente
      const montantActuel = roundToTwoDecimals(quantiteActuelle * values.prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + avenant.montantPrecedent)

      const merged: AvenantValues = {
        article: values.article,
        description: values.description,
        type: values.type,
        unite: values.unite,
        prixUnitaire: values.prixUnitaire,
        quantite: values.quantite,
        quantiteActuelle,
        quantitePrecedente: avenant.quantitePrecedente,
        quantiteTotale,
        montantPrecedent: avenant.montantPrecedent,
        montantActuel,
        montantTotal,
      }

      return { ...avenant, ...merged }
    })
  }, [avenants, avenantValues]);

  useEffect(() => {
    // Calculer les totaux
    const totalCommandeInitiale = {
      precedent: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => sum + ligne.montantPrecedent, 0)),
      actuel: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0)),
      total: roundToTwoDecimals(memoizedCalculatedLignes.reduce((sum, ligne) => sum + ligne.montantTotal, 0))
    }

    const totalAvenants = {
      precedent: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => sum + avenant.montantPrecedent, 0)),
      actuel: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0)),
      total: roundToTwoDecimals(memoizedCalculatedAvenants.reduce((sum, avenant) => sum + avenant.montantTotal, 0))
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
    try {
      // Mettre immédiatement à jour l'état local pour un retour visuel immédiat
      setQuantites(prev => ({
        ...prev,
        [ligneId]: nouvelleQuantite
      }))

      const ligne = etatAvancement.lignes.find(l => l.id === ligneId)
      if (!ligne) {
        throw new Error('Ligne non trouvée')
      }

      // Calculer les valeurs dérivées
      const montantActuel = roundToTwoDecimals(nouvelleQuantite * ligne.prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + ligne.montantPrecedent)
      
      // Enregistrer temporairement la valeur exacte pour le dernier changement
      const quantiteExacte = nouvelleQuantite;
      
      console.log(`Enregistrement de la quantité: ${quantiteExacte} pour la ligne ${ligneId}`);

      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etatId}/lignes/${ligneId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantiteActuelle: quantiteExacte,
          quantiteTotale: quantiteExacte + ligne.quantitePrecedente,
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
      // Cela garantit que la valeur affichée correspond exactement à ce qui a été envoyé
      setQuantites(prev => ({
        ...prev,
        [ligneId]: quantiteExacte
      }))

      // Attendre un moment pour s'assurer que la mise à jour a bien eu lieu avant de rafraîchir
      // setTimeout(() => {
      //   router.refresh();
      // }, 100); - Supprimé car cause la perte des données
    } catch (error) {
      console.error('Erreur détaillée:', error)
      toast.error('Erreur lors de la mise à jour de la quantité')
    }
  }

  const handleAddAvenant = async () => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etatId}/avenants`, {
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

      // Récupérer le nouvel avenant depuis la réponse
      const newAvenant = await response.json()

      // Mettre à jour l'état local
      setAvenants([...avenants, newAvenant])
      setAvenantValues({
        ...avenantValues,
        [newAvenant.id]: {
          article: newAvenant.article,
          description: newAvenant.description,
          type: newAvenant.type,
          unite: newAvenant.unite,
          prixUnitaire: newAvenant.prixUnitaire,
          quantite: newAvenant.quantite,
          quantiteActuelle: newAvenant.quantiteActuelle || 0,
          quantitePrecedente: newAvenant.quantitePrecedente || 0,
          quantiteTotale: newAvenant.quantiteTotale || 0,
          montantPrecedent: newAvenant.montantPrecedent || 0,
          montantActuel: newAvenant.montantActuel || 0,
          montantTotal: newAvenant.montantTotal || 0
        }
      })

      toast.success('Avenant ajouté avec succès')
      // router.refresh() - Supprimé car cause la perte des données
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'ajout de l\'avenant')
    }
  }

  const handleAvenantChange = async (avenantId: number, field: string, value: string | number) => {
    try {
      setIsLoading(true);
      
      // Ne pas écrire un partiel qui casse le type; on calculera les valeurs complètes puis on settera

      // Chercher l'avenant dans l'état local au lieu de etatAvancement.avenants
      const avenant = avenants.find(a => a.id === avenantId)
      if (!avenant) {
        throw new Error('Avenant non trouvé')
      }

      // Récupérer les valeurs mises à jour
      const updatedValues = {
        ...(avenantValues[avenantId] || {}),
        [field]: value
      } as Partial<AvenantValues>

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
      
      // Sauvegarder les valeurs exactes pour le champ modifié
      const exactValues: AvenantValues = { ...completeValues } as AvenantValues;
      
      const quantiteActuelle = completeValues.quantiteActuelle || 0
      const prixUnitaire = completeValues.prixUnitaire || 0
      const montantActuel = roundToTwoDecimals(quantiteActuelle * prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + avenant.montantPrecedent)

      console.log('Mise à jour de l\'avenant:', {
        avenantId,
        field,
        value,
        exactValues,
        quantiteActuelle,
        prixUnitaire,
        montantActuel,
        montantTotal
      });

      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etatId}/avenants/${avenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article: exactValues.article,
          description: exactValues.description,
          type: exactValues.type,
          unite: exactValues.unite,
          prixUnitaire: exactValues.prixUnitaire,
          quantite: exactValues.quantite,
          quantiteActuelle: exactValues.quantiteActuelle,
          quantiteTotale: exactValues.quantiteActuelle + avenant.quantitePrecedente,
          montantActuel: roundToTwoDecimals(exactValues.quantiteActuelle * exactValues.prixUnitaire),
          montantTotal: roundToTwoDecimals((exactValues.quantiteActuelle * exactValues.prixUnitaire) + avenant.montantPrecedent)
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'avenant')
      }

      const serverAvenant = await response.json()
      console.log('Avenant mis à jour:', serverAvenant)
      
      // Conserver les valeurs exactes saisies par l'utilisateur
      setAvenantValues(prev => ({
        ...prev,
        [avenantId]: exactValues
      }));
      
      // Mettre à jour l'avenant dans la liste, mais en conservant les valeurs exactes saisies
      setAvenants(prev => prev.map(a => {
        if (a.id === avenantId) {
          return {
            ...serverAvenant,
            // Conserver les valeurs exactes pour les champs numériques
            prixUnitaire: field === 'prixUnitaire' ? exactValues.prixUnitaire : serverAvenant.prixUnitaire,
            quantite: field === 'quantite' ? exactValues.quantite : serverAvenant.quantite,
            quantiteActuelle: field === 'quantiteActuelle' ? exactValues.quantiteActuelle : serverAvenant.quantiteActuelle,
            quantitePrecedente: field === 'quantitePrecedente' ? exactValues.quantitePrecedente : serverAvenant.quantitePrecedente,
            quantiteTotale: field === 'quantiteTotale' ? exactValues.quantiteTotale : serverAvenant.quantiteTotale,
            montantPrecedent: field === 'montantPrecedent' ? exactValues.montantPrecedent : serverAvenant.montantPrecedent,
            montantActuel: field === 'montantActuel' ? exactValues.montantActuel : serverAvenant.montantActuel,
            montantTotal: field === 'montantTotal' ? exactValues.montantTotal : serverAvenant.montantTotal
          };
        }
        return a;
      }));

      // Attendre un court instant avant de rafraîchir pour s'assurer que les mises à jour sont bien appliquées
      // setTimeout(() => {
      //   router.refresh();
      // }, 100); - Supprimé car cause la perte des données
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avenant:', error)
      toast.error('Erreur lors de la mise à jour de l\'avenant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveComments = async () => {
    try {
      console.log('Sauvegarde des commentaires:', commentaires);
      
      // Désactiver l'édition pendant la sauvegarde
      setIsEditingComments(false);
      
      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires,
          estFinalise: etatAvancement.estFinalise // Conserver l'état de finalisation
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour des commentaires')
      }

      const updatedEtat = await response.json();
      console.log('État mis à jour avec commentaires:', updatedEtat.commentaires);

      // Mettre à jour l'état local avec les nouvelles valeurs
      setCommentaires(updatedEtat.commentaires || '');
      
      // Afficher un message de succès
      toast.success('Commentaires enregistrés avec succès');
      
      // Au lieu de recharger toute la page, nous pouvons simplement rafraîchir les données
      // en utilisant router.refresh() qui est plus léger et préserve l'état du composant
      // router.refresh(); - Supprimé car cause la perte des données
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour des commentaires')
      // Réactiver l'édition en cas d'erreur
      setIsEditingComments(true);
    }
  }

  const handleDeleteAvenant = async (avenantId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avenant ?')) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/chantiers/${chantierId}/etats-avancement/${etatId}/avenants/${avenantId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        const data = await response.json()
        toast.error(data.error || 'Erreur lors de la suppression de l\'avenant')
        return
      }

      // Mettre à jour l'état local
      setAvenants(avenants.filter(a => a.id !== avenantId))
      toast.success('Avenant supprimé avec succès')
      // router.refresh() - Supprimé car cause la perte des données
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de l\'avenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8 w-full min-w-[1024px] max-w-[1920px] mx-auto">
      {/* Tableau du bordereau de commande */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Bordereau de commande initial
          </h2>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-24 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Art.</th>
                  <th className="w-96 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Desc.</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Type</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Un.</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">P.U.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Total</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté P.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-300 dark:border-gray-600 font-bold">Qté A.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté T.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. P.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20">Mt. A.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. T.</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {memoizedCalculatedLignes.map((ligne) => (
                  <tr key={ligne.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.article}</td>
                    <td className="w-96 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.description}</td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.type}</td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">{ligne.unite}</td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">{formatMontant(ligne.prixUnitaire)} €</td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">{ligne.quantite}</td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant(ligne.prixUnitaire * ligne.quantite)} €
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.quantitePrecedente}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10 border-l border-gray-300 dark:border-gray-600">
                      {!etatAvancement.estFinalise ? (
                        <NumericInput
                          value={quantites[ligne.id] ?? ligne.quantiteActuelle}
                          onChangeNumber={(val)=> handleQuantiteActuelleChange(ligne.id, val)}
                          step="0.01"
                          min="0"
                          className="w-16 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      ) : (
                        ligne.quantiteActuelle
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {ligne.quantiteTotale}
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant(ligne.montantPrecedent)} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10">
                      {formatMontant(ligne.montantActuel)} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant(ligne.montantTotal)} €
                    </td>
                    <td className="w-10 px-2 py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tableau des avenants */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-blue-200 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Avenants
          </h2>
          {!etatAvancement.estFinalise && (
            <button
              onClick={handleAddAvenant}
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500 dark:bg-indigo-700 dark:hover:bg-indigo-600 flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Ajouter un avenant
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="w-24 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Art.</th>
                  <th className="w-96 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Desc.</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Type</th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-semibold text-gray-900 dark:text-gray-200">Un.</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">P.U.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté</th>
                  <th className="w-24 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Total</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté P.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 border-l border-gray-300 dark:border-gray-600 font-bold">Qté A.</th>
                  <th className="w-20 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Qté T.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. P.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20">Mt. A.</th>
                  <th className="w-28 px-2 py-3 text-right text-xs font-semibold text-gray-900 dark:text-gray-200">Mt. T.</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {memoizedCalculatedAvenants.map((avenant) => {
                  // Un avenant provient d'un état précédent si quantitePrecedente > 0
                  const isFromPreviousState = avenant.quantitePrecedente > 0
                  return (
                  <tr key={avenant.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.article ?? avenant.article ?? ''}
                          onChange={(e) => handleAvenantChange(avenant.id, 'article', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.article
                      )}
                    </td>
                    <td className="w-96 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.description ?? avenant.description ?? ''}
                          onChange={(e) => handleAvenantChange(avenant.id, 'description', e.target.value)}
                          className="w-full border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.description
                      )}
                    </td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <select
                          value={avenantValues[avenant.id]?.type ?? avenant.type ?? 'QP'}
                          onChange={(e) => handleAvenantChange(avenant.id, 'type', e.target.value)}
                          className="border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        >
                          <option value="QP">QP</option>
                          <option value="TS">TS</option>
                          <option value="TF">TF</option>
                        </select>
                      ) : (
                        avenant.type
                      )}
                    </td>
                    <td className="w-16 px-2 py-3 text-xs text-gray-900 dark:text-gray-200">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <select
                          value={avenantValues[avenant.id]?.unite ?? avenant.unite ?? 'Pièces'}
                          onChange={(e) => handleAvenantChange(avenant.id, 'unite', e.target.value)}
                          className="w-16 border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                        >
                          <option value="Mct">Mct</option>
                          <option value="M2">M²</option>
                          <option value="M3">M³</option>
                          <option value="Heures">Heures</option>
                          <option value="Pièces">Pièces</option>
                        </select>
                      ) : (
                        avenant.unite
                      )}
                    </td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <div className="flex items-center justify-end space-x-1">
                          <NumericInput
                            value={avenantValues[avenant.id]?.prixUnitaire ?? avenant.prixUnitaire}
                            onChangeNumber={(val)=> handleAvenantChange(avenant.id, 'prixUnitaire', val)}
                            step="0.01"
                            min="0"
                            className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                          />
                          <span>€</span>
                        </div>
                      ) : (
                        <>{formatMontant(avenant.prixUnitaire)} €</>
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <NumericInput
                          value={avenantValues[avenant.id]?.quantite ?? avenant.quantite}
                          onChangeNumber={(val)=> handleAvenantChange(avenant.id, 'quantite', val)}
                          step="0.01"
                          min="0"
                          className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.quantite
                      )}
                    </td>
                    <td className="w-24 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant((avenantValues[avenant.id]?.prixUnitaire ?? avenant.prixUnitaire) * 
                        (avenantValues[avenant.id]?.quantite ?? avenant.quantite))} €
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {avenant.quantitePrecedente}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10 border-l border-gray-300 dark:border-gray-600">
                      {!etatAvancement.estFinalise ? (
                        <NumericInput
                          value={avenantValues[avenant.id]?.quantiteActuelle ?? avenant.quantiteActuelle}
                          onChangeNumber={(val)=> handleAvenantChange(avenant.id, 'quantiteActuelle', val)}
                          step="0.01"
                          min="0"
                          className="w-20 text-right border rounded px-1 py-0.5 text-xs dark:bg-gray-800 dark:border-gray-600"
                        />
                      ) : (
                        avenant.quantiteActuelle
                      )}
                    </td>
                    <td className="w-20 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {memoizedCalculatedAvenants.find(a => a.id === avenant.id)?.quantiteTotale}
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant(avenant.montantPrecedent)} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right bg-blue-50 dark:bg-blue-900/10">
                      {formatMontant(memoizedCalculatedAvenants.find(a => a.id === avenant.id)?.montantActuel ?? 0)} €
                    </td>
                    <td className="w-28 px-2 py-3 text-xs text-gray-900 dark:text-gray-200 text-right">
                      {formatMontant(memoizedCalculatedAvenants.find(a => a.id === avenant.id)?.montantTotal ?? 0)} €
                    </td>
                    <td className="w-10 px-2 py-3">
                      {!etatAvancement.estFinalise && !isFromPreviousState && (
                        <button
                          onClick={() => handleDeleteAvenant(avenant.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
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
      </div>

      {/* Section commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-8 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-red-200 dark:border-red-700 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            Commentaires
          </h2>
          {!etatAvancement.estFinalise && (
            isEditingComments ? (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveComments}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => {
                    setCommentaires(etatAvancement.commentaires || '')
                    setIsEditingComments(false)
                  }}
                  className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingComments(true)}
                className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 flex items-center text-sm"
              >
                <PencilSquareIcon className="h-4 w-4 mr-1" />
                Modifier
              </button>
            )
          )}
        </div>
        <div className="p-6 bg-white dark:bg-gray-800">
          {isEditingComments ? (
            <textarea
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              className="w-full h-32 p-4 border rounded-lg dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Saisissez vos commentaires ici..."
            />
          ) : (
            <div className="whitespace-pre-wrap bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-h-[5rem] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
              {commentaires || 'Aucun commentaire'}
            </div>
          )}
        </div>
      </div>

      {/* Récapitulatif des totaux */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b-2 border-green-200 dark:border-green-700 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Récapitulatif
          </h2>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200"></th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant précédent</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant actuel</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Montant total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">Total commande initiale</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalCommandeInitiale.precedent)} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalCommandeInitiale.actuel)} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalCommandeInitiale.total)} €</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-200">Total avenants</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalAvenants.precedent)} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalAvenants.actuel)} €</td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalAvenants.total)} €</td>
                </tr>
                <tr className="bg-green-50 dark:bg-green-900/20 font-bold">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200">TOTAL GÉNÉRAL</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalGeneral.precedent)} €</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right bg-green-100 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-400">{formatMontant(summary.totalGeneral.actuel)} €</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-gray-200 text-right">{formatMontant(summary.totalGeneral.total)} €</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 
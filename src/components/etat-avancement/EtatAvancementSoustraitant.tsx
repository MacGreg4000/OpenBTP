'use client'
import { useState, useEffect, useMemo } from 'react'
import { SoustraitantEtat, EtatAvancementSummary } from '@/types/etat-avancement'
import { TrashIcon, PlusIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
// import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import NumericInput from '@/components/ui/NumericInput'
import { roundToTwoDecimals } from '@/utils/calculs'

// Fonction helper pour formater les montants avec 2 décimales
const formatMontant = (value: number) => value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface EtatAvancementSoustraitantProps {
  etatAvancement: SoustraitantEtat
  chantierId: string
  soustraitantId: string
  etatId: string
}

export default function EtatAvancementSoustraitant({
  etatAvancement,
  chantierId,
  soustraitantId,
  etatId,
}: EtatAvancementSoustraitantProps) {
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

  // Initialisation des états locaux
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
    
    setAvenantValues(initialAvenantValues)
    setAvenants(etatAvancement.avenants);
  }, [etatAvancement])

  // Calculs mémorisés pour les lignes
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
  
  // Calculs mémorisés pour les avenants
  const memoizedCalculatedAvenants = useMemo(() => {
    return avenants.map(avenant => {
      const values = avenantValues[avenant.id] ?? avenant
      const quantiteActuelle = values.quantiteActuelle
      const quantiteTotale = quantiteActuelle + avenant.quantitePrecedente
      const montantActuel = roundToTwoDecimals(quantiteActuelle * values.prixUnitaire)
      const montantTotalCalc = roundToTwoDecimals(montantActuel + avenant.montantPrecedent)

      return {
        ...avenant,
        ...values,
        quantiteTotale,
        montantActuel,
        montantTotal: montantTotalCalc
      }
    })
  }, [avenants, avenantValues]);

  // Calcul du résumé
  useEffect(() => {
    const totalCommandeInitialeRaw = memoizedCalculatedLignes.reduce((acc, ligne) => {
      if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') {
        return acc
      }
      return {
        precedent: acc.precedent + ligne.montantPrecedent,
        actuel: acc.actuel + ligne.montantActuel,
        total: acc.total + ligne.montantTotal
      }
    }, { precedent: 0, actuel: 0, total: 0 })

    const totalCommandeInitiale = {
      precedent: roundToTwoDecimals(totalCommandeInitialeRaw.precedent),
      actuel: roundToTwoDecimals(totalCommandeInitialeRaw.actuel),
      total: roundToTwoDecimals(totalCommandeInitialeRaw.total)
    }

    const totalAvenantsRaw = memoizedCalculatedAvenants.reduce((acc, avenant) => {
      // Exclure les TITRE et SOUS_TITRE des calculs
      if (avenant.type === 'TITRE' || avenant.type === 'SOUS_TITRE') {
        return acc
      }
      return {
      precedent: acc.precedent + avenant.montantPrecedent,
      actuel: acc.actuel + avenant.montantActuel,
      total: acc.total + avenant.montantTotal
      }
    }, { precedent: 0, actuel: 0, total: 0 })

    const totalAvenants = {
      precedent: roundToTwoDecimals(totalAvenantsRaw.precedent),
      actuel: roundToTwoDecimals(totalAvenantsRaw.actuel),
      total: roundToTwoDecimals(totalAvenantsRaw.total)
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

  // Gestion des modifications de quantité
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
      
      const quantiteExacte = nouvelleQuantite;
      
      console.log(`Enregistrement de la quantité: ${quantiteExacte} pour la ligne ${ligneId}`);

      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${etatId}/lignes/${ligneId}`, {
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
      setQuantites(prev => ({
        ...prev,
        [ligneId]: quantiteExacte
      }))

    } catch (error) {
      console.error('Erreur détaillée:', error)
      toast.error('Erreur lors de la mise à jour de la quantité')
    }
  }

  // Ajout d'avenant
  const handleAddAvenant = async () => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${etatId}/avenants`, {
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
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de l\'ajout de l\'avenant')
    }
  }

  // Modification d'avenant
  const handleAvenantChange = async (avenantId: number, field: string, value: string | number) => {
    try {
      setIsLoading(true);
      
      // Mettre à jour l'état local immédiatement
      setAvenantValues(prev => ({
        ...prev,
        [avenantId]: {
          ...(prev[avenantId] || {} as AvenantValues),
          [field]: value
        } as AvenantValues
      }))

      const avenant = etatAvancement.avenants.find(a => a.id === avenantId)
      if (!avenant) {
        throw new Error('Avenant non trouvé')
      }

      // Récupérer les valeurs mises à jour
      const updatedValues = {
        ...(avenantValues[avenantId] || {} as AvenantValues),
        [field]: value
      };

      const exactValues = {
        article: updatedValues.article !== undefined ? updatedValues.article : avenant.article,
        description: updatedValues.description !== undefined ? updatedValues.description : avenant.description,
        type: updatedValues.type !== undefined ? updatedValues.type : avenant.type,
        unite: updatedValues.unite !== undefined ? updatedValues.unite : avenant.unite,
        prixUnitaire: updatedValues.prixUnitaire !== undefined ? updatedValues.prixUnitaire : avenant.prixUnitaire,
        quantite: updatedValues.quantite !== undefined ? updatedValues.quantite : avenant.quantite,
        quantiteActuelle: updatedValues.quantiteActuelle !== undefined ? updatedValues.quantiteActuelle : avenant.quantiteActuelle,
        quantitePrecedente: updatedValues.quantitePrecedente !== undefined ? updatedValues.quantitePrecedente : avenant.quantitePrecedente,
        quantiteTotale: updatedValues.quantiteTotale !== undefined ? updatedValues.quantiteTotale : avenant.quantiteTotale,
        montantPrecedent: updatedValues.montantPrecedent !== undefined ? updatedValues.montantPrecedent : avenant.montantPrecedent,
        montantActuel: updatedValues.montantActuel !== undefined ? updatedValues.montantActuel : avenant.montantActuel,
        montantTotal: updatedValues.montantTotal !== undefined ? updatedValues.montantTotal : avenant.montantTotal
      };

      const quantiteActuelle = exactValues.quantiteActuelle
      const prixUnitaire = exactValues.prixUnitaire

      const montantActuel = roundToTwoDecimals(quantiteActuelle * prixUnitaire)
      const montantTotal = roundToTwoDecimals(montantActuel + avenant.montantPrecedent)

      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${etatId}/avenants/${avenantId}`, {
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
          montantActuel: montantActuel,
          montantTotal: montantTotal
        }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'avenant')
      }

      const serverAvenant = await response.json()
      
      // Conserver les valeurs exactes saisies par l'utilisateur
      setAvenantValues(prev => ({
        ...prev,
        [avenantId]: exactValues
      }));
      
      // Mettre à jour l'avenant dans la liste
      setAvenants(prev => prev.map(a => {
        if (a.id === avenantId) {
          return {
            ...serverAvenant,
            [field]: exactValues[field as keyof AvenantValues]
          };
        }
        return a;
      }));

    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'avenant:', error)
      toast.error('Erreur lors de la mise à jour de l\'avenant')
    } finally {
      setIsLoading(false)
    }
  }

  // Sauvegarde des commentaires
  const handleSaveComments = async () => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: commentaires,
          estFinalise: etatAvancement.estFinalise
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la mise à jour des commentaires')
      }

      const updatedEtat = await response.json()
      
      // Mettre à jour l'état local avec la réponse du serveur
      setIsEditingComments(false);
      setCommentaires(updatedEtat.commentaires || '');
      
      toast.success('Commentaires enregistrés avec succès');
      
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour des commentaires')
      setIsEditingComments(true);
    }
  }

  // Suppression d'avenant
  const handleDeleteAvenant = async (avenantId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet avenant ?')) {
      return
    }

    try {
      setIsLoading(true)
      
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement/${etatId}/avenants/${avenantId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        toast.error(data.error || 'Erreur lors de la suppression de l\'avenant')
        return
      }

      // Mettre à jour l'état local
      setAvenants(avenants.filter(a => a.id !== avenantId))
      toast.success('Avenant supprimé avec succès')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la suppression de l\'avenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Résumé financier */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Résumé financier</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Commande initiale</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMontant(summary.totalCommandeInitiale.total)} €
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avenants</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMontant(summary.totalAvenants.total)} €
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total général</h3>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatMontant(summary.totalGeneral.total)} €
            </p>
          </div>
        </div>
      </div>

      {/* Tableau des lignes de commande */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lignes de commande
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Article</th>
                <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unité</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">P.U.</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qté</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Précédent</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Actuel</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mont. Préc.</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Mont. Act.</th>
                <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mont. Tot.</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {memoizedCalculatedLignes.map((ligne) => {
                const isSectionHeader = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';

                if (isSectionHeader) {
                  return (
                    <tr
                      key={`${ligne.id}-section`}
                      className={`${ligne.type === 'TITRE' ? 'bg-blue-50/80 dark:bg-blue-900/30' : 'bg-gray-100/80 dark:bg-gray-800/40'}`}
                    >
                      <td
                        colSpan={12}
                        className="px-3 py-4 text-sm font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-100"
                      >
                        {ligne.description || ligne.article}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={ligne.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/10">
                    <td className="px-2 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="truncate max-w-[80px]" title={ligne.article}>
                        {ligne.article}
                      </div>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-900 dark:text-gray-200">
                      <div className="break-words whitespace-normal" title={ligne.description}>
                        {ligne.description}
                      </div>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                        {ligne.type}
                      </span>
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-center">{ligne.unite}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">{formatMontant(ligne.prixUnitaire)} €</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 text-right">{ligne.quantite.toLocaleString('fr-FR')}</td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                      {ligne.quantitePrecedente.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20 border-r border-blue-200 dark:border-blue-700 shadow-sm">
                      {!etatAvancement.estFinalise ? (
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
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-semibold">
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Avenants
          </h2>
          {!etatAvancement.estFinalise && (
            <button
              onClick={handleAddAvenant}
              className="inline-flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Ajouter un avenant
            </button>
          )}
        </div>
        
        {avenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Article</th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Unité</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">P.U.</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Qté</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Précédent</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Actuel</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mont. Préc.</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-blue-50 dark:bg-blue-900/20">Mont. Act.</th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Mont. Tot.</th>
                  <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
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
                        className={`${avenant.type === 'TITRE' ? 'bg-green-50/80 dark:bg-green-900/30' : 'bg-gray-100/80 dark:bg-gray-800/40'}`}
                      >
                        <td
                          colSpan={13}
                          className="px-3 py-4 text-sm font-semibold uppercase tracking-wide text-green-900 dark:text-green-100"
                        >
                          {avenant.description || avenant.article}
                        </td>
                      </tr>
                    );
                  }

                  return (
                  <tr
                    key={`avenant-${avenant.id}-${index}`}
                    className="hover:bg-green-50 dark:hover:bg-green-900/10"
                  >
                    <td className="px-2 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <input
                          type="text"
                          value={avenantValues[avenant.id]?.article || avenant.article}
                          onChange={(e) => handleAvenantChange(avenant.id, 'article', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      ) : (
                        <div className="truncate max-w-[80px]" title={avenant.article}>
                          <span className="text-gray-700 dark:text-gray-300">{avenant.article}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <textarea
                          value={avenantValues[avenant.id]?.description || avenant.description}
                          onChange={(e) => {
                            handleAvenantChange(avenant.id, 'description', e.target.value)
                            // auto-resize uniquement si nécessaire
                            e.currentTarget.style.height = 'auto'
                            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                          rows={1}
                          style={{ height: 'auto' }}
                        />
                      ) : (
                        <div className="break-words whitespace-normal" title={avenant.description}>
                          <span className="text-gray-700 dark:text-gray-300">{avenant.description}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-center">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <select
                          value={avenantValues[avenant.id]?.type || avenant.type}
                          onChange={(e) => handleAvenantChange(avenant.id, 'type', e.target.value)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="QP">QP</option>
                          <option value="FF">FF</option>
                          <option value="DF">DF</option>
                          <option value="TITRE">TITRE</option>
                          <option value="SOUS_TITRE">SOUS-TITRE</option>
                        </select>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-700 text-green-800 dark:text-green-200 rounded-full">
                          {avenant.type}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-center">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
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
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <NumericInput
                          value={avenantValues[avenant.id]?.prixUnitaire ?? avenant.prixUnitaire}
                          onChangeNumber={(val) => handleAvenantChange(avenant.id, 'prixUnitaire', val)}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      ) : (
                        <span className="font-medium text-right text-gray-700 dark:text-gray-300">
                          {`${formatMontant(avenant.prixUnitaire)} €`}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                      {!etatAvancement.estFinalise && !isFromPreviousState ? (
                        <NumericInput
                          value={avenantValues[avenant.id]?.quantite ?? avenant.quantite}
                          onChangeNumber={(val) => handleAvenantChange(avenant.id, 'quantite', val)}
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                      ) : (
                        <span className="text-gray-700 dark:text-gray-300">
                          {avenant.quantite.toLocaleString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                      {avenant.quantitePrecedente.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/20 border-r border-green-200 dark:border-green-700 shadow-sm">
                      {!etatAvancement.estFinalise ? (
                        <NumericInput
                          value={avenantValues[avenant.id]?.quantiteActuelle ?? avenant.quantiteActuelle}
                          onChangeNumber={(val) => handleAvenantChange(avenant.id, 'quantiteActuelle', val)}
                          step="0.01"
                          className="w-full px-3 py-2 border-2 border-green-300 dark:border-green-600 rounded-lg text-center bg-white/90 dark:bg-gray-800/90 text-green-900 dark:text-green-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold shadow-sm transition-all duration-200 backdrop-blur-sm"
                        />
                      ) : (
                        <span className="font-bold text-center text-green-800 dark:text-green-300 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent block">
                          {avenant.quantiteActuelle.toLocaleString('fr-FR')}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                      {avenant.quantiteTotale.toLocaleString('fr-FR')}
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right">
                      {formatMontant(avenant.montantPrecedent)} €
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 text-right font-medium">
                      {formatMontant(avenant.montantActuel)} €
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right font-semibold">
                      {formatMontant(avenant.montantTotal)} €
                    </td>
                    <td className="px-2 py-4 whitespace-nowrap text-center">
                      {!etatAvancement.estFinalise && !isFromPreviousState && (
                        <button
                          onClick={() => handleDeleteAvenant(avenant.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
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
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <PlusIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aucun avenant ajouté</p>
            {!etatAvancement.estFinalise && (
              <p className="text-sm mt-1">Cliquez sur "Ajouter un avenant" pour commencer</p>
            )}
          </div>
        )}
      </div>

      {/* Section commentaires */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <svg className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m0 0v8a2 2 0 002 2h6a2 2 0 002-2V8M9 12h6" />
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
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 flex items-center text-sm"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              rows={4}
              placeholder="Ajoutez vos commentaires ici..."
            />
          ) : (
            <div className="min-h-[100px] p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              {commentaires ? (
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{commentaires}</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">Aucun commentaire</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

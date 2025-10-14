'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  ShoppingCartIcon,
  DocumentTextIcon,
  CurrencyEuroIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import NumericInput from '@/components/ui/NumericInput'

interface LigneCommande {
  id: number;
  commandeId: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
}

interface Commande {
  id: number;
  reference: string;
  lignes: LigneCommande[];
}

export default function SelectionPostesPage() {
  const { chantierId } = useParams();
  const searchParams = useSearchParams();
  const soustraitantId = searchParams.get('soustraitantId');
  const router = useRouter();
  
  const [commande, setCommande] = useState<Commande | null>(null);
  const [selectedLignes, setSelectedLignes] = useState<Map<number, LigneCommande>>(new Map());
  const [modifiedLignes, setModifiedLignes] = useState<Map<number, { quantite: number, prixUnitaire: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!soustraitantId) {
      toast.error('ID du sous-traitant manquant');
      router.push(`/chantiers/${chantierId}/etats/soustraitants`);
      return;
    }
    
    const fetchCommande = async () => {
      try {
        setLoading(true);
        // Récupérer la commande client validée
        const response = await fetch(`/api/chantiers/${chantierId}/commande`);
        
        if (!response.ok) {
          if (response.status === 404) {
            toast.error('Aucune commande validée trouvée pour ce chantier');
          } else {
            toast.error('Erreur lors de la récupération de la commande client');
          }
          return;
        }
        
        const data = await response.json();
        setCommande(data);
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCommande();
  }, [chantierId, soustraitantId, router]);

  const handleSelectLigne = (ligne: LigneCommande) => {
    const newSelectedLignes = new Map(selectedLignes);
    
    if (newSelectedLignes.has(ligne.id)) {
      newSelectedLignes.delete(ligne.id);
      
      // Supprimer également des lignes modifiées
      const newModifiedLignes = new Map(modifiedLignes);
      newModifiedLignes.delete(ligne.id);
      setModifiedLignes(newModifiedLignes);
    } else {
      newSelectedLignes.set(ligne.id, ligne);
      
      // Initialiser avec les valeurs actuelles
      if (!modifiedLignes.has(ligne.id)) {
        const newModifiedLignes = new Map(modifiedLignes);
        newModifiedLignes.set(ligne.id, {
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire
        });
        setModifiedLignes(newModifiedLignes);
      }
    }
    
    setSelectedLignes(newSelectedLignes);
  };

  const handleQuantiteChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    
    newModifiedLignes.set(ligneId, {
      ...currentValues,
      quantite: value === '' ? 0 : parseFloat(value)
    });
    
    setModifiedLignes(newModifiedLignes);
  };

  const handlePrixChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const currentValues = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    
    newModifiedLignes.set(ligneId, {
      ...currentValues,
      prixUnitaire: value === '' ? 0 : parseFloat(value)
    });
    
    setModifiedLignes(newModifiedLignes);
  };

  const handleSubmit = async () => {
    if (selectedLignes.size === 0) {
      toast.error('Veuillez sélectionner au moins un poste');
      return;
    }

    try {
      setSubmitting(true);
      
      // Préparer les lignes pour la création de la commande sous-traitant
      const lignesArray = Array.from(selectedLignes.values()).map(ligne => {
        const modifiedValues = modifiedLignes.get(ligne.id);
        return {
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: modifiedValues?.prixUnitaire || ligne.prixUnitaire,
          quantite: modifiedValues?.quantite || ligne.quantite
        };
      });
      
      // Créer la commande sous-traitant
      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/commandes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
          lignes: lignesArray,
          reference: commande?.reference || `Commande ST - ${new Date().toISOString().split('T')[0]}`,
          tauxTVA: 0
        }),
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la commande sous-traitant');
      }
      
      const result = await response.json();
      
      toast.success('Commande sous-traitant créée avec succès');
      // Rediriger vers la page de détail de la commande sous-traitant
      router.push(`/chantiers/${chantierId}/etats/soustraitants/${soustraitantId}/commande/${result.id}`);
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la création de la commande sous-traitant');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push(`/chantiers/${chantierId}/etats/soustraitants`);
  };

  const calculateTotal = () => {
    let total = 0;
    selectedLignes.forEach((ligne) => {
      const modifiedValues = modifiedLignes.get(ligne.id);
      const quantite = modifiedValues?.quantite ?? ligne.quantite;
      const prix = modifiedValues?.prixUnitaire ?? ligne.prixUnitaire;
      total += quantite * prix;
    });
    return total;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Chargement des postes disponibles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8 px-4 space-y-8">
        {/* En-tête avec navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link href={`/chantiers/${chantierId}/etats/soustraitants`}>
              <Button 
                variant="outline" 
                className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 dark:from-white dark:to-blue-400 bg-clip-text text-transparent">
                Sélection des postes
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Choisissez les postes à sous-traiter
              </p>
            </div>
          </div>
          
          {/* Résumé de sélection */}
          {selectedLignes.size > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200 dark:bg-gray-800/80 dark:border-gray-700">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center text-blue-600 dark:text-blue-400">
                  <CheckCircleIcon className="h-5 w-5 mr-1" />
                  <span className="font-semibold">{selectedLignes.size} poste{selectedLignes.size > 1 ? 's' : ''} sélectionné{selectedLignes.size > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center text-green-600 dark:text-green-400">
                  <CurrencyEuroIcon className="h-5 w-5 mr-1" />
                  <span className="font-bold">{calculateTotal().toFixed(2)} €</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Carte principale */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Postes disponibles - Commande client</CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  Sélectionnez et modifiez les postes à inclure dans la commande sous-traitant
                </p>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {!commande ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="h-8 w-8 text-red-500" />
                </div>
                <p className="text-red-600 dark:text-red-400 font-medium text-lg">
                  Aucune commande client validée trouvée pour ce chantier
                </p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Veuillez d'abord valider une commande client pour ce chantier
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <colgroup>
                        <col style={{ width: '60px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '80px' }} />
                        <col style={{ width: '120px' }} />
                        <col style={{ width: '140px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600">
                          <th className="px-4 py-4 text-left font-semibold text-gray-700 dark:text-gray-200">
                            <div className="flex items-center">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                            </div>
                          </th>
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
                            Type
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
                              Prix unit.
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {commande.lignes.map((ligne, index) => {
                          const isSelected = selectedLignes.has(ligne.id);
                          const modifiedValues = modifiedLignes.get(ligne.id);
                          const quantite = modifiedValues?.quantite ?? ligne.quantite;
                          const prix = modifiedValues?.prixUnitaire ?? ligne.prixUnitaire;
                          
                          return (
                            <tr 
                              key={ligne.id} 
                              className={`
                                border-b border-gray-100 dark:border-gray-700 transition-all duration-200
                                ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750'}
                                ${isSelected 
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-sm' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                }
                              `}
                            >
                              <td className="px-4 py-4">
                                <label className="flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={isSelected}
                                    onChange={() => handleSelectLigne(ligne)}
                                    className="h-5 w-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                    disabled={!commande}
                                  />
                                  <span className="sr-only">Sélectionner ce poste</span>
                                </label>
                              </td>
                              
                              <td className="px-4 py-4">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  {ligne.article}
                                </span>
                              </td>
                              
                              <td className="px-4 py-4">
                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                  {ligne.description}
                                </div>
                              </td>
                              
                              <td className="px-4 py-4 text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  ligne.type === 'QP' 
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}>
                                  {ligne.type}
                                </span>
                              </td>
                              
                              <td className="px-4 py-4 text-center">
                                <span className="text-gray-600 dark:text-gray-300 font-medium">
                                  {ligne.unite}
                                </span>
                              </td>
                              
                              <td className="px-4 py-4 text-right">
                                {isSelected ? (
                                  <NumericInput
                                    value={quantite}
                                    onChangeNumber={(val)=> handleQuantiteChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-20 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                                    disabled={!commande}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {ligne.quantite}
                                  </span>
                                )}
                              </td>
                              
                              <td className="px-4 py-4 text-right">
                                {isSelected ? (
                                  <NumericInput
                                    value={prix}
                                    onChangeNumber={(val)=> handlePrixChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-24 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 font-medium"
                                    disabled={!commande}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {ligne.prixUnitaire.toFixed(2)} €
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Section de résumé et actions */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {selectedLignes.size > 0 && (
                    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <ShoppingCartIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Résumé de la sélection
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {selectedLignes.size}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Poste{selectedLignes.size > 1 ? 's' : ''} sélectionné{selectedLignes.size > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {calculateTotal().toFixed(2)} €
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">
                            Total HT
                          </div>
                        </div>
                        {/* Bloc TTC supprimé à la demande */}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <Button 
                      variant="outline" 
                      onClick={handleCancel} 
                      disabled={submitting}
                      className="bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm transition-all duration-200"
                    >
                      Annuler
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={submitting || !commande || selectedLignes.size === 0}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Valider et créer la commande
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 
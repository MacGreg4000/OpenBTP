'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  HashtagIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
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

interface LigneTarif {
  id: string;
  article: string | null;
  descriptif: string;
  unite: string | null;
  prixUnitaire: number | null;
  remarques: string | null;
  type: string;
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

  // Panneau tarifs ST
  const [tarifsPanelOpen, setTarifsPanelOpen] = useState(false);
  const [tarifs, setTarifs] = useState<LigneTarif[]>([]);
  const [tarifsLoading, setTarifsLoading] = useState(false);
  const [tarifsSearch, setTarifsSearch] = useState('');
  const [soustraitantNom, setSoustraitantNom] = useState('');

  useEffect(() => {
    if (!soustraitantId) {
      toast.error('ID du sous-traitant manquant');
      router.push(`/chantiers/${chantierId}/etats/soustraitants`);
      return;
    }

    const fetchCommande = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/chantiers/${chantierId}/commande`);
        if (!res.ok) {
          if (res.status === 404) toast.error('Aucune commande validée trouvée pour ce chantier');
          else toast.error('Erreur lors de la récupération de la commande client');
          return;
        }
        const data = await res.json();
        setCommande(data);
      } catch {
        toast.error('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };

    fetchCommande();
  }, [chantierId, soustraitantId, router]);

  const openTarifsPanel = async () => {
    setTarifsPanelOpen(true);
    if (tarifs.length > 0) return;
    setTarifsLoading(true);
    try {
      const [tarifsRes, stRes] = await Promise.all([
        fetch(`/api/sous-traitants/${soustraitantId}/tarifs`),
        fetch(`/api/sous-traitants/${soustraitantId}`)
      ]);
      if (tarifsRes.ok) setTarifs(await tarifsRes.json());
      if (stRes.ok) {
        const st = await stRes.json();
        setSoustraitantNom(st.nom || st.name || '');
      }
    } catch {
      // silencieux
    } finally {
      setTarifsLoading(false);
    }
  };

  const filteredTarifs = useMemo(() => {
    if (!tarifsSearch.trim()) return tarifs;
    const q = tarifsSearch.toLowerCase();
    return tarifs.filter(t =>
      t.descriptif?.toLowerCase().includes(q) ||
      t.article?.toLowerCase().includes(q) ||
      t.remarques?.toLowerCase().includes(q)
    );
  }, [tarifs, tarifsSearch]);

  const handleSelectLigne = (ligne: LigneCommande) => {
    const newSelectedLignes = new Map(selectedLignes);

    if (newSelectedLignes.has(ligne.id)) {
      newSelectedLignes.delete(ligne.id);
      const newModifiedLignes = new Map(modifiedLignes);
      newModifiedLignes.delete(ligne.id);
      setModifiedLignes(newModifiedLignes);
    } else {
      newSelectedLignes.set(ligne.id, ligne);
      if (!modifiedLignes.has(ligne.id)) {
        const newModifiedLignes = new Map(modifiedLignes);
        newModifiedLignes.set(ligne.id, { quantite: ligne.quantite, prixUnitaire: ligne.prixUnitaire });
        setModifiedLignes(newModifiedLignes);
      }
    }

    setSelectedLignes(newSelectedLignes);
  };

  // « Tout cocher » : coche toutes les lignes (titres compris, comme un clic ligne
  // par ligne) en gardant les quantités / prix déjà modifiés ; décoche tout sinon.
  const lignesCommande = commande?.lignes || []
  const toutCoche = lignesCommande.length > 0 && lignesCommande.every((l) => selectedLignes.has(l.id))
  const handleToutCocher = () => {
    if (toutCoche) {
      setSelectedLignes(new Map())
      setModifiedLignes(new Map())
      return
    }
    const nouvellesSel = new Map(selectedLignes)
    const nouvellesMod = new Map(modifiedLignes)
    for (const l of lignesCommande) {
      nouvellesSel.set(l.id, l)
      if (!nouvellesMod.has(l.id)) nouvellesMod.set(l.id, { quantite: l.quantite, prixUnitaire: l.prixUnitaire })
    }
    setSelectedLignes(nouvellesSel)
    setModifiedLignes(nouvellesMod)
  }

  const handleQuantiteChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const current = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    newModifiedLignes.set(ligneId, { ...current, quantite: value === '' ? 0 : parseFloat(value) });
    setModifiedLignes(newModifiedLignes);
  };

  const handlePrixChange = (ligneId: number, value: string) => {
    const newModifiedLignes = new Map(modifiedLignes);
    const current = newModifiedLignes.get(ligneId) || { quantite: 0, prixUnitaire: 0 };
    newModifiedLignes.set(ligneId, { ...current, prixUnitaire: value === '' ? 0 : parseFloat(value) });
    setModifiedLignes(newModifiedLignes);
  };

  const handleSubmit = async () => {
    if (selectedLignes.size === 0) {
      toast.error('Veuillez sélectionner au moins un poste');
      return;
    }

    try {
      setSubmitting(true);
      const lignesArray = Array.from(selectedLignes.values()).map(ligne => {
        const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';
        const modifiedValues = modifiedLignes.get(ligne.id);
        if (isSection) {
          return { article: ligne.article, description: ligne.description, type: ligne.type, unite: '', prixUnitaire: 0, quantite: 0 };
        }
        return {
          article: ligne.article,
          description: ligne.description,
          type: ligne.type,
          unite: ligne.unite,
          prixUnitaire: modifiedValues?.prixUnitaire || ligne.prixUnitaire,
          quantite: modifiedValues?.quantite || ligne.quantite
        };
      });

      const response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/commandes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lignes: lignesArray,
          reference: commande?.reference || `Commande ST - ${new Date().toISOString().split('T')[0]}`,
          tauxTVA: 0
        }),
      });

      if (!response.ok) throw new Error();
      const result = await response.json();
      toast.success('Commande sous-traitant créée avec succès');
      router.push(`/chantiers/${chantierId}/etats/soustraitants/${soustraitantId}/commande/${result.id}`);
    } catch {
      toast.error('Erreur lors de la création de la commande sous-traitant');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    selectedLignes.forEach((ligne) => {
      if (ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE') return;
      const mod = modifiedLignes.get(ligne.id);
      total += (mod?.quantite ?? ligne.quantite) * (mod?.prixUnitaire ?? ligne.prixUnitaire);
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

        {/* En-tête */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Link href={`/chantiers/${chantierId}/etats/soustraitants`}>
              <Button variant="outline" className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-white hover:shadow-md transition-all duration-200">
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

          <div className="flex items-center gap-3">
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

            <button
              onClick={tarifsPanelOpen ? () => setTarifsPanelOpen(false) : openTarifsPanel}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md ${
                tarifsPanelOpen
                  ? 'bg-blue-600 text-white shadow-inner'
                  : 'bg-white/80 backdrop-blur-sm text-blue-700 dark:text-blue-300 dark:bg-gray-800/80 border border-blue-200 dark:border-blue-700 hover:bg-white dark:hover:bg-gray-700'
              }`}
            >
              <ClipboardDocumentListIcon className="h-5 w-5" />
              {tarifsPanelOpen ? 'Fermer tarifs' : 'Tarifs ST'}
            </button>
          </div>
        </div>

        {/* Carte principale */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Postes disponibles — Commande client</CardTitle>
                <p className="text-blue-100 text-sm mt-1">
                  Consultez le bordereau du sous-traitant avec le bouton <span className="font-semibold">Tarifs ST</span> en haut à droite
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
                <p className="text-red-600 dark:text-red-400 font-medium text-lg">Aucune commande client validée trouvée pour ce chantier</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Veuillez d&apos;abord valider une commande client pour ce chantier</p>
              </div>
            ) : (
              <>
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <colgroup>
                        <col style={{ width: '52px' }} />
                        <col style={{ width: '72px' }} />
                        <col />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '68px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 border-b border-gray-200 dark:border-gray-600">
                          <th className="px-4 py-3 text-left">
                            <input
                              type="checkbox"
                              checked={toutCoche}
                              ref={(el) => {
                                if (el) el.indeterminate = !toutCoche && selectedLignes.size > 0
                              }}
                              onChange={handleToutCocher}
                              title={toutCoche ? 'Tout décocher' : 'Tout cocher'}
                              aria-label={toutCoche ? 'Tout décocher' : 'Tout cocher'}
                              className="h-5 w-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
                            />
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            <div className="flex items-center gap-1"><HashtagIcon className="h-3.5 w-3.5" />Art.</div>
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Description</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Type</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Unité</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Quantité</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                            <div className="flex items-center justify-end gap-1"><CurrencyEuroIcon className="h-3.5 w-3.5" />Prix unit.</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {commande.lignes.map((ligne, index) => {
                          const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE';
                          const isSelected = selectedLignes.has(ligne.id);
                          const mod = modifiedLignes.get(ligne.id);

                          return (
                            <tr
                              key={ligne.id}
                              className={`
                                border-b border-gray-100 dark:border-gray-700 transition-all duration-200
                                ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750'}
                                ${isSelected
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700 shadow-sm'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                                ${isSection ? 'bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700/60 dark:to-slate-700/40' : ''}
                              `}
                            >
                              <td className="px-4 py-3">
                                <label className="flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectLigne(ligne)}
                                    className="h-5 w-5 text-blue-600 border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                                  />
                                </label>
                              </td>

                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  {ligne.article}
                                </span>
                              </td>

                              <td className="px-4 py-3">
                                <div className={`font-medium ${isSection ? 'text-gray-900 dark:text-white uppercase text-xs tracking-wide' : 'text-gray-900 dark:text-gray-100'}`}>
                                  {ligne.description}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-center">
                                {!isSection && (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    ligne.type === 'QP'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                  }`}>
                                    {ligne.type}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">{ligne.unite}</span>
                              </td>

                              <td className="px-4 py-3 text-right">
                                {isSection ? (
                                  <span className="text-gray-400">—</span>
                                ) : isSelected ? (
                                  <NumericInput
                                    value={mod?.quantite ?? ligne.quantite}
                                    onChangeNumber={val => handleQuantiteChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-20 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                  />
                                ) : (
                                  <span className="font-medium text-gray-900 dark:text-gray-100">{ligne.quantite}</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-right">
                                {isSection ? (
                                  <span className="text-gray-400">—</span>
                                ) : isSelected ? (
                                  <NumericInput
                                    value={mod?.prixUnitaire ?? ligne.prixUnitaire}
                                    onChangeNumber={val => handlePrixChange(ligne.id, String(val))}
                                    step="0.01"
                                    className="w-24 px-3 py-2 text-right border-2 border-blue-200 rounded-lg bg-white dark:bg-gray-700 dark:border-blue-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
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

                {/* Résumé et actions */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 border-t border-gray-200 dark:border-gray-600">
                  {selectedLignes.size > 0 && (
                    <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                        <ShoppingCartIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Résumé de la sélection
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedLignes.size}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Poste{selectedLignes.size > 1 ? 's' : ''} sélectionné{selectedLignes.size > 1 ? 's' : ''}</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{calculateTotal().toFixed(2)} €</div>
                          <div className="text-sm text-gray-600 dark:text-gray-300">Total HT</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/chantiers/${chantierId}/etats/soustraitants`)}
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
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />Création en cours...</>
                      ) : (
                        <><CheckCircleIcon className="h-4 w-4 mr-2" />Valider et créer la commande</>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Panneau latéral tarifs ST */}
      {tarifsPanelOpen && (
        <div className="fixed top-0 right-0 h-full w-80 z-[110] flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shrink-0">
            <div className="min-w-0">
              <p className="text-xs opacity-75">Liste de prix</p>
              <p className="font-semibold text-sm truncate">{soustraitantNom || 'Sous-traitant'}</p>
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
                  );
                  if (tarif.type === 'SOUS_TITRE') return (
                    <div key={tarif.id} className="px-4 py-1.5 bg-gray-50 dark:bg-gray-800/50">
                      <p className="text-xs font-semibold italic text-gray-500 dark:text-gray-400">{tarif.descriptif}</p>
                    </div>
                  );
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
                  );
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
  );
}

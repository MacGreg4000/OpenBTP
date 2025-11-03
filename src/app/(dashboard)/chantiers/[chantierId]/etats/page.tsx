'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { 
  PlusIcon,
  EyeIcon,
  TrashIcon,
  EnvelopeIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { EtatAvancement, EtatAvancementEtendu } from '@/types/etat-avancement'
// Link non utilisé
import SousTraitantSelectModal from '@/components/SousTraitantSelectModal'
import { toast } from 'react-hot-toast' // Toaster déplacé vers RootClientProviders
import { DepenseSection } from '@/components'
import CardFinancialSummary from '@/components/CardFinancialSummary'
import React from 'react'
import type { Chantier } from '@/types/chantier'
import EmailEtatAvancementModal from '@/components/EmailEtatAvancementModal'

interface SousTraitant {
  soustraitantId: string;
  nom: string;
  etatsAvancement: EtatAvancementEtendu[];
  commande: {
    id: string | number;
    reference?: string;
    dateCommande: string;
    total: number;
    estVerrouillee: boolean;
  };
}

interface CommandeSousTraitant {
  id: number
  soustraitantId: string
  soustraitantNom: string
  reference: string
  dateCommande: string
  total: number
  estVerrouillee: boolean
}

interface PageProps {
  params: Promise<{
    chantierId: string
  }>
}

export default function ChantierEtatsPage(props: PageProps) {
  const params = use(props.params);
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showSelectModal, setShowSelectModal] = useState(false)
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [etatsAvancement, setEtatsAvancement] = useState<EtatAvancement[]>([])
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  // const [selectedSoustraitant, setSelectedSoustraitant] = useState<string | null>(null)
  const [_isCreating, setIsCreating] = useState(false)
  const [chantierId, setChantierId] = useState<string | null>(null)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEtatForEmail, setSelectedEtatForEmail] = useState<EtatAvancementEtendu | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<{[key: string]: boolean}>({
    client: false,
    soustraitants: false
  })

  // Fonction pour rafraîchir les données d'un sous-traitant spécifique
  const refreshSoustraitantData = async (soustraitantId: string) => {
    try {
      const etatsResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/${soustraitantId}/etats-avancement`);
      if (etatsResponse.ok) {
        const etatsData = await etatsResponse.json();
        // Ajouter les propriétés typeSoustraitant et soustraitantId à chaque état
        const etatsAvecType = etatsData.map((etat: EtatAvancement) => ({
          ...etat,
          typeSoustraitant: true,
          soustraitantId: soustraitantId
        }));
        
        // Mettre à jour seulement ce sous-traitant dans l'état local
        setSousTraitants(prev => prev.map(st => 
          st.soustraitantId === soustraitantId 
            ? { ...st, etatsAvancement: etatsAvecType }
            : st
        ));
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données:', error);
      toast.error('Erreur lors de la mise à jour des données');
    }
  };

  

  // Attendre les paramètres de route
  useEffect(() => {
    const initParams = async () => {
      const awaitedParams = await params;
      setChantierId(awaitedParams.chantierId);
    };
    
    initParams();
  }, [params]);

  // Charger les données du chantier et des états d'avancement
  useEffect(() => {
    if (!session || !chantierId || dataLoaded) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Récupérer les informations du chantier
        const chantierPromise = fetch(`/api/chantiers/${chantierId}`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération du chantier');
            return res.json();
          });
        
        // Récupérer les états d'avancement client
        const etatsPromise = fetch(`/api/chantiers/${chantierId}/etats-avancement`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération des états d\'avancement');
            return res.json();
          });
        
        // Récupérer les sous-traitants et leurs commandes
        const commandesPromise = fetch(`/api/chantiers/${chantierId}/soustraitants/commandes`)
          .then(res => {
            if (!res.ok) throw new Error('Erreur lors de la récupération des commandes des sous-traitants');
            return res.json();
          });
        
        // Attendre que toutes les requêtes principales soient terminées
        const [chantierData, etatData, commandesData] = await Promise.all([
          chantierPromise,
          etatsPromise,
          commandesPromise
        ]);
        
        setChantier(chantierData);
        setEtatsAvancement(etatData);
        
        // Pour chaque sous-traitant avec commande, récupérer les états d'avancement en parallèle
        const etatsPromises = commandesData.map(async (commande: CommandeSousTraitant) => {
          try {
            const etatsResponse = await fetch(`/api/chantiers/${chantierId}/soustraitants/${commande.soustraitantId}/etats-avancement`);
            
            if (etatsResponse.ok) {
              const etatsData = await etatsResponse.json();
              
              // Ajouter les propriétés typeSoustraitant et soustraitantId à chaque état
              const etatsAvecType = etatsData.map((etat: EtatAvancement) => ({
                ...etat,
                typeSoustraitant: true,
                soustraitantId: commande.soustraitantId
              }));
              
              return {
                soustraitantId: commande.soustraitantId,
                nom: commande.soustraitantNom,
                etatsAvancement: etatsAvecType,
                commande: {
                  id: commande.id,
                  reference: commande.reference,
                  dateCommande: commande.dateCommande,
                  total: commande.total,
                  estVerrouillee: commande.estVerrouillee
                }
              };
            }
            return null;
          } catch (error) {
            console.error(`Erreur lors de la récupération des états pour le sous-traitant ${commande.soustraitantId}:`, error);
            return null;
          }
        });
        
        const soustraitantsData = (await Promise.all(etatsPromises)).filter(data => data !== null) as SousTraitant[];
        setSousTraitants(soustraitantsData);
        setDataLoaded(true);
        
      } catch (error) {
        console.error(error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [session, chantierId, dataLoaded]);

  const handleCreateEtat = async () => {
    if (!chantierId) return;
    
    try {
      setIsCreating(true);
      
      // Appel à l'API pour créer un nouvel état d'avancement client
      const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chantierId: chantierId,
          date: new Date()
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Vérifier si l'état a été créé malgré l'erreur
        if (responseData.id || responseData.numero) {
          console.log('État créé malgré l\'erreur, redirection...', responseData);
          router.push(`/chantiers/${chantierId}/etats/${responseData.numero}`);
          toast.success('État d\'avancement créé avec succès');
          return;
        }
        throw new Error(responseData.error || 'Erreur lors de la création de l\'état d\'avancement');
      }
      
      // Rediriger vers le nouvel état
      router.push(`/chantiers/${chantierId}/etats/${responseData.numero}`);
      
      toast.success('État d\'avancement créé avec succès');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la création de l\'état d\'avancement');
    } finally {
      setIsCreating(false);
    }
  }

  const handleCreateSoustraitantEtat = (sousTraitantId: string) => {
    console.log('handleCreateSoustraitantEtat appelé avec:', { chantierId, sousTraitantId });
    if (!chantierId) {
      console.log('chantierId manquant, abandon');
      return;
    }
    
    setShowSelectModal(false);
    const url = `/chantiers/${chantierId}/etats/soustraitants/${sousTraitantId}/etat/nouveau`;
    console.log('Redirection vers:', url);
    router.push(url);
  }

  

  const navigateToNewSoustraitantCommandePage = (sousTraitantId: string) => {
    if (!chantierId) return;
    
    setShowSelectModal(false);
    router.push(`/chantiers/${chantierId}/etats/soustraitants/selection-postes?soustraitantId=${sousTraitantId}`);
  }

  

  const handleOpenEmailModal = (etat: EtatAvancementEtendu) => {
    setSelectedEtatForEmail(etat);
    setEmailModalOpen(true);
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  function TableEtatsAvancement({ etats, chantierIdValue }: { etats: EtatAvancementEtendu[]; chantierIdValue: string | null }) {
    const router = useRouter()
    
    const handleRowClick = React.useCallback((etat: EtatAvancementEtendu) => {
      if (!chantierIdValue) return;
      
      if (etat.typeSoustraitant && etat.soustraitantId) {
                          router.push(`/chantiers/${chantierIdValue}/etats/soustraitants/${etat.soustraitantId}/etat/${etat.id}`)
      } else {
        router.push(`/chantiers/${chantierIdValue}/etats/${etat.numero}`)
      }
    }, [chantierIdValue, router])
    
    // Fonction pour vérifier si un état peut être supprimé
    const canDeleteEtat = (etat: EtatAvancementEtendu, allEtats: EtatAvancementEtendu[]) => {
      // Ne pas permettre la suppression d'un état finalisé
      if (etat.estFinalise) return false;
      
      if (etat.typeSoustraitant) {
        // Pour un état sous-traitant, vérifier si c'est le dernier état (numéro le plus élevé)
        const isLastEtat = !allEtats.some(e => 
          e.typeSoustraitant && e.soustraitantId === etat.soustraitantId && e.numero > etat.numero
        );
        
        return isLastEtat;
      } else {
        // Pour un état client, vérifier si c'est le dernier état (numéro le plus élevé)
        const isLastEtat = !allEtats.some(e => 
          !e.typeSoustraitant && e.numero > etat.numero
        );
        
        return isLastEtat;
      }
    };
    
    // Fonction pour exporter un état d'avancement en Excel
    const exportEtatToExcel = async (etat: EtatAvancementEtendu) => {
      if (!chantierId) {
        toast.error('ID du chantier manquant');
        return;
      }

      try {
        const response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etat.id}/export-excel`);
        
        if (!response.ok) {
          throw new Error('Erreur lors de l\'export');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Etat_${chantierId}_${etat.numero}_${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        toast.success('État d\'avancement exporté avec succès');
      } catch (error) {
        console.error('Erreur lors de l\'export:', error);
        toast.error('Erreur lors de l\'export de l\'état d\'avancement');
      }
    };
    
    const handleDeleteEtat = async (e: React.MouseEvent, etat: EtatAvancementEtendu) => {
      if (!chantierId) return;
      
      e.stopPropagation();
      
      if (!confirm(`Êtes-vous sûr de vouloir supprimer l'état d'avancement n°${etat.numero} ?`)) {
        return;
      }
      
      try {
        setLoading(true);
        
        let response;
        
        if (etat.typeSoustraitant && etat.soustraitantId) {
          // Suppression d'un état sous-traitant
          response = await fetch(`/api/chantiers/${chantierId}/soustraitants/${etat.soustraitantId}/etats-avancement/${etat.id}`, {
            method: 'DELETE',
          });
        } else {
          // Suppression d'un état client
          response = await fetch(`/api/chantiers/${chantierId}/etats-avancement/${etat.numero}`, {
            method: 'DELETE',
          });
        }
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erreur lors de la suppression de l\'état d\'avancement');
        }
        
        toast.success(`État d'avancement n°${etat.numero} supprimé avec succès`);
        
        // Rafraîchir la liste des états en fonction du type
        if (etat.typeSoustraitant && etat.soustraitantId) {
          // Rafraîchir les états sous-traitants avec notre fonction optimisée
          await refreshSoustraitantData(etat.soustraitantId);
        } else {
          // Rafraîchir les états client
          const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`);
          if (etatsResponse.ok) {
            const data = await etatsResponse.json();
            setEtatsAvancement(data);
          }
        }
      } catch (error) {
        console.error('Erreur:', error);
        toast.error('Erreur lors de la suppression de l\'état d\'avancement');
      } finally {
        setLoading(false);
      }
    };
    
    // Memoization du rendu de la table pour éviter les re-rendus inutiles
    const tableContent = React.useMemo(() => {
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">N°</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Date</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Montant de l'état</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Statut</th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-900 dark:divide-gray-700">
              {etats.map((etat) => (
                <tr 
                  key={etat.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleRowClick(etat)}
                >
                  <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {etat.numero}
                    {etat.typeSoustraitant && (
                      <span className="ml-2 text-xs text-blue-500">(Sous-traitant)</span>
                    )}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(etat.date).toLocaleDateString('fr-FR')}
                    {etat.mois && <span className="ml-2 italic">({etat.mois})</span>}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {((etat.lignes.reduce((sum, ligne) => sum + ligne.montantActuel, 0) + 
                      etat.avenants.reduce((sum, avenant) => sum + avenant.montantActuel, 0)
                    )).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      etat.estFinalise 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                    }`}>
                      {etat.estFinalise ? 'Finalisé' : 'En cours'}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-right space-x-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRowClick(etat); }}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Ouvrir cet état d'avancement"
                    >
                      <EyeIcon className="h-5 w-5 inline" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        exportEtatToExcel(etat);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 ml-2"
                      title="Exporter en Excel"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5 inline" />
                    </button>
                    
                    {etat.estFinalise && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEmailModal(etat);
                        }}
                        className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 ml-2"
                        title="Envoyer par e-mail"
                      >
                        <EnvelopeIcon className="h-5 w-5 inline" />
                      </button>
                    )}

                    {canDeleteEtat(etat, etats) && (
                      <button
                        onClick={(e) => handleDeleteEtat(e, etat)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                        title="Supprimer cet état d'avancement"
                      >
                        <TrashIcon className="h-5 w-5 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }, [etats, handleRowClick]);
    
    return tableContent;
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
      {error}
    </div>
  )

  if (!chantier) return (
    <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400">
      Chantier non trouvé
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentExpirationAlert />
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Intégration de la modale d'envoi d'e-mail */}
        {emailModalOpen && selectedEtatForEmail && chantier && (
          <EmailEtatAvancementModal
            isOpen={emailModalOpen}
            onClose={() => {
              setEmailModalOpen(false);
              setSelectedEtatForEmail(null);
            }}
            etatAvancement={selectedEtatForEmail}
            chantier={chantier}
            session={session}
          />
        )}
        
        {/* En-tête moderne */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 rounded-2xl p-6 mb-8 shadow-xl border border-blue-200 dark:border-blue-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="text-white">
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <div className="bg-blue-500 dark:bg-blue-400 text-white px-3 py-1 rounded-full text-sm font-semibold mr-3 shadow-md border-2 border-blue-300 dark:border-blue-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    ÉTATS D'AVANCEMENT
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white drop-shadow-sm">
                  Gestion des États
                </h1>
              </div>
              <div className="mt-2">
                {chantier && (
                  <span className="text-sm text-blue-100 dark:text-blue-200 font-medium flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {chantier.nomChantier}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="space-y-8">
          {/* Section État d'avancement Client */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span className="font-bold text-lg">État d'avancement Client</span>
                </div>
                <button
                  onClick={() => toggleSection('client')}
                  className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                >
                  <span className="text-sm font-medium">
                    {collapsedSections.client ? 'Déplier' : 'Plier'}
                  </span>
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${collapsedSections.client ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            {!collapsedSections.client && (
            <div>
              {etatsAvancement.length === 0 ? (
                <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-800 m-6">
                  <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-6 shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Aucun état d'avancement
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Créez votre premier état d'avancement client pour commencer le suivi de votre chantier.
                  </p>
                  <button
                    onClick={handleCreateEtat}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Créer le premier état d'avancement
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-6 px-6">
                    <button
                      onClick={handleCreateEtat}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Nouvel état d'avancement
                    </button>
                  </div>
                    <TableEtatsAvancement etats={etatsAvancement as EtatAvancementEtendu[]} chantierIdValue={chantierId} />
                </>
              )}
            </div>
            )}
          </div>

          {/* Sections pour chaque sous-traitant */}
          {sousTraitants.map((st) => (
            <div key={st.commande.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-lg ring-2 ring-amber-200 dark:ring-amber-700">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="font-bold text-lg">Sous-traitant: {st.nom}</span>
                  </div>
                  <button
                    onClick={() => toggleSection(`soustraitant-${st.soustraitantId}`)}
                    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {collapsedSections[`soustraitant-${st.soustraitantId}`] ? 'Déplier' : 'Plier'}
                    </span>
                    <svg 
                      className={`w-5 h-5 transform transition-transform ${collapsedSections[`soustraitant-${st.soustraitantId}`] ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              {!collapsedSections[`soustraitant-${st.soustraitantId}`] && (
              <div className="p-6">
                {/* En-tête avec les informations de commande */}
                <div className="bg-gradient-to-r from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30 rounded-xl p-4 mb-6 border border-amber-200 dark:border-amber-800">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full shadow-sm">
                          Commande {st.commande.reference || `#${st.commande.id}`}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(st.commande.dateCommande).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                          {st.commande.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </span>
                      </div>
                      {/* Badge de statut de verrouillage */}
                      {st.commande.estVerrouillee ? (
                        <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 text-xs font-medium rounded-full border border-red-200 dark:border-red-700">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          Commande verrouillée
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs font-medium rounded-full border border-green-200 dark:border-green-700">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Commande modifiable
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          console.log('Bouton Voir commande cliqué - chantierId:', chantierId, 'soustraitantId:', st.soustraitantId, 'commandeId:', st.commande.id);
                          if (chantierId && st.soustraitantId) {
                            router.push(`/chantiers/${chantierId}/etats/soustraitants/${st.soustraitantId}/commande/${st.commande.id}`)
                          }
                        }}
                        disabled={!chantierId}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Voir commande
                      </button>
                      {st.commande.estVerrouillee && (
                        <button
                          onClick={() => {
                            console.log('Bouton Nouvel état (mini) cliqué - chantierId:', chantierId, 'soustraitantId:', st.soustraitantId);
                            if (chantierId && st.soustraitantId) {
                              handleCreateSoustraitantEtat(st.soustraitantId)
                            }
                          }}
                          disabled={!chantierId}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="h-4 w-4 mr-1" />
                          Nouvel état
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contenu des états */}
                <div className="mt-4">
                  {st.etatsAvancement.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/30 rounded-xl border border-amber-200 dark:border-amber-800">
                      <div className="mx-auto w-20 h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-600 mb-6 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Aucun état d'avancement
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Aucun état d'avancement n'a encore été créé pour ce sous-traitant.
                      </p>
                      
                      {/* Affichage conditionnel selon le statut de verrouillage */}
                      {st.commande.estVerrouillee ? (
                        <button
                          onClick={() => {
                            if (chantierId && st.soustraitantId) {
                              handleCreateSoustraitantEtat(st.soustraitantId)
                            }
                          }}
                          disabled={!chantierId}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PlusIcon className="h-5 w-5 mr-2" />
                          Créer le premier état d'avancement
                        </button>
                      ) : (
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 max-w-md mx-auto">
                          <div className="flex items-center justify-center text-orange-600 dark:text-orange-400">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">
                              La commande doit être validée et verrouillée avant de créer un état d'avancement
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {st.commande.estVerrouillee && (
                        <div className="flex justify-end mb-6">
                          <button
                            onClick={() => {
                              if (chantierId && st.soustraitantId) {
                                handleCreateSoustraitantEtat(st.soustraitantId)
                              }
                            }}
                            disabled={!chantierId}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-lg hover:from-amber-700 hover:to-orange-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <PlusIcon className="h-5 w-5 mr-2" />
                            Nouvel état d'avancement
                          </button>
                        </div>
                      )}
                      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <TableEtatsAvancement etats={st.etatsAvancement} chantierIdValue={chantierId} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              )}
            </div>
          ))}

          {/* Bouton d'ajout de sous-traitant */}
          <div className="text-center">
            <button
              onClick={() => setShowSelectModal(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Ajouter un nouveau sous-traitant
            </button>
          </div>

          {/* Section Dépenses */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                <span className="font-bold text-lg">Dépenses</span>
              </div>
            </div>
            <div className="p-6">
              {chantierId && <DepenseSection chantierId={chantierId} />}
            </div>
          </div>

          {/* Section Résumé Financier */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="font-bold text-lg">Résumé Financier</span>
              </div>
            </div>
            <div className="p-6">
              {chantierId && (
                <CardFinancialSummary 
                  chantierId={chantierId}
                  etatId="global"
                />
              )}
            </div>
          </div>
        </div>

        {chantierId && (
          <SousTraitantSelectModal
            isOpen={showSelectModal}
            onClose={() => setShowSelectModal(false)}
            onSubmit={navigateToNewSoustraitantCommandePage}
          />
        )}
      </div>
    </div>
  )
} 
'use client'
import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { type Chantier } from '@/types/chantier'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'
import { 
  PencilSquareIcon, 
  DocumentArrowDownIcon,
  ArrowLeftIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { EtatAvancement } from '@/types/etat-avancement'
// imports inutilisés retirés
import EtatAvancementUnifie from '@/components/etat-avancement/EtatAvancementUnifie'
import { toast } from 'react-hot-toast'

interface PageProps {
  params: Promise<{
    chantierId: string
    etatId: string
  }>
}

export default function EtatAvancementPage(props: PageProps) {
  const params = use(props.params);
  const { data: session } = useSession()
  // router non utilisé
  const [chantier, setChantier] = useState<Chantier | null>(null)
  const [etatAvancement, setEtatAvancement] = useState<EtatAvancement | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [hasNextEtat, setHasNextEtat] = useState(false)
  const [mois, setMois] = useState<string>('')
  const [currentCommentaires, setCurrentCommentaires] = useState<string>('')

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du chantier')
        }
        const data = await response.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
        window.location.href = '/chantiers'
      }
    }

    const fetchEtatAvancement = async () => {
      try {
        const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`)
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération de l\'état d\'avancement')
        }
        const data = await response.json()
        setEtatAvancement(data)
        setMois(data.mois || '')
        setCurrentCommentaires(data.commentaires || '')
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement de l\'état d\'avancement')
        window.location.href = `/chantiers/${params.chantierId}/etats`
      } finally {
        setLoading(false)
      }
    }

    const checkNextEtat = async () => {
      if (!params.etatId) return;
      
      try {
        // Vérifier s'il existe un état d'avancement avec un numéro supérieur
        const nextEtatNumber = parseInt(params.etatId) + 1;
        const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${nextEtatNumber}`);
        
        // Si la réponse est OK, cela signifie qu'un état suivant existe
        setHasNextEtat(response.ok);
        
        // Si l'état n'existe pas (404), c'est normal - pas de log
        if (response.status !== 404 && !response.ok) {
          // Pour les autres types d'erreurs, on les log 
          console.error(`Erreur lors de la vérification de l'état ${nextEtatNumber}:`, response.statusText);
        }
      } catch {
        // Ne pas logger les erreurs réseau pour éviter le bruit
        // Elles sont généralement liées à l'absence de l'état suivant
        setHasNextEtat(false);
      }
    };

    if (session) {
      fetchChantier()
      fetchEtatAvancement()
      checkNextEtat()
    }
  }, [session, params.chantierId, params.etatId])

  const handleDownloadPDF = async () => {
    try {
      // Afficher un message pour indiquer que la génération est en cours
      toast.loading('Génération du PDF en cours...', { id: 'pdf-generation' });
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}/pdf-modern`, {
        method: 'GET',
        // Ajouter un timeout plus long pour la requête
        signal: AbortSignal.timeout(90000), // 90 secondes
      });

      if (!response.ok) {
        toast.dismiss('pdf-generation');
        
        // Extraire le message d'erreur si disponible
        let errorMessage = 'Erreur lors de la génération du PDF';
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error('Impossible de parser l\'erreur:', e);
        }
        
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      
      // Vérifier que le blob n'est pas vide
      if (blob.size === 0) {
        toast.dismiss('pdf-generation');
        toast.error('Le PDF généré est vide');
        return;
      }
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etat-avancement-${params.chantierId}-${etatAvancement?.numero || ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss('pdf-generation');
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      toast.dismiss('pdf-generation');
      toast.error('Erreur lors de la génération du PDF');
      setError('Erreur lors de la génération du PDF');
    }
  };

  const handleValidation = async () => {
    if (!etatAvancement) return;
    
    try {
      setValidating(true);
      
      console.log('Validation de l\'état avec commentaires:', etatAvancement.commentaires);
      
      // Récupérer les derniers commentaires de l'état d'avancement sans ajouter la période
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentaires: currentCommentaires, // Utiliser les commentaires actuels du composant
          mois: mois, // Envoyer le mois séparément
          estFinalise: true
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la validation de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      console.log('État validé avec commentaires:', updatedEtat.commentaires);
      setEtatAvancement(updatedEtat);
      
      // Afficher un message de succès
      toast.success('État d\'avancement validé avec succès !');
      
      // Rester sur la page d'édition après validation
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de la validation de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  const handleReopenEtat = async () => {
    if (!etatAvancement) return;
    
    try {
      setValidating(true);
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}/rouvrir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la réouverture de l\'état d\'avancement');
      }

      const updatedEtat = await response.json();
      setEtatAvancement(updatedEtat);
      
      // Afficher un message de succès
      toast.success('État d\'avancement réouvert avec succès !');
    } catch (error) {
      console.error('Erreur:', error);
      setError('Erreur lors de la réouverture de l\'état d\'avancement');
    } finally {
      setValidating(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.loading('Génération du fichier Excel...', { id: 'excel-generation' });
      
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}/export-excel`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération du fichier Excel');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Etat_${params.chantierId}_${etatAvancement?.numero}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.dismiss('excel-generation');
      toast.success('Fichier Excel téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      toast.dismiss('excel-generation');
      toast.error('Erreur lors de la génération du fichier Excel');
    }
  };

  // Ajouter cette fonction pour sauvegarder le mois automatiquement quand il change
  const handleMoisChange = async (newMois: string) => {
    setMois(newMois);
    
    if (!etatAvancement) return;
    
    try {
      // Mettre à jour seulement le champ mois sans modifier les commentaires
      const response = await fetch(`/api/chantiers/${params.chantierId}/etats-avancement/${params.etatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mois: newMois,
          commentaires: currentCommentaires, // garder les commentaires actuels
          estFinalise: etatAvancement.estFinalise
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la période de travaux');
      }

      const updatedEtat = await response.json();
      setEtatAvancement(updatedEtat);
      
      toast.success('Période de travaux sauvegardée');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur lors de la sauvegarde de la période de travaux');
    }
  };

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!chantier || !etatAvancement) return <div className="p-8">État d'avancement non trouvé</div>

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <DocumentExpirationAlert />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="relative bg-white/80.dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all durée-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/80 via-indigo-600/80 to-purple-700/80 dark:from-indigo-500/35 dark:via-indigo-600/35 dark:to-purple-700/35" />
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/chantiers/${params.chantierId}/etats`}
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/40 bg-white/20 backdrop-blur-sm text-white shadow-sm shadow-indigo-900/30 hover:bg-white/30 transition"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">Retour</span>
                  </Link>

                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30 text-white">
                    <CheckCircleIcon className="h-5 w-5 mr-3" />
                    <span className="text-base sm:text-lg font-bold">État d'avancement n°{etatAvancement.numero}</span>
                  </div>

                  {etatAvancement.estFinalise && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-white/25 text-white border border-white/40 rounded-full text-xs font-semibold shadow-sm">
                      <CheckCircleIcon className="h-4 w-4" />
                      Validé
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-white/90">
                  <span className="inline-flex items-center gap-2">
                    <span className="opacity-90">Date</span>
                    <span className="font-semibold">{new Date(etatAvancement.date).toLocaleDateString('fr-FR')}</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="opacity-90">Période</span>
                    <select
                      value={mois}
                      onChange={(e) => handleMoisChange(e.target.value)}
                      disabled={etatAvancement?.estFinalise}
                      className={`bg-white/20 border-0 text-white rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-white/40 ${etatAvancement?.estFinalise ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                    >
                      <option value="" className="text-gray-900">Période de travaux</option>
                      {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((moisOption) => (
                        <option key={moisOption} value={moisOption} className="text-gray-900">{moisOption}</option>
                      ))}
                    </select>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="opacity-90">Chantier</span>
                    <span className="font-semibold">{chantier.nomChantier}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  onClick={handleDownloadPDF}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition"
                  title="Télécharger PDF"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  PDF
                </button>

                <button
                  onClick={handleExportExcel}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition"
                  title="Télécharger Excel"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Excel
                </button>

                {!etatAvancement.estFinalise ? (
                  <button
                    onClick={handleValidation}
                    disabled={validating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-semibold shadow-lg hover:bg-emerald-600 transition disabled:opacity-60"
                  >
                    {validating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Validation...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        Valider l'état
                      </>
                    )}
                  </button>
                ) : !hasNextEtat && (
                  <button
                    onClick={handleReopenEtat}
                    disabled={validating}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/25 backdrop-blur-sm rounded-lg text-sm font-semibold text-white shadow-lg hover:bg-white/35 transition disabled:opacity-60"
                  >
                    {validating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        Réouverture...
                      </>
                    ) : (
                      <>
                        <PencilSquareIcon className="h-5 w-5" />
                        Réouvrir l'état
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900">
          <style jsx global>{`
            /* Style personnalisé pour les tableaux */
            table {
              border-collapse: separate;
              border-spacing: 0;
              width: 100%;
              border: 1px solid #e5e7eb;
              border-radius: 0.5rem;
              overflow: hidden;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
              margin-bottom: 0.5rem;
            }
            
            thead th {
              background-color: #f3f4f6;
              color: #111827;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 0.75rem 1rem;
              border-bottom: 2px solid #cbd5e1;
              border-right: 1px solid #e2e8f0;
              position: relative;
            }
            
            thead th:last-child {
              border-right: none;
            }
            
            tbody tr {
              border-bottom: 1px solid #e5e7eb;
            }
            
            tbody tr:last-child {
              border-bottom: none;
            }
            
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            
            tbody tr:hover {
              background-color: #eef2ff;
            }
            
            td {
              padding: 0.75rem 1rem;
              border-bottom: 1px solid #e5e7eb;
              border-right: 1px solid #f1f5f9;
            }
            
            td:last-child {
              border-right: none;
            }
            
            /* Mode sombre */
            .dark thead th {
              background-color: #1f2937;
              color: #f9fafb;
              border-bottom: 2px solid #475569;
              border-right: 1px solid #334155;
            }
            
            .dark thead th:last-child {
              border-right: none;
            }
            
            .dark table {
              border: 1px solid #374151;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            
            .dark tbody tr {
              border-bottom: 1px solid #334155;
            }
            
            .dark tbody tr:last-child {
              border-bottom: none;
            }
            
            .dark tbody tr:nth-child(even) {
              background-color: #111827;
            }
            
            .dark tbody tr:hover {
              background-color: #1e293b;
            }
            
            .dark td {
              border-bottom: 1px solid #334155;
              border-right: 1px solid #1e293b;
            }
            
            .dark td:last-child {
              border-right: none;
            }
            
            /* Style pour les entrées de formulaire */
            input[type="text"], 
            input[type="number"], 
            select, 
            textarea {
              border-radius: 0.375rem;
              transition: all 0.2s;
            }
            
            input[type="text"]:focus, 
            input[type="number"]:focus, 
            select:focus, 
            textarea:focus {
              outline: none;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
            }
            
            .dark input[type="text"]:focus, 
            .dark input[type="number"]:focus, 
            .dark select:focus, 
            .dark textarea:focus {
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
            }
          `}</style>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <EtatAvancementUnifie 
              etat={etatAvancement} 
              type="client"
              chantierId={params.chantierId}
              etatId={params.etatId}
              onCommentairesChange={setCurrentCommentaires}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'
import { 
  ClipboardDocumentCheckIcon, 
  PlusCircleIcon, 
  DocumentArrowDownIcon,
  CheckCircleIcon,
  TrashIcon,
  TableCellsIcon,
  LinkIcon,
  ClipboardIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  KeyIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MapPinIcon,
  PencilIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
// Import dynamique pour reduire le bundle client
let ExcelJSImport: typeof import('exceljs') | null = null
import RemarqueForm from '@/components/chantier/RemarqueForm';

interface TagProps {
  id: string
  nom: string
  email: string | null
  typeTag?: string
}

interface PhotoProps {
  id: string
  url: string
  estPreuve: boolean
}

interface RemarqueProps {
  id: string
  numeroSequentiel?: number; 
  description: string
  localisation: string | null
  estResolue: boolean
  estValidee: boolean
  estRejetee: boolean
  dateResolution: string | null
  raisonRejet?: string | null; // Ajouté pour le formulaire de modification
  tags: TagProps[]
  photos: PhotoProps[]
  planId?: number | null; // Peut être null
  coordonneesPlan?: { x: number; y: number } | null; // Peut être null
  createdAt: string; // Pour le tri fallback
  createdBy?: { // Ajouté pour afficher l'auteur de la remarque
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface SousTraitantPIN {
  id: string
  codePIN: string
  estInterne: boolean
  soustraitant: {
    id: string
    nom: string
    email: string | null
  } | null
}

interface ReceptionProps {
  id: string
  dateCreation: string
  dateLimite: string
  codePIN: string | null
  estFinalise: boolean
  createdBy: {
    name: string | null
    email: string
  }
  remarques: RemarqueProps[]
  soustraitantPINs?: SousTraitantPIN[]
}

interface PlanDocument {
  id: number;
  nom: string;
  url: string;
  mimeType: string;
}

const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const bgColor = type === 'success' ? 'bg-green-600' : 
                  type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  
  return (
    <div className={`fixed bottom-4 right-4 z-[100] p-4 rounded-md shadow-lg ${bgColor} text-white flex items-center`}>
      {type === 'error' && <ExclamationCircleIcon className="h-5 w-5 mr-2" />}
      {type === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-4 text-white font-bold">×</button>
    </div>
  );
};

const PhotoModal = ({ 
  isOpen, 
  onClose, 
  imageUrl, 
  isProof,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  imageUrl: string, 
  isProof: boolean,
  onPrevious?: () => void,
  onNext?: () => void,
  hasPrevious?: boolean,
  hasNext?: boolean
}) => {
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious && hasPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext && hasNext) {
        onNext();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, onPrevious, onNext, hasPrevious, hasNext]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-[90vh] w-full"
        onClick={stopPropagation}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 bg-white rounded-full p-2.5 shadow-xl hover:bg-gray-200 transition-colors z-10 border border-gray-300"
          aria-label="Fermer"
        >
          <XMarkIcon className="h-7 w-7 text-gray-800" />
        </button>
        {isProof && (
          <div className="absolute top-4 left-4 bg-green-500 text-white text-sm px-2 py-1 rounded-md z-10">
            Preuve de résolution
          </div>
        )}
        {hasPrevious && onPrevious && (
          <button 
            onClick={onPrevious} 
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2.5 shadow-xl hover:bg-gray-200 transition-colors z-10 border border-gray-300"
            aria-label="Photo précédente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        {hasNext && onNext && (
          <button 
            onClick={onNext} 
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white rounded-full p-2.5 shadow-xl hover:bg-gray-200 transition-colors z-10 border border-gray-300"
            aria-label="Photo suivante"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          <div className="relative w-full h-full overflow-auto" style={{ maxHeight: 'calc(90vh - 4rem)' }}>
            <div className="flex items-center justify-center min-h-full p-4">
              <img 
                src={imageUrl} 
                alt={isProof ? "Preuve de résolution agrandie" : "Photo agrandie"} 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ReceptionDetailPage() {
  const params = useParams()
  const chantierId = params?.chantierId as string
  const id = params?.id as string
  
  // removed unused router
  const { data: session } = useSession()
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)
  const [reception, setReception] = useState<ReceptionProps | null>(null)
  const [loadingState, setLoadingState] = useState({
    page: true,
    validation: false,
    rejet: false,
    suppression: false,
    finalisation: false,
    exportPDF: false,
    exportExcel: false,
    pinGeneration: false,
    planAnnotation: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info', id: number } | null>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState('');
  const [currentPhotoIsProof, setCurrentPhotoIsProof] = useState(false);
  const [currentRemarquePhotos, setCurrentRemarquePhotos] = useState<PhotoProps[]>([]);
  const [currentPhotoIndexInRemarque, setCurrentPhotoIndexInRemarque] = useState(0);

  const [soustraitants, setSoustraitants] = useState<Array<{ value: string; label: string }>>([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedSoustraitant, setSelectedSoustraitant] = useState<string>('');
  const [isInterne, setIsInterne] = useState(false);
  const [loadingPins, setLoadingPins] = useState(false);
  const [isPinSectionExpanded, setIsPinSectionExpanded] = useState(false);
  const [remarkFilter, setRemarkFilter] = useState<'all' | 'resolved' | 'validated' | 'rejected' | 'pending'>('all');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRemarque, setEditingRemarque] = useState<RemarqueProps | null>(null);
  const [isSavingRemarque, setIsSavingRemarque] = useState(false);
  const [firstImagePlan, setFirstImagePlan] = useState<PlanDocument | null>(null);
  const [isAnnotatedPlanModalOpen, setIsAnnotatedPlanModalOpen] = useState(false);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [loadingAnnotatedImage, setLoadingAnnotatedImage] = useState(false);

  const remarqueRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const imageDisplayDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  // liste aplatie non utilisée supprimée

  useEffect(() => {
    if (session?.user?.role) {
      const userRole = session.user.role as string
      setIsAdminOrManager(userRole === 'ADMIN' || userRole === 'MANAGER')
    }
  }, [session?.user?.role])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type, id: Date.now() });
  };

  const closeToast = () => {
    setToast(null);
  };

  const fetchData = useCallback(async () => {
    setLoadingState(prev => ({...prev, page: true}))
    setError(null)
    try {
      const chantierRes = await fetch(`/api/chantiers/${chantierId}`)
      if (!chantierRes.ok) throw new Error((await chantierRes.json()).error || 'Erreur chargement chantier')
      const chantierData = await chantierRes.json()
      setChantier(chantierData)
      
      const receptionRes = await fetch(`/api/chantiers/${chantierId}/reception/${id}`)
      if (!receptionRes.ok) throw new Error((await receptionRes.json()).error || 'Erreur chargement réception')
      const receptionData = await receptionRes.json()
      
      const remarquesRes = await fetch(`/api/chantiers/${chantierId}/reception/${id}/remarques`)
      if (!remarquesRes.ok) throw new Error((await remarquesRes.json()).error || 'Erreur chargement remarques')
      const remarquesData = await remarquesRes.json()

      const soustraitantsRes = await fetch('/api/soustraitants/select')
      if (soustraitantsRes.ok) setSoustraitants(await soustraitantsRes.json())
      else console.error('Erreur chargement sous-traitants:', await soustraitantsRes.json())
      
      setReception({
        ...receptionData,
        remarques: remarquesData.map((r: RemarqueProps) => ({...r, createdAt: r.createdAt || new Date().toISOString()})) // Ensure createdAt for sorting
      })
      
      try {
        const docsRes = await fetch(`/api/chantiers/${chantierId}/documents`);
        if (docsRes.ok) {
            const allDocs = await docsRes.json();
            const imagePlans = allDocs
              .filter((doc: { estPlan?: boolean; mimeType?: string }) => doc.estPlan && ['image/jpeg', 'image/png'].includes(String(doc.mimeType)))
              .map((doc: { id: number; nom: string; url: string; mimeType: string }) => ({ id: doc.id, nom: doc.nom, url: doc.url, mimeType: doc.mimeType }));
            if (imagePlans.length > 0) setFirstImagePlan(imagePlans[0]);
        } else console.error('Erreur récupération documents pour plans');
      } catch (docError) { console.error("Erreur chargement plans:", docError); }
      
    } catch (err) {
      console.error('Erreur fetchData:', err)
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage)
      showToast(errorMessage, 'error')
    } finally {
      setLoadingState(prev => ({...prev, page: false}))
    }
  }, [chantierId, id])
  
  useEffect(() => { fetchData() }, [fetchData]);

  const handleFinalize = async () => {
    setLoadingState(prev => ({...prev, finalisation: true}))
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/finaliser`, { method: 'POST' })
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur finalisation')
      setReception(prev => prev ? { ...prev, estFinalise: true } : null)
      showToast('Réception finalisée', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur finalisation', 'error') } 
    finally { setLoadingState(prev => ({...prev, finalisation: false})) }
  }

  const handleGeneratePDF = async () => {
    setLoadingState(prev => ({...prev, exportPDF: true}))
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/pdf`);
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur PDF');
      const data = await response.json();
      if (!data.success) throw new Error('Erreur génération PDF distant');
      
      const mainPdfLink = document.createElement('a');
      mainPdfLink.href = data.mainPdf;
      mainPdfLink.download = data.mainPdf.split('/').pop() || 'reception.pdf';
      document.body.appendChild(mainPdfLink); mainPdfLink.click(); document.body.removeChild(mainPdfLink);
      
      if (data.tagPdfs && data.tagPdfs.length > 0) {
        if (window.confirm(`${data.tagPdfs.length} PDF(s) par tag générés. Télécharger ?`)) {
          data.tagPdfs.forEach((tagPdf: { url: string; fileName: string }, index: number) => {
            setTimeout(() => {
              const link = document.createElement('a'); link.href = tagPdf.url; link.download = tagPdf.fileName;
              document.body.appendChild(link); link.click(); document.body.removeChild(link);
            }, index * 500);
          });
        }
      }
      showToast('PDF(s) généré(s)', 'success');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur PDF', 'error');} 
    finally { setLoadingState(prev => ({...prev, exportPDF: false})); }
  }

  const handleExportExcel = async () => {
    setLoadingState(prev => ({...prev, exportExcel: true}))
    try {
      if (!reception || !chantier) throw new Error('Données manquantes pour Excel');
      if (!ExcelJSImport) {
        ExcelJSImport = await import('exceljs');
      }
      const workbook = new ExcelJSImport.Workbook();
      const worksheet = workbook.addWorksheet('Remarques Réception');
      worksheet.columns = [
        { header: 'N° Seq.', key: 'numeroSequentiel', width: 8 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Localisation', key: 'localisation', width: 25 },
        { header: 'Statut', key: 'statut', width: 20 },
        { header: 'Assigné à (Tags)', key: 'assignedTo', width: 30 },
        { header: 'Résolu le', key: 'dateResolution', width: 15 },
      ];
      worksheet.addRow([`Réception - ${chantier.nomChantier}`]).font = { bold: true, size: 14 };
      worksheet.mergeCells('A1:F1');
      worksheet.addRow([`Créée le ${formatDate(reception.dateCreation)} par ${reception.createdBy?.name || reception.createdBy?.email || 'N/A'}`]);
      worksheet.addRow([`Date limite: ${formatDate(reception.dateLimite)}`]);
      worksheet.addRow([`Statut: ${reception.estFinalise ? 'Finalisé' : 'En cours'}`]);
      worksheet.addRow([]);
      const headerRow = worksheet.getRow(6);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
      
      const sortedRemarques = [...(reception.remarques || [])].sort((a, b) => (a.numeroSequentiel || Infinity) - (b.numeroSequentiel || Infinity));

      sortedRemarques.forEach((remarque) => {
        const tags = remarque.tags?.map(tag => tag.nom).join(', ') || '';
        let statut = 'À résoudre';
        if (remarque.estValidee) statut = 'Validée';
        else if (remarque.estRejetee) statut = 'Rejetée';
        else if (remarque.estResolue) statut = 'Résolue (att. validation)';
        
        worksheet.addRow({
          numeroSequentiel: remarque.numeroSequentiel || '-',
          description: remarque.description,
          localisation: remarque.localisation || '',
          statut: statut,
          assignedTo: tags,
          dateResolution: remarque.dateResolution ? formatDate(remarque.dateResolution) : ''
        });
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Reception_${chantier.nomChantier}_${format(new Date(), 'yyyyMMdd')}.xlsx`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
      showToast('Export Excel réussi', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur Excel', 'error') } 
    finally { setLoadingState(prev => ({...prev, exportExcel: false})) }
  }

  const handlePatchRemarque = async (remarqueId: string, action: 'valider' | 'rejeter', raisonRejet?: string) => {
    const loadingKey = action === 'valider' ? 'validation' : 'rejet';
    setLoadingState(prev => ({...prev, [loadingKey]: true }));
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/remarques/${remarqueId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, raisonRejet }),
      });
      if (!response.ok) throw new Error((await response.json()).error || `Erreur ${action}`);
      setReception(prev => {
        if (!prev) return null;
        return { ...prev, remarques: prev.remarques.map(r => 
            r.id === remarqueId ? { ...r, estValidee: action === 'valider', estRejetee: action === 'rejeter', raisonRejet: action === 'rejeter' ? raisonRejet : r.raisonRejet } : r
        )};
      });
      showToast(`Remarque ${action === 'valider' ? 'validée' : 'rejetée'}`, 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : `Erreur ${action}`, 'error') } 
    finally { setLoadingState(prev => ({...prev, [loadingKey]: false })) }
  };

  const handleValiderRemarque = (remarqueId: string) => handlePatchRemarque(remarqueId, 'valider');
  const handleRejeterRemarque = (remarqueId: string) => {
    const raison = prompt('Raison du rejet:');
    if (raison !== null) handlePatchRemarque(remarqueId, 'rejeter', raison);
  };

  const handleDeleteRemarque = async (remarqueId: string) => {
    if (!confirm('Supprimer cette remarque ?')) return;
    setLoadingState(prev => ({...prev, suppression: true}))
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/remarques/${remarqueId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur suppression');
      setReception(prev => prev ? { ...prev, remarques: prev.remarques.filter(r => r.id !== remarqueId) } : null);
      showToast('Remarque supprimée', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur suppression', 'error') } 
    finally { setLoadingState(prev => ({...prev, suppression: false})) }
  };

  const copyExternalLink = () => {
    if (!reception?.codePIN) { showToast('Code PIN non disponible', 'error'); return; }
    const externalUrl = `${window.location.origin}/public/reception/${id}?pin=${reception.codePIN}`; // Assumed public route
    navigator.clipboard.writeText(externalUrl).then(() => {
      setLinkCopied(true); showToast('Lien public copié !', 'success');
      setTimeout(() => setLinkCopied(false), 3000);
    }).catch(() => showToast('Erreur copie lien', 'error'));
  };
  
  const copyPinLink = (pinCode: string) => {
    const externalUrl = `${window.location.origin}/public/reception/${id}?pin=${pinCode}`;
    navigator.clipboard.writeText(externalUrl).then(() => {
      showToast('Lien spécifique copié !', 'success');
    }).catch(() => showToast('Erreur copie lien', 'error'));
  };

  const formatDateForDisplay = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: fr }); } 
    catch { return 'Date invalide'; }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'dd/MM/yyyy', { locale: fr }); } 
    catch { return 'Date invalide'; }
  };

  const filteredRemarques = useMemo(() => {
    if (!reception?.remarques) return [];
    const remarques = [...reception.remarques].sort((a, b) => {
        const numA = a.numeroSequentiel ?? Infinity;
        const numB = b.numeroSequentiel ?? Infinity;
        if (numA !== numB) return numA - numB;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(); // Fallback to createdAt asc
    });
    switch (remarkFilter) {
      case 'resolved': return remarques.filter(r => r.estResolue && !r.estValidee && !r.estRejetee);
      case 'validated': return remarques.filter(r => r.estValidee);
      case 'rejected': return remarques.filter(r => r.estRejetee);
      case 'pending': return remarques.filter(r => !r.estResolue && !r.estValidee && !r.estRejetee);
      default: return remarques;
    }
  }, [reception?.remarques, remarkFilter]);

  const openPhotoModal = (url: string, isProof: boolean, remarqueId: string, photoIndexInRemarque: number) => {
    const remarque = reception?.remarques.find(r => r.id === remarqueId);
    if (remarque) {
        setCurrentRemarquePhotos(remarque.photos);
        setCurrentPhotoIndexInRemarque(photoIndexInRemarque);
        setCurrentPhotoUrl(url);
        setCurrentPhotoIsProof(isProof);
        setIsPhotoModalOpen(true);
    }
  };
  const closePhotoModal = () => setIsPhotoModalOpen(false);

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (!currentRemarquePhotos.length) return;
    let newIndex = currentPhotoIndexInRemarque + (direction === 'next' ? 1 : -1);
    if (newIndex < 0) newIndex = currentRemarquePhotos.length - 1;
    if (newIndex >= currentRemarquePhotos.length) newIndex = 0;
    
    const newPhoto = currentRemarquePhotos[newIndex];
    if (newPhoto) {
        setCurrentPhotoUrl(newPhoto.url);
        setCurrentPhotoIsProof(newPhoto.estPreuve);
        setCurrentPhotoIndexInRemarque(newIndex);
    }
  };
  const goToPreviousPhoto = () => navigatePhoto('prev');
  const goToNextPhoto = () => navigatePhoto('next');

  const PinModal = () => {
    if (!showPinModal) return null;
    const handleClose = () => { setShowPinModal(false); setSelectedSoustraitant(''); setIsInterne(false); };
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault(); setLoadingPins(true);
      if (!isInterne && !selectedSoustraitant) { showToast('Sélectionnez un sous-traitant ou cochez "Équipe interne"', 'error'); setLoadingPins(false); return; }
      try {
        const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/pins`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ soustraitantId: isInterne ? undefined : selectedSoustraitant, estInterne: isInterne }),
        });
        if (!response.ok) throw new Error((await response.json()).error || 'Erreur création PIN');
        await fetchData(); showToast('PIN créé', 'success'); handleClose();
      } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur création PIN', 'error'); } 
      finally { setLoadingPins(false); }
    };
    return (
      <div className="fixed inset-0 z-[70] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={handleClose}></div>
          <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <form onSubmit={handleSubmit}>
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Nouveau PIN d'accès</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input id="estInterne" name="estInterne" type="checkbox" checked={isInterne}
                      onChange={(e) => { setIsInterne(e.target.checked); if (e.target.checked) setSelectedSoustraitant(''); }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                    <label htmlFor="estInterne" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Équipe interne</label>
                  </div>
                  {!isInterne && (
                    <div>
                      <label htmlFor="soustraitant" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sous-traitant</label>
                      <select id="soustraitant" value={selectedSoustraitant} onChange={(e) => setSelectedSoustraitant(e.target.value)} disabled={isInterne}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="">Sélectionner...</option>
                        {soustraitants.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button type="submit" variant="primary" disabled={loadingPins} className="sm:ml-3">{loadingPins ? 'Création...' : 'Créer PIN'}</Button>
                <Button type="button" variant="outline" onClick={handleClose} className="mt-3 sm:mt-0">Annuler</Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  const handleDeletePin = async (pinId: string) => {
    if (!confirm('Supprimer ce PIN ?')) return;
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/pins/${pinId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur suppression PIN');
      await fetchData(); showToast('PIN supprimé', 'success');
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur suppression PIN', 'error'); }
  };

  const handleOpenEditModal = (remarque: RemarqueProps) => { setEditingRemarque(remarque); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setEditingRemarque(null); };

  const handleUpdateRemarque = async (formDataToUpdate: FormData) => {
    if (!editingRemarque) return;
    setIsSavingRemarque(true);
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/remarques/${editingRemarque.id}`, { method: 'PUT', body: formDataToUpdate });
      if (!response.ok) throw new Error((await response.json()).error || 'Erreur MàJ remarque');
      showToast('Remarque mise à jour', 'success'); handleCloseEditModal(); fetchData();
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur MàJ remarque', 'error'); } 
    finally { setIsSavingRemarque(false); }
  };

  const handleOpenAnnotatedPlanModal = async () => {
    if (!firstImagePlan || !reception) {
      showToast("Aucun plan image disponible ou réception non chargée.", "info");
      return;
    }

    setLoadingState(prev => ({...prev, planAnnotation: true}));
    setError(null);
    try {
      const remarquesSurCePlan = reception.remarques.filter(r => {
        const match = r.planId === firstImagePlan.id && r.coordonneesPlan && r.numeroSequentiel;
        return match;
      });
      
      if (remarquesSurCePlan.length === 0) {
        showToast("Aucune remarque avec pointage trouvée pour ce plan.", "info");
      }
      
      const image = new Image();
      image.crossOrigin = "Anonymous";
      image.src = firstImagePlan.url;
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError("Contexte canvas indisponible.");
          setLoadingState(prev => ({...prev, planAnnotation: false}));
          return;
        }
        ctx.drawImage(image, 0, 0);
        
        setAnnotatedImageUrl(canvas.toDataURL('image/png'));
        imageDisplayDimensionsRef.current = { width: canvas.width, height: canvas.height };
        setIsAnnotatedPlanModalOpen(true);
      };
      image.onerror = () => { 
        setError("Erreur chargement image du plan."); 
        setAnnotatedImageUrl(null); 
      };
    } catch {
      setError("Erreur génération plan annoté."); setAnnotatedImageUrl(null);
    } finally {
      setLoadingState(prev => ({...prev, planAnnotation: false}));
    }
  };

  const handleCloseAnnotatedPlanModal = () => { setIsAnnotatedPlanModalOpen(false); setAnnotatedImageUrl(null); imageDisplayDimensionsRef.current = null; };
  
  const scrollToRemarque = (remarqueId: string) => {
    remarqueRefs.current[remarqueId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loadingState.page) return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-700"></div></div>;
  if (error && !reception) return <div className="p-4 text-red-600 bg-red-100 rounded-md">{error} <Button onClick={fetchData}>Réessayer</Button></div>;
  if (!reception) return <div className="p-4 text-gray-600">Aucune donnée de réception.</div>;

  return (
    <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={closeToast} />}
      
      {showPinModal && <PinModal />}
      
      {isPhotoModalOpen && currentPhotoUrl && (
        <PhotoModal 
          isOpen={isPhotoModalOpen}
          onClose={closePhotoModal} 
          imageUrl={currentPhotoUrl} 
          isProof={currentPhotoIsProof}
          onPrevious={currentRemarquePhotos.length > 1 ? goToPreviousPhoto : undefined}
          onNext={currentRemarquePhotos.length > 1 ? goToNextPhoto : undefined}
          hasPrevious={currentRemarquePhotos.length > 1 && currentPhotoIndexInRemarque > 0}
          hasNext={currentRemarquePhotos.length > 1 && currentPhotoIndexInRemarque < currentRemarquePhotos.length - 1}
        />
      )}

      {/* Header léger style backdrop-blur */}
      <div className="mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Effet de fond subtil avec dégradé red/rose (couleur de l'icône Réception) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/60 via-red-700/60 to-rose-800/60 dark:from-red-600/30 dark:via-red-700/30 dark:to-rose-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 mr-3 text-red-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-red-900 dark:text-white">
                    Réception
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Link
                  href={`/chantiers/${chantierId}/reception/nouveau`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-red-900 dark:text-white"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  Créer la réception
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations de la réception */}
      <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Créée le: {formatDateForDisplay(reception.dateCreation)} par {reception.createdBy?.name || reception.createdBy?.email || 'N/A'}</p>
          <p>Date limite: <span className="font-semibold">{formatDateForDisplay(reception.dateLimite)}</span></p>
          <p>Statut: <span className={`font-semibold ${reception.estFinalise ? 'text-green-600' : 'text-yellow-600'}`}>{reception.estFinalise ? 'Finalisée' : 'En cours'}</span></p>
          {reception.codePIN && 
            <div className="flex items-center">
              <p className="mr-2">Accès public principal:</p>
              <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded mr-2">{reception.codePIN}</span>
              <Button 
                variant="outline"
                size="sm"
                onClick={copyExternalLink}
                className="text-xs py-1 px-2"
                title="Copier le lien public général"
              >
                {linkCopied ? (
                  <><ClipboardIcon className="h-3.5 w-3.5 mr-1" />Copié!</>
                ) : (
                  <><LinkIcon className="h-3.5 w-3.5 mr-1" />Copier Lien</>
                )}
              </Button>
            </div>
          }
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {firstImagePlan && (
            <Button variant="outline" onClick={handleOpenAnnotatedPlanModal} disabled={loadingState.planAnnotation} className="w-full md:w-auto">
              {loadingState.planAnnotation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> : <EyeIcon className="h-5 w-5 mr-2" />}Plan Annoté
            </Button>
          )}
          <Button variant="outline" onClick={handleExportExcel} disabled={loadingState.exportExcel} className="w-full md:w-auto">
             {loadingState.exportExcel ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> : <TableCellsIcon className="h-5 w-5 mr-2" />}Excel
          </Button>
          <Button variant="outline" onClick={handleGeneratePDF} disabled={loadingState.exportPDF} className="w-full md:w-auto">
            {loadingState.exportPDF ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div> : <DocumentArrowDownIcon className="h-5 w-5 mr-2" />}PDF
          </Button>
          {!reception.estFinalise && isAdminOrManager && (
            <Button variant="primary" onClick={handleFinalize} disabled={loadingState.finalisation} className="w-full md:w-auto">
              {loadingState.finalisation ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div> : <CheckCircleIcon className="h-5 w-5 mr-2" />}Finaliser
            </Button>
          )}
        </div>
      </div>

      {/* Section Accès Publics (PINs) */}
      {isAdminOrManager && (
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg shadow">
          <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsPinSectionExpanded(!isPinSectionExpanded)}>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
              <KeyIcon className="h-5 w-5 mr-2 text-gray-500 dark:text-gray-400" />
              Accès Publics (Codes PIN)
            </h2>
            {isPinSectionExpanded ? <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" /> : <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />}
          </div>
          {isPinSectionExpanded && (
            <div className="mt-4 space-y-3">
              {!reception.estFinalise && <Button variant="outline" size="sm" onClick={() => setShowPinModal(true)}><PlusCircleIcon className="h-4 w-4 mr-2" />Nouveau PIN</Button>}
              {reception.soustraitantPINs && reception.soustraitantPINs.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {reception.soustraitantPINs.map((pin) => (
                    <li key={pin.id} className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{pin.estInterne ? "Équipe Interne" : pin.soustraitant?.nom || "N/A"}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">PIN: <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{pin.codePIN}</span></p>
                      </div>
                      <div className="mt-2 sm:mt-0 flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => copyPinLink(pin.codePIN)} className="text-xs text-blue-600 hover:text-blue-800"><LinkIcon className="h-3 w-3 mr-1" />Copier Lien</Button>
                        {!reception.estFinalise && <Button variant="outline" size="sm" onClick={() => handleDeletePin(pin.id)} className="text-xs text-red-600 hover:text-red-800"><TrashIcon className="h-3 w-3 mr-1" />Suppr.</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-gray-500 dark:text-gray-400">Aucun PIN configuré.</p>}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Remarques', value: reception.remarques.length, color: 'blue' },
          { label: 'Résolues', value: reception.remarques.filter(r => r.estResolue).length, color: 'green' },
          { label: 'Att. Validation', value: reception.remarques.filter(r => r.estResolue && !r.estValidee && !r.estRejetee).length, color: 'yellow' },
          { label: 'Non Résolues / Rejetées', value: reception.remarques.filter(r => !r.estResolue || r.estRejetee).length, color: 'red' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 border-l-4 border-${stat.color}-500`}>
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</h3>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Actions & Filtres Remarques */}
      <div className="sm:flex sm:items-center sm:justify-between mt-6 mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Liste des Remarques</h2>
          {!reception.estFinalise && isAdminOrManager && (
            <Link href={`/chantiers/${chantierId}/reception/${id}/nouvelle-remarque`}>
              <Button variant="primary" size="sm"><PlusCircleIcon className="h-5 w-5 mr-2"/>Ajouter</Button>
            </Link>
          )}
        </div>
        <div className="flex items-center space-x-2 mt-3 sm:mt-0">
          <span className="text-sm text-gray-600 dark:text-gray-400">Filtrer:</span>
          <select value={remarkFilter} onChange={(e) => setRemarkFilter(e.target.value as typeof remarkFilter)}
            className="block w-auto pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            <option value="all">Toutes</option> <option value="pending">En attente</option> <option value="resolved">Résolues</option>
            <option value="validated">Validées</option> <option value="rejected">Rejetées</option>
          </select>
        </div>
      </div>

      {/* Liste des Remarques */}
      {filteredRemarques.length > 0 ? (
        <div className="space-y-4">
          {filteredRemarques.map((remarque) => (
            <div 
              key={remarque.id} 
              ref={el => { remarqueRefs.current[remarque.id] = el; }}
              id={`remarque-${remarque.id}`}
              className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                       <span className={`mr-3 h-3 w-3 rounded-full ${
                          remarque.estValidee ? 'bg-green-500' : 
                          remarque.estRejetee ? 'bg-red-500' : 
                          remarque.estResolue ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></span>
                      <h3 className="text-md font-semibold text-gray-900 dark:text-white break-words pr-12">
                        {remarque.description}
                      </h3>
                    </div>
                    {remarque.localisation && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <MapPinIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />{remarque.localisation}
                      </p>
                    )}
                  </div>
                  {remarque.numeroSequentiel && (
                    <span className="absolute top-3 right-3 text-xs font-bold bg-sky-500 text-white px-2 py-0.5 rounded-full shadow-sm">
                      #{remarque.numeroSequentiel}
                    </span>
                  )}
                </div>

                {remarque.tags && remarque.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {remarque.tags.map(tag => (
                      <span key={tag.id} className="px-2 py-0.5 text-[11px] rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">{tag.nom}</span>
                    ))}
                  </div>
                )}
                
                {remarque.photos && remarque.photos.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Photos:</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {remarque.photos.map((photo, idx) => (
                        <div key={photo.id} className="relative group aspect-square bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-600"
                             onClick={() => openPhotoModal(photo.url, photo.estPreuve, remarque.id, idx)}>
                          <img src={photo.url} alt={photo.estPreuve ? `Preuve de résolution ${idx + 1}` : `Photo ${idx + 1}`} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" 
                               onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-image.jpg'; }}/>
                          {photo.estPreuve && <span className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm">Preuve</span>}
                           <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                            <EyeIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start space-y-3 sm:space-y-0">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Créée le: {formatDateForDisplay(remarque.createdAt)}
                    {remarque.createdBy && ` par ${remarque.createdBy.name || remarque.createdBy.email}`}<br />
                    {remarque.estResolue && `Résolue le: ${formatDateForDisplay(remarque.dateResolution)}`}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isAdminOrManager && !reception.estFinalise && (
                      <>
                        {!remarque.estResolue && !remarque.estValidee && (
                           <Button size="sm" variant="outline" onClick={() => handleOpenEditModal(remarque)}><PencilIcon className="h-3.5 w-3.5 mr-1"/>Modifier</Button>
                        )}
                        {remarque.estResolue && !remarque.estValidee && !remarque.estRejetee && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleValiderRemarque(remarque.id)}><CheckCircleIcon className="h-3.5 w-3.5 mr-1"/>Valider</Button>
                            <Button size="sm" variant="outline" onClick={() => handleRejeterRemarque(remarque.id)} className="text-yellow-600 border-yellow-500 hover:bg-yellow-50"><XMarkIcon className="h-3.5 w-3.5 mr-1"/>Rejeter</Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleDeleteRemarque(remarque.id)} className="text-red-600 border-red-500 hover:bg-red-50"><TrashIcon className="h-3.5 w-3.5 mr-1"/>Suppr.</Button>
                      </>
                    )}
                  </div>
                </div>
                 {remarque.estRejetee && remarque.raisonRejet && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/50 dark:text-red-400 p-2 rounded-md">
                        <strong>Rejetée:</strong> {remarque.raisonRejet}
                    </p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow">
          <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Aucune remarque trouvée</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {remarkFilter === 'all' ? 'Ajoutez une nouvelle remarque pour commencer.' : 'Essayez de changer vos filtres.'}
          </p>
        </div>
      )}

      {isEditModalOpen && editingRemarque && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-5 sm:p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <RemarqueForm
              chantierId={chantierId}
              receptionId={id}
              initialData={{
                ...editingRemarque,
                localisation: editingRemarque.localisation || undefined,
                planId: editingRemarque.planId || undefined,
                coordonneesPlan: editingRemarque.coordonneesPlan || undefined,
                photos: editingRemarque.photos || [], 
              }}
              availablePlans={firstImagePlan ? [firstImagePlan] : []} 
              onSubmit={handleUpdateRemarque}
              onCancel={handleCloseEditModal}
              isSaving={isSavingRemarque}
              submitButtonText="Enregistrer"
              formTitle="Modifier la Remarque"
            />
          </div>
        </div>
      )}

      {isAnnotatedPlanModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-80 p-2 sm:p-4" onClick={handleCloseAnnotatedPlanModal}>
          <div className="relative max-w-full max-h-[95vh] w-auto bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleCloseAnnotatedPlanModal} className="absolute top-2 right-2 z-20 bg-gray-100 dark:bg-gray-700 rounded-full p-1.5 shadow hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Fermer">
              <XMarkIcon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </button>
            <div className="p-2 sm:p-4 h-full flex flex-col items-center justify-center">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">Plan Annoté: {firstImagePlan?.nom}</h3>
              {loadingState.planAnnotation && <div className="flex flex-col items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div><p className="mt-3 text-gray-600 dark:text-gray-300">Génération du plan...</p></div>}
              {error && !loadingState.planAnnotation && <p className="text-red-500 p-4">{error}</p>}
              
              {!loadingState.planAnnotation && annotatedImageUrl && (
                  <div className="relative flex-grow w-full flex items-center justify-center overflow-auto">
                      <img 
                          src={annotatedImageUrl} 
                          alt="Plan annoté" 
                          className="max-w-full max-h-[calc(95vh-100px)] object-contain block"
                          onLoad={(e) => {
                              const img = e.target as HTMLImageElement;
                              imageDisplayDimensionsRef.current = { width: img.clientWidth, height: img.clientHeight };
                              setLoadingAnnotatedImage(false);
                          }}
                          style={{ display: loadingAnnotatedImage ? 'none' : 'block' }}
                      />
                      {firstImagePlan && reception && imageDisplayDimensionsRef.current && !loadingAnnotatedImage &&
                          reception.remarques
                          .filter(r => r.planId === firstImagePlan.id && r.coordonneesPlan && r.numeroSequentiel)
                          .map(remarque => {
                              if (!remarque.coordonneesPlan || !remarque.numeroSequentiel || !imageDisplayDimensionsRef.current) return null;
                              
                              const { width: displayedImgWidth, height: displayedImgHeight } = imageDisplayDimensionsRef.current;
                              // Normaliser: se baser sur les dimensions affichées uniquement

                              const pinX = remarque.coordonneesPlan.x * displayedImgWidth;
                              const pinY = remarque.coordonneesPlan.y * displayedImgHeight;
                              const pinRadius = Math.max(12, displayedImgWidth * 0.015);

                              return (
                                  <div
                                      key={`pin-${remarque.id}`}
                                      className="absolute flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-full font-bold cursor-pointer transition-all shadow-lg border-2 border-white select-none"
                                      style={{
                                          width: `${pinRadius * 2}px`,
                                          height: `${pinRadius * 2}px`,
                                          left: `${pinX - pinRadius}px`,
                                          top: `${pinY - pinRadius}px`,
                                          fontSize: `${pinRadius * 0.8}px`,
                                          lineHeight: `${pinRadius * 2}px`,
                                      }}
                                      title={`Voir remarque #${remarque.numeroSequentiel}`}
                                      onClick={() => {
                                          scrollToRemarque(remarque.id);
                                          handleCloseAnnotatedPlanModal();
                                      }}
                                  >
                                      {remarque.numeroSequentiel}
                                  </div>
                              );
                          })
                      }
                  </div>
              )}
              {!loadingState.planAnnotation && !annotatedImageUrl && !error && <p className="text-gray-500 p-4">Aucun plan annoté à afficher ou plan en cours de préparation.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
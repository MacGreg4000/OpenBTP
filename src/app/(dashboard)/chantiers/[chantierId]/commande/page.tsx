'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, use, useCallback } from 'react';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import LigneCommande from '@/components/commande/LigneCommande'
// removed unused uuid and prisma imports
// Import ExcelJS uniquement côté action
import ExcelJS from 'exceljs'
import toast from 'react-hot-toast' // Toaster déplacé vers RootClientProviders
// removed unused SelectField import
import React, { ChangeEvent } from 'react'
import { useConfirmation } from '@/components/modals/confirmation-modal'

interface CommandePageProps {
  params: Promise<{
    chantierId: string
  }>
}

// Types pour la commande
interface LigneCommande {
  id: number;
  commandeId?: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
  estOption: boolean;
}

interface Commande {
  id?: number;
  chantierId: string;
  clientId: string | null;
  clientNom?: string | null;
  dateCommande: Date;
  reference: string | null;
  tauxTVA: number;
  lignes: LigneCommande[];
  sousTotal: number;
  totalOptions: number;
  tva: number;
  total: number;
  statut: string;
  estVerrouillee?: boolean;
  createdBy?: string;
}

export default function CommandePage(props: CommandePageProps) {
  const resolvedParams = use(props.params);
  const chantierId = resolvedParams.chantierId;
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation()
  const [commande, setCommande] = useState<Commande>({
    chantierId: chantierId,
    clientId: null,
    clientNom: null,
    dateCommande: new Date(),
    reference: null,
    tauxTVA: 21,
    lignes: [],
    sousTotal: 0,
    totalOptions: 0,
    tva: 0,
    total: 0,
    statut: 'brouillon'
  })
  const [chantier, setChantier] = useState<{ nomChantier?: string } | null>(null)

  // Force le taux de TVA à 0% au premier rendu
  useEffect(() => {
    console.log('Initialisation forcée du taux de TVA à 0%');
    setCommande(prev => ({
      ...prev,
      tauxTVA: 0,
      tva: 0,
      total: prev.sousTotal // Total sans TVA
    }));
  }, []);

  console.log('État actuel de la commande:', commande)

  // Fonction pour charger les données
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Vérifier si un ID de commande est présent dans l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const commandeId = urlParams.get('id');
      
      // Récupérer le chantier
      const chantierResponse = await fetch(`/api/chantiers/${chantierId}`);
      if (!chantierResponse.ok) {
        throw new Error('Erreur lors de la récupération du chantier');
      }
      const chantierData = await chantierResponse.json();
      console.log('Données du chantier chargées:', chantierData);
      
      // Récupérer le client
      let clientNom = null;
      let clientId = null;
      if (chantierData.clientId) {
        clientId = chantierData.clientId;
        const clientResponse = await fetch(`/api/clients/${chantierData.clientId}`);
        if (clientResponse.ok) {
          const clientData = await clientResponse.json();
          clientNom = clientData.nom;
          console.log('Client associé au chantier:', clientData);
        } else {
          console.error('Erreur lors de la récupération du client:', await clientResponse.text());
        }
      } else {
        console.warn('Aucun client associé au chantier');
      }
      
      // Initialiser une nouvelle commande par défaut
      let newCommande: Commande = {
        chantierId: chantierId,
        clientId: clientId,
        clientNom: clientNom,
        dateCommande: new Date(),
        reference: null,
        tauxTVA: 0,
        lignes: [],
        sousTotal: 0,
        totalOptions: 0,
        tva: 0,
        total: 0,
        statut: 'BROUILLON',
        estVerrouillee: false
      };
      
      // Si un ID de commande est spécifié dans l'URL, récupérer cette commande spécifique
      if (commandeId) {
        try {
          console.log('Récupération de la commande spécifique avec ID:', commandeId);
          const commandeResponse = await fetch(`/api/commandes/${commandeId}`);
          
          if (commandeResponse.ok) {
            const commande = await commandeResponse.json();
            console.log('Commande spécifique récupérée:', commande);
            
            // Récupérer les lignes de la commande
            const lignesResponse = await fetch(`/api/commandes/${commandeId}/lignes`);
            
            if (lignesResponse.ok) {
              const lignes = await lignesResponse.json();
              console.log('Lignes récupérées:', lignes);
              
              // Mettre à jour l'état avec les données récupérées
              newCommande = {
                id: commande.id,
                chantierId: chantierId,
                clientId: commande.clientId || clientId,
                clientNom: clientNom,
                dateCommande: new Date(commande.dateCommande),
                reference: commande.reference,
                tauxTVA: commande.tauxTVA || 0,
                lignes: lignes.map((ligne: LigneCommande) => ({
                  id: ligne.id,
                  commandeId: ligne.commandeId,
                  ordre: ligne.ordre,
                  article: ligne.article,
                  description: ligne.description,
                  type: ligne.type,
                  unite: ligne.unite,
                  prixUnitaire: ligne.prixUnitaire,
                  quantite: ligne.quantite,
                  total: ligne.total,
                  estOption: ligne.estOption
                })),
                sousTotal: commande.sousTotal,
                totalOptions: commande.totalOptions,
                tva: commande.tva,
                total: commande.total,
                statut: commande.statut,
                estVerrouillee: commande.estVerrouillee
              };
              
              // Mettre à jour l'état de verrouillage en fonction du statut de la commande
              setIsLocked(commande.estVerrouillee || commande.statut === 'VALIDEE');
            } else {
              console.error('Erreur lors de la récupération des lignes:', await lignesResponse.text());
            }
          } else {
            console.error('Erreur lors de la récupération de la commande spécifique:', await commandeResponse.text());
          }
        } catch (error) {
          console.error('Erreur lors de la récupération de la commande spécifique:', error);
        }
      } else {
        // Si aucun ID spécifique n'est fourni, récupérer la dernière commande pour ce chantier
        try {
          console.log('Récupération de la dernière commande pour le chantier');
          const commandeResponse = await fetch(`/api/chantiers/${chantierId}/commandes`);
          
          if (commandeResponse.ok) {
            const commandes = await commandeResponse.json();
            console.log('Commandes récupérées:', commandes);
            
            if (commandes && commandes.length > 0) {
              // Trier les commandes par ID pour obtenir la plus récente
              const derniereCommande = commandes[0]; // Déjà triées par date desc dans l'API
              console.log('Dernière commande chargée:', derniereCommande);
              
              // Utiliser directement les lignes incluses dans la réponse
              const lignes = derniereCommande.lignes || [];
              console.log('Lignes récupérées:', lignes);
              
              // Mettre à jour l'état avec les données récupérées
              newCommande = {
                id: derniereCommande.id,
                chantierId: chantierId,
                clientId: derniereCommande.clientId || clientId,
                clientNom: clientNom,
                dateCommande: new Date(derniereCommande.dateCommande),
                reference: derniereCommande.reference,
                tauxTVA: derniereCommande.tauxTVA || 0,
                lignes: lignes.map((ligne: LigneCommande) => ({
                  id: ligne.id,
                  commandeId: ligne.commandeId,
                  ordre: ligne.ordre,
                  article: ligne.article,
                  description: ligne.description,
                  type: ligne.type,
                  unite: ligne.unite,
                  prixUnitaire: ligne.prixUnitaire,
                  quantite: ligne.quantite,
                  total: ligne.total,
                  estOption: ligne.estOption
                })),
                sousTotal: derniereCommande.sousTotal,
                totalOptions: derniereCommande.totalOptions,
                tva: derniereCommande.tva,
                total: derniereCommande.total,
                statut: derniereCommande.statut,
                estVerrouillee: derniereCommande.estVerrouillee
              };
              
              // Mettre à jour l'état de verrouillage en fonction du statut de la commande
              setIsLocked(derniereCommande.estVerrouillee || derniereCommande.statut === 'VALIDEE');
            } else {
              console.log('Aucune commande existante, création d\'une nouvelle commande');
            }
          } else {
            console.error('Erreur lors de la récupération des commandes:', await commandeResponse.text());
          }
        } catch (commandesError) {
          console.error('Erreur lors de la récupération des commandes:', commandesError);
        }
      }
      
      // Définir la commande (soit nouvelle, soit existante)
      console.log('Commande finale à utiliser:', newCommande);
      setCommande(newCommande);
      
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setLoading(false);
    }
  }, [chantierId]);

  // Ajouter le chargement des informations du chantier
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${chantierId}`)
        if (!res.ok) throw new Error('Erreur lors de la récupération du chantier')
        const data = await res.json()
        setChantier(data)
      } catch (error) {
        console.error('Erreur:', error)
        toast.error('Erreur lors du chargement des informations du chantier')
      }
    }

    fetchChantier()
    loadData()
  }, [chantierId, status, router, loadData])

  // Recalculer les totaux
  const recalculerTotaux = useCallback((lignes: LigneCommande[]) => {
    // Exclure les titres et sous-titres des calculs (type TITRE et SOUS_TITRE)
    const lignesCalculables = lignes.filter(l => l.type !== 'TITRE' && l.type !== 'SOUS_TITRE');
    
    const sousTotal = lignesCalculables
      .filter(l => !l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const totalOptions = lignesCalculables
      .filter(l => l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const tauxTVA = commande.tauxTVA;
    console.log('Taux TVA utilisé pour le calcul:', tauxTVA);
    
    const tva = (sousTotal * tauxTVA) / 100;
    const total = sousTotal + tva;
    
    console.log('Recalcul des totaux:', {
      sousTotal,
      totalOptions,
      tauxTVA,
      tva,
      total
    });
    
    return { sousTotal, totalOptions, tva, total };
  }, [commande.tauxTVA])

  // Effet pour recalculer les totaux lorsque le taux de TVA change
  useEffect(() => {
    if (commande.lignes.length === 0) return;
    const { sousTotal, totalOptions, tva, total } = recalculerTotaux(commande.lignes);
    setCommande(prev => {
      if (
        sousTotal === prev.sousTotal &&
        totalOptions === prev.totalOptions &&
        tva === prev.tva &&
        total === prev.total
      ) {
        return prev;
      }
      return {
        ...prev,
        sousTotal,
        totalOptions,
        tva,
        total,
      };
    });
  }, [commande.lignes, recalculerTotaux]);

  // removed unused handleTVAChange

  const addLigne = () => {
    // Générer un ID temporaire négatif pour éviter les conflits avec les IDs de la base de données
    const tempId = -(commande.lignes.length + 1);
    
    const newLigne: Omit<LigneCommande, 'id' | 'commandeId'> & { id: number } = {
      id: tempId,
      ordre: commande.lignes.length,
      article: '',
      description: '',
      type: 'QP',
      unite: 'Pièces',
      prixUnitaire: 0,
      quantite: 0,
      total: 0,
      estOption: false
    }

    setCommande(prev => ({
      ...prev,
      lignes: [...prev.lignes, newLigne]
    }))
  }

  

  const updateLigne = (id: number, field: string, value: string | number | boolean) => {
    setCommande(prev => {
      const newLignes = prev.lignes.map(ligne => {
        if (ligne.id === id) {
          const updatedLigne = { ...ligne, [field]: value }
          // Recalculer le total de la ligne
          if (field === 'prixUnitaire' || field === 'quantite') {
            updatedLigne.total = updatedLigne.prixUnitaire * updatedLigne.quantite
          }
          return updatedLigne
        }
        return ligne
      })

      // Recalculer les totaux
      const { sousTotal, totalOptions, tva, total } = recalculerTotaux(newLignes);

      return {
        ...prev,
        lignes: newLignes,
        sousTotal,
        totalOptions,
        tva,
        total
      }
    })
  }

  const deleteLigne = (id: number) => {
    setCommande(prev => {
      const newLignes = prev.lignes.filter(l => l.id !== id)
      
      // Recalculer les totaux
      const { sousTotal, totalOptions, tva, total } = recalculerTotaux(newLignes);

      return {
        ...prev,
        lignes: newLignes,
        sousTotal,
        totalOptions,
        tva,
        total
      }
    })
  }

  const moveLigne = (dragIndex: number, hoverIndex: number) => {
    setCommande(prev => {
      const newLignes = [...prev.lignes]
      const dragLigne = newLignes[dragIndex]
      newLignes.splice(dragIndex, 1)
      newLignes.splice(hoverIndex, 0, dragLigne)
      return {
        ...prev,
        lignes: newLignes.map((ligne, index) => ({ ...ligne, ordre: index }))
      }
    })
  }

  // Fonction pour sauvegarder la commande
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Vérifications de base
      if (!commande.clientId) {
        showConfirmation({
          type: 'warning',
          title: 'Client manquant',
          message: 'Veuillez sélectionner un client avant de sauvegarder la commande.',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => {}
        });
        return;
      }
      
      if (commande.lignes.length === 0) {
        showConfirmation({
          type: 'warning',
          title: 'Lignes manquantes',
          message: 'Veuillez ajouter au moins une ligne à la commande avant de sauvegarder.',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => {}
        });
        return;
      }
      
      // Préparation des données
      type CommandePayload = {
        id?: number;
        chantierId: string;
        clientId: string | null;
        dateCommande: string;
        reference: string | null;
        tauxTVA: number;
        sousTotal: number;
        totalOptions: number;
        tva: number;
        total: number;
        statut: string;
        estVerrouillee: boolean;
        lignes: Array<{
          id?: number;
          ordre: number;
          article: string;
          description: string;
          type: string;
          unite: string;
          prixUnitaire: number;
          quantite: number;
          total: number;
          estOption: boolean;
        }>;
      };

      const commandeData: CommandePayload = {
        id: commande.id, // Inclure l'ID seulement s'il existe
        chantierId: chantierId,
        clientId: commande.clientId,
        dateCommande: commande.dateCommande.toISOString(),
        reference: commande.reference || null,
        tauxTVA: commande.tauxTVA || 0,
        sousTotal: commande.sousTotal || 0,
        totalOptions: commande.totalOptions || 0,
        tva: commande.tva || 0,
        total: commande.total || 0,
        statut: 'VALIDEE', // Définir directement le statut à VALIDEE
        estVerrouillee: false, // Ne pas verrouiller pour permettre des modifications ultérieures
        lignes: commande.lignes.map(ligne => ({
          id: ligne.id, // Inclure l'ID seulement s'il existe
          ordre: ligne.ordre,
          article: ligne.article || '',
          description: ligne.description || '',
          type: ligne.type || 'QP',
          unite: ligne.unite || 'Pièces',
          prixUnitaire: ligne.prixUnitaire || 0,
          quantite: ligne.quantite || 0,
          total: ligne.total || 0,
          estOption: ligne.estOption || false
        }))
      };
      
      // Supprimer les propriétés undefined
      if (!commandeData.id) delete commandeData.id;
      commandeData.lignes = commandeData.lignes.map((ligne) => {
        const normalized = { ...ligne };
        if (!normalized.id) delete (normalized as { id?: number }).id;
        return normalized;
      });
      
      console.log('Données à enregistrer:', commandeData);
      
      // Envoi de la requête
      const response = await fetch('/api/commandes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandeData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de l\'enregistrement:', errorText);
        throw new Error(`Erreur lors de l'enregistrement: ${errorText}`);
      }
      
      // Traitement de la réponse
      const savedCommande = await response.json();
      console.log('Commande enregistrée:', savedCommande);
      
      // Mise à jour de l'état
      setCommande({
        ...savedCommande,
        dateCommande: new Date(savedCommande.dateCommande),
        lignes: savedCommande.lignes || [],
        clientNom: commande.clientNom // Conserver le nom du client
      });
      
      // Mise à jour de l'état de verrouillage
      setIsLocked(true);
      
      // Mise à jour de l'URL
      if (savedCommande.id) {
        const url = new URL(window.location.href);
        url.searchParams.set('id', savedCommande.id.toString());
        window.history.pushState({}, '', url.toString());
      }
      
      toast.success('Commande enregistrée et validée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // Fonction pour rouvrir une commande verrouillée
  const handleReopenCommande = async () => {
    try {
      // Vérifier si l'utilisateur est un administrateur ou le créateur de la commande
      if (!session) {
        alert('Vous devez être connecté pour rouvrir une commande.');
        return;
      }
      
      // Permettre aux administrateurs et aux utilisateurs qui ont créé la commande de la rouvrir
      const canReopen = session.user.role === 'ADMIN' || 
                       session.user.role === 'MANAGER' || 
                       (commande.createdBy && commande.createdBy === session.user.email);
      
      if (!canReopen) {
        alert('Vous n\'avez pas les droits pour rouvrir cette commande. Seuls les administrateurs, managers ou le créateur de la commande peuvent la rouvrir.');
        return;
      }
      
      if (!commande.id) {
        alert('Impossible de rouvrir une commande qui n\'a pas encore été enregistrée.');
        return;
      }
      
      // Préparer les données pour la mise à jour
      const commandeData = {
        id: commande.id,
        chantierId: commande.chantierId,
        clientId: commande.clientId,
        dateCommande: commande.dateCommande.toISOString(),
        reference: commande.reference,
        tauxTVA: commande.tauxTVA,
        sousTotal: commande.sousTotal,
        totalOptions: commande.totalOptions,
        tva: commande.tva,
        total: commande.total,
        statut: 'BROUILLON',
        estVerrouillee: false,
        lignes: commande.lignes
      };
      
      console.log('Données pour réouverture:', commandeData);
      
      // Envoyer la requête pour mettre à jour la commande
      const response = await fetch(`/api/commandes/${commande.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commandeData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur lors de la réouverture:', errorText);
        throw new Error(`Erreur lors de la réouverture: ${errorText}`);
      }
      
      const updatedCommande = await response.json();
      console.log('Commande rouverte avec succès:', updatedCommande);
      
      // Mettre à jour l'état avec la commande mise à jour
      setCommande({
        ...updatedCommande,
        dateCommande: new Date(updatedCommande.dateCommande),
        lignes: updatedCommande.lignes || [],
        clientNom: commande.clientNom // Conserver le nom du client
      });
      
      // Mettre à jour l'état de verrouillage
      setIsLocked(false);
      
      alert('Commande rouverte avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      alert(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  };

  // Fonction pour exporter la commande en Excel
  const exportCommandeToExcel = async () => {
    if (!commande || !chantierId) {
      toast.error('Aucune commande à exporter');
      return;
    }

    // Vérifier si la commande a été enregistrée (a un ID)
    if (!commande.id) {
      const confirmed = confirm('Vous devez enregistrer la commande avant de pouvoir l\'exporter en Excel. Voulez-vous l\'enregistrer maintenant ?');
      
      if (confirmed) {
        // Enregistrer la commande d'abord
        await handleSave();
        // Informer l'utilisateur
        toast.success('Commande enregistrée ! Vous pouvez maintenant l\'exporter.');
      }
      return;
    }

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/commandes/${commande.id}/export-excel`);
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'export');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Commande_${chantierId}_${commande.reference || commande.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Commande exportée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export de la commande');
    }
  };

  // Fonction pour télécharger un modèle Excel pour l'importation
  const downloadExcelTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bon de commande');
    
    // Définir les en-têtes dans le même format que celui attendu à l'importation
    worksheet.columns = [
      { header: 'Article', key: 'article', width: 20 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Unité', key: 'unite', width: 10 },
      { header: 'Prix Unitaire', key: 'prixUnitaire', width: 15 },
      { header: 'Quantité', key: 'quantite', width: 10 },
      { header: 'Option', key: 'option', width: 10 }
    ];
    
    // Ajouter quelques lignes d'exemple
    worksheet.addRow({
      article: 'EX001',
      description: 'Exemple de produit',
      type: 'QP',
      unite: 'Pièces',
      prixUnitaire: 100,
      quantite: 1,
      option: 'Non'
    });
    
    worksheet.addRow({
      article: 'EX002',
      description: 'Exemple de service',
      type: 'FF',
      unite: 'Heures',
      prixUnitaire: 75,
      quantite: 2,
      option: 'Non'
    });
    
    // Ajouter un exemple d'option
    worksheet.addRow({
      article: 'OPT001',
      description: 'Option exemple',
      type: 'QP',
      unite: 'Pièces',
      prixUnitaire: 50,
      quantite: 1,
      option: 'Oui'
    });
    
    // Mettre en forme l'en-tête
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF333333' },
      bgColor: { argb: 'FF333333' }
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    
    // Générer le fichier
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_bon_commande.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Référence pour l'input file
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fonction pour déclencher le clic sur l'input file
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Fonction pour importer un fichier Excel
  const importExcelFile = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    try {
      const file = event.target.files[0];
      const arrayBuffer = await file.arrayBuffer();
      
      // Chargement du fichier Excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Récupérer la première feuille
      const worksheet = workbook.getWorksheet(1);
      if (!worksheet) {
        alert('Le fichier Excel est vide ou n\'a pas le bon format.');
        return;
      }

      // Récupérer les en-têtes
      const headers: Record<number, string> = {};
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber] = cell.value?.toString() || '';
      });
      
      // Vérifier que les en-têtes requis sont présents
      const requiredHeaders = ['Article', 'Description', 'Prix Unitaire', 'Quantité'];
      const missingHeaders = requiredHeaders.filter(header => 
        !Object.values(headers).some(h => h === header)
      );
      
      if (missingHeaders.length > 0) {
        alert(`Le fichier ne contient pas tous les en-têtes requis. Manquants : ${missingHeaders.join(', ')}. Veuillez télécharger et utiliser le modèle fourni.`);
        return;
      }

      // Convertir les données en lignes de commande
      const newLignes: Array<Omit<LigneCommande, 'id' | 'commandeId'>> = [];
      
      worksheet.eachRow((row, rowNumber) => {
        // Ignorer la ligne d'en-tête
        if (rowNumber === 1) return;
        
        const rowData: Record<string, string | number | null> = {};
        row.eachCell((cell, colNumber) => {
          const value = cell.value as unknown;
          rowData[headers[colNumber]] = typeof value === 'object' && value !== null
            ? String(value)
            : (value as string | number | null);
        });
        
        // Vérifier si les champs obligatoires sont présents
        if (!rowData['Article'] && !rowData['Description']) {
          return;
        }
        
        newLignes.push({
          ordre: rowNumber - 2, // -2 car on ignore la ligne d'en-tête et on commence à 0
          article: rowData['Article']?.toString() || '',
          description: rowData['Description']?.toString() || '',
          type: rowData['Type']?.toString() || 'QP',
          unite: rowData['Unité']?.toString() || 'Pièces',
          prixUnitaire: Number(rowData['Prix Unitaire']) || 0,
          quantite: Number(rowData['Quantité']) || 0,
          total: (Number(rowData['Prix Unitaire']) || 0) * (Number(rowData['Quantité']) || 0),
          estOption: rowData['Option']?.toString() === 'Oui'
        });
      });

      if (newLignes.length === 0) {
        alert('Aucune ligne valide n\'a été trouvée dans le fichier.');
        return;
      }

      // Ajouter les nouvelles lignes à la commande
      setCommande(prev => {
        // Générer des IDs temporaires pour les nouvelles lignes
        const lignesWithIds = newLignes.map((ligne, index) => ({
          ...ligne,
          id: -(prev.lignes.length + index + 1) // IDs négatifs pour éviter les conflits
        }));

        // Recalculer les totaux
        const allLignes = [...prev.lignes, ...lignesWithIds];
        const { sousTotal, totalOptions, tva, total } = recalculerTotaux(allLignes);

        return {
          ...prev,
          lignes: allLignes,
          sousTotal,
          totalOptions,
          tva,
          total
        };
      });

      alert(`${newLignes.length} lignes ont été importées avec succès.`);
    } catch (error) {
      console.error('Erreur lors de l\'importation du fichier Excel:', error);
      alert('Une erreur est survenue lors de l\'importation du fichier Excel.');
    }

    // Réinitialiser l'input file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  // Fonction pour gérer la navigation
  // removed unused handleNavigation

  if (status === 'loading') return <div className="p-8">Chargement...</div>

  return (
    <div className="container mx-auto py-6">
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}
      {ConfirmationModalComponent}
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* En-tête avec informations principales et boutons d'action */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-8 overflow-hidden">
          {/* Motif de fond sophistiqué */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-700/20"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-4 left-4 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-4 right-4 w-24 h-24 bg-purple-300/20 rounded-full blur-lg"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/chantiers/${chantierId}/etats`)}
                className="mr-4 text-white/80 hover:text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm p-3 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl border border-white/30 hover:border-white/50 hover:scale-105"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center mb-3">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <svg className="w-6 h-6 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-bold text-xl">
                      Commande {commande.reference ? `#${commande.reference}` : 'Nouvelle'}
                    </span>
                  </div>
                  {isLocked && (
                    <span className="ml-4 inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-red-500/90 text-white shadow-lg ring-2 ring-red-300/50 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      🔒 Verrouillée
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-white/90">
                  <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    📅 {commande.dateCommande ? new Date(commande.dateCommande).toLocaleDateString('fr-FR') : 'Date non définie'}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    🏗️ {chantier?.nomChantier || 'Chantier non défini'}
                  </span>
                  {commande.clientNom && (
                    <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      👤 {commande.clientNom}
                    </span>
                  )}
                  <span className="inline-flex items-center px-3 py-1 bg-emerald-500/80 backdrop-blur-sm rounded-full text-sm font-bold shadow-sm ring-2 ring-emerald-300/50">
                    💰 {commande.total.toFixed(2)} €
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 self-end md:self-auto">
              {commande.id && (
                <button
                  onClick={() => window.open(`/api/commandes/${commande.id}/pdf-modern`, '_blank')}
                  className="inline-flex items-center px-6 py-3 bg-blue-600/90 hover:bg-blue-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-blue-400/50 hover:border-blue-300 hover:scale-105 font-semibold"
                >
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  📄 PDF Moderne
                </button>
              )}
              
              
              <button
                onClick={handleSave}
                disabled={saving || isLocked}
                className={`inline-flex items-center px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50 font-semibold ${
                  (saving || isLocked) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                }`}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    ⏳ Enregistrement...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    💾 Enregistrer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <>
              {/* En-tête de la commande */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border-2 border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 pb-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">Informations générales</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Référence</label>
                      <input
                        type="text"
                        value={commande.reference || ''}
                        onChange={(e) => setCommande({ ...commande, reference: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-3 py-2.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
                        placeholder="Référence..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Date</label>
                      <input
                        type="date"
                        value={commande.dateCommande ? new Date(commande.dateCommande).toISOString().substr(0, 10) : ''}
                        onChange={(e) => setCommande({ ...commande, dateCommande: new Date(e.target.value) })}
                        disabled={isLocked}
                        className="w-full px-3 py-2.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border-2 border-gray-200 dark:border-gray-600">
                  <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 pb-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">Paramètres</h2>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Taux TVA (%) <span className="text-xs text-gray-600 dark:text-gray-300">(Déroulant)</span>
                      </label>
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
                          disabled={isLocked}
                          className="w-full appearance-none px-3 py-2.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
                        >
                          <option value="0">0%</option>
                          <option value="6">6%</option>
                          <option value="21">21%</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
                          <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tableau des lignes de commande */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-gray-200 dark:border-gray-600 overflow-hidden mb-6">
                <div className="relative px-6 py-6 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
                  {/* Motif de fond élégant */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-indigo-800/20"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-16 -translate-y-16"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-300/20 rounded-full blur-xl transform -translate-x-8 translate-y-8"></div>
                  
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                        <svg className="w-6 h-6 mr-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span className="font-bold text-xl">📋 Détail de la commande</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium shadow-sm">
                        📊 {commande.lignes.length} ligne{commande.lignes.length > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-500/80 backdrop-blur-sm rounded-full text-sm font-bold shadow-sm ring-2 ring-emerald-300/50">
                        💰 {commande.sousTotal.toFixed(2)} € HT
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <DndProvider backend={HTML5Backend}>
                    <table className="min-w-full divide-y-2 divide-gray-300 dark:divide-gray-600">
                      <thead className="bg-gradient-to-r from-slate-100 to-gray-100 dark:from-slate-700 dark:to-gray-700">
                        <tr>
                          <th scope="col" className="px-4 py-4 text-left text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-8">#</th>
                          <th scope="col" className="px-4 py-4 text-left text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">📝 Article</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-4 text-left text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">📄 Description</th>
                          <th scope="col" className="px-4 py-4 text-left text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-24">🏗️ Type</th>
                          <th scope="col" className="px-4 py-4 text-left text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-24">📏 Unité</th>
                          <th scope="col" className="px-4 py-4 text-center text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-24">🔢 Quantité</th>
                          <th scope="col" className="px-4 py-4 text-right text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-24">💰 Prix Unit.</th>
                          <th scope="col" className="px-4 py-4 text-right text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-24">💵 Total</th>
                          <th scope="col" className="px-4 py-4 text-center text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-16">⭐ Option</th>
                          <th scope="col" className="px-4 py-4 text-center text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider w-16">⚙️ Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y-2 divide-gray-200 dark:divide-gray-600">
                        {commande.lignes.map((ligne, index) => (
                          <LigneCommande
                            key={index}
                            id={ligne.id}
                            index={index}
                            article={ligne.article}
                            description={ligne.description}
                            type={ligne.type}
                            unite={ligne.unite}
                            prixUnitaire={ligne.prixUnitaire}
                            quantite={ligne.quantite}
                            total={ligne.total}
                            estOption={ligne.estOption}
                            isLocked={isLocked}
                            moveLigne={!isLocked ? moveLigne : () => {}}
                            updateLigne={updateLigne}
                            deleteLigne={!isLocked ? deleteLigne : () => {}}
                          />
                        ))}
                      </tbody>
                    </table>
                  </DndProvider>
                </div>
                {!isLocked && (
                  <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <button
                      onClick={addLigne}
                      className="flex items-center justify-center w-full md:w-auto px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter une ligne
                    </button>
                  </div>
                )}
              </div>

              {/* Résumé de la commande */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="flex flex-col space-y-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 md:p-6 border-2 border-gray-200 dark:border-gray-600">
                      <h2 className="text-lg md:text-xl font-bold mb-4 border-b-2 pb-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">Actions</h2>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={triggerFileInput}
                          disabled={isLocked}
                          className={`flex items-center px-4 py-2.5 text-sm md:text-base font-medium rounded-md shadow-sm bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors ${
                            isLocked ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                          Importer Excel
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={importExcelFile}
                          accept=".xlsx,.xls"
                          className="hidden"
                        />
                        <button
                          onClick={downloadExcelTemplate}
                          className="flex items-center px-4 py-2.5 text-sm md:text-base font-medium rounded-md shadow-sm bg-green-600 text-white hover:bg-green-500 dark:bg-green-700 dark:hover:bg-green-600 transition-colors"
                        >
                          <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                          Template Excel
                        </button>
                        
                        {commande && (
                          <button
                            onClick={exportCommandeToExcel}
                            className={`flex items-center px-4 py-2.5 text-sm md:text-base font-medium rounded-md shadow-sm transition-colors ${
                              commande.id 
                                ? 'bg-blue-600 text-white hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600' 
                                : 'bg-gray-400 text-white hover:bg-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500'
                            }`}
                            title={!commande.id ? 'Enregistrez d\'abord la commande pour pouvoir l\'exporter' : 'Exporter la commande en Excel'}
                          >
                            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                            Exporter Excel
                            {!commande.id && (
                              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-yellow-500 text-white rounded-full">!</span>
                            )}
                          </button>
                        )}
                        {commande.id && (
                          <button
                            onClick={handleReopenCommande}
                            className={`flex items-center px-4 py-2.5 text-sm md:text-base font-medium rounded-md shadow-sm ${
                              isLocked
                                ? 'bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-700 dark:hover:bg-amber-600'
                                : 'bg-gray-600 text-white hover:bg-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600'
                            } transition-colors`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              {isLocked ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              )}
                            </svg>
                            {isLocked ? 'Déverrouiller' : 'Verrouiller'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="relative bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-800 text-white rounded-xl shadow-lg overflow-hidden p-6">
                    {/* Motif de fond élégant */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-cyan-800/20"></div>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform translate-x-8 -translate-y-8"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-300/20 rounded-full blur-2xl transform -translate-x-16 translate-y-16"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center mb-6">
                        <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                          <svg className="w-5 h-5 mr-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span className="font-bold text-lg">💰 Récapitulatif</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                          <span className="text-white font-semibold text-sm md:text-base">📊 Sous-total HT:</span>
                          <span className="font-bold text-white text-base md:text-lg">{commande.sousTotal.toFixed(2)} €</span>
                        </div>
                        {commande.totalOptions > 0 && (
                          <div className="flex justify-between items-center p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                            <span className="text-white font-semibold text-sm md:text-base">⭐ Total options:</span>
                            <span className="font-bold text-white text-base md:text-lg">{commande.totalOptions.toFixed(2)} €</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-3 md:p-4 bg-white/20 backdrop-blur-sm rounded-lg shadow-md">
                          <span className="text-white font-semibold text-sm md:text-base">🧾 TVA ({commande.tauxTVA}%):</span>
                          <span className="font-bold text-white text-base md:text-lg">{commande.tva.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between items-center p-4 md:p-5 bg-white/30 backdrop-blur-sm rounded-xl shadow-xl ring-2 ring-white/50 mt-4">
                          <span className="font-bold text-white text-lg md:text-xl">🎯 Total TTC:</span>
                          <span className="font-bold text-2xl md:text-3xl text-white drop-shadow-lg">{commande.total.toFixed(2)} €</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 

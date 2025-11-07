'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef, use, useCallback } from 'react';
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, ArrowLeftIcon, CurrencyEuroIcon } from '@heroicons/react/24/outline'
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
  chantierSlug?: string;
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
    statut: 'brouillon',
    chantierSlug: chantierId
  })
  const [chantier, setChantier] = useState<{ nomChantier?: string; id?: string } | null>(null)
  const [chantierPrimaryId, setChantierPrimaryId] = useState<string | null>(null)

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
      const primaryId: string = chantierData.id;
      setChantierPrimaryId(primaryId);
      
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
        chantierId: primaryId,
        chantierSlug: chantierId,
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
                chantierId: commande.chantierId || primaryId,
                chantierSlug: chantierId,
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
                chantierId: derniereCommande.chantierId || primaryId,
                chantierSlug: chantierId,
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
        if (data.id) {
          setChantierPrimaryId(data.id)
        }
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
    
    const sousTotalRaw = lignesCalculables
      .filter(l => !l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const sousTotal = Math.round(sousTotalRaw * 100) / 100;
    
    const totalOptionsRaw = lignesCalculables
      .filter(l => l.estOption)
      .reduce((sum, l) => sum + l.total, 0);
    
    const totalOptions = Math.round(totalOptionsRaw * 100) / 100;
    
    const tauxTVA = commande.tauxTVA;
    console.log('Taux TVA utilisé pour le calcul:', tauxTVA);
    
    const tva = Math.round(((sousTotal * tauxTVA) / 100) * 100) / 100;
    const total = Math.round((sousTotal + tva) * 100) / 100;
    
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
            updatedLigne.total = Math.round((updatedLigne.prixUnitaire * updatedLigne.quantite) * 100) / 100
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
        chantierSlug?: string;
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

      if (!chantierPrimaryId) {
        toast.error('Erreur: ID du chantier non disponible');
        return;
      }

      const commandeData: CommandePayload = {
        id: commande.id, // Inclure l'ID seulement s'il existe
        chantierId: chantierPrimaryId,
        chantierSlug: commande.chantierSlug || chantierId,
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
        clientNom: commande.clientNom, // Conserver le nom du client
        chantierSlug: commande.chantierSlug || chantierId
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
        toast.error('Vous devez être connecté pour rouvrir une commande.');
        return;
      }
      
      // Permettre aux administrateurs et aux utilisateurs qui ont créé la commande de la rouvrir
      const canReopen = session.user.role === 'ADMIN' || 
                       session.user.role === 'MANAGER' || 
                       (commande.createdBy && commande.createdBy === session.user.email);
      
      if (!canReopen) {
        toast.error('Vous n\'avez pas les droits pour rouvrir cette commande.');
        return;
      }
      
      if (!commande.id) {
        toast.error('Impossible de rouvrir une commande qui n\'a pas encore été enregistrée.');
        return;
      }

      // Vérifier s'il existe des états d'avancement pour ce chantier (client ou sous-traitant)
      try {
        const etatsResponse = await fetch(`/api/chantiers/${chantierId}/etats-avancement`);
        if (etatsResponse.ok) {
          const etats = await etatsResponse.json();
          if (Array.isArray(etats) && etats.length > 0) {
            showConfirmation({
              title: 'Déverrouillage impossible',
              message: 'Cette commande est déjà associée à au moins un état d\'avancement. Vous ne pouvez pas la déverrouiller.',
              type: 'warning',
              confirmText: 'Compris',
              showCancel: false,
              onConfirm: () => {}
            });
            return;
          }
        } else {
          console.warn('Impossible de vérifier les états d\'avancement:', await etatsResponse.text());
        }
      } catch (etatError) {
        console.error('Erreur lors de la vérification des états d\'avancement:', etatError);
      }
      
      if (!chantierPrimaryId) {
        toast.error('Erreur: ID du chantier non disponible');
        return;
      }

      // Préparer les données pour la mise à jour
      const commandeData = {
        id: commande.id,
        chantierId: chantierPrimaryId,
        chantierSlug: commande.chantierSlug || chantierId,
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
        clientNom: commande.clientNom, // Conserver le nom du client
        chantierSlug: commande.chantierSlug || chantierId
      });
      
      // Mettre à jour l'état de verrouillage
      setIsLocked(false);
      
      toast.success('Commande déverrouillée avec succès');
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(`Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* <Toaster position="top-right" /> */} {/* Déplacé vers RootClientProviders */}
      {ConfirmationModalComponent}
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header léger style backdrop-blur */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Effet de fond subtil avec dégradé blue/indigo (couleur de l'icône Commande) - opacité 60% */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/60 via-blue-700/60 to-indigo-800/60 dark:from-blue-600/30 dark:via-blue-700/30 dark:to-indigo-800/30"></div>
            
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <CurrencyEuroIcon className="w-6 h-6 mr-3 text-blue-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-blue-900 dark:text-white">
                      Commande {commande.reference ? `#${commande.reference}` : 'Nouvelle'}
                    </h1>
                  </div>
                  {isLocked && (
                    <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-red-500/90 text-white shadow-lg ring-2 ring-red-300/50 backdrop-blur-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      🔒 Verrouillée
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {commande.id && (
                    <button
                      onClick={() => window.open(`/api/commandes/${commande.id}/pdf-modern`, '_blank')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-blue-900 dark:text-white"
                    >
                      <DocumentArrowDownIcon className="h-5 w-5" />
                      Générer PDF
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || isLocked}
                    className={`inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-blue-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900 dark:border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations de la commande */}
        <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              📅 {commande.dateCommande ? new Date(commande.dateCommande).toLocaleDateString('fr-FR') : 'Date non définie'}
            </span>
            <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              🏗️ {chantier?.nomChantier || 'Chantier non défini'}
            </span>
            {commande.clientNom && (
              <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                👤 {commande.clientNom}
              </span>
            )}
            <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-300/50 dark:ring-emerald-700/50">
              💰 {commande.total.toFixed(2)} €
            </span>
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
              {/* Tableau des lignes de commande */}
              <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6">
                <div className="relative px-6 py-4 bg-gradient-to-br from-blue-600/10 via-blue-700/10 to-indigo-800/10 dark:from-blue-600/5 dark:via-blue-700/5 dark:to-indigo-800/5 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <h2 className="text-lg font-bold text-blue-900 dark:text-white">Détail de la commande</h2>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="inline-flex items-center px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                        {commande.lignes.length} ligne{commande.lignes.length > 1 ? 's' : ''}
                      </span>
                      <span className="inline-flex items-center px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-sm font-bold text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-300/50 dark:ring-emerald-700/50">
                        {commande.sousTotal.toFixed(2)} € HT
                      </span>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <DndProvider backend={HTML5Backend}>
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-8">#</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Article</th>
                          <th scope="col" className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Type</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Unité</th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Quantité</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Prix Unit.</th>
                          <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Total</th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">Option</th>
                          <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
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
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-blue-600/10 via-blue-700/10 to-indigo-800/10 dark:from-blue-600/5 dark:via-blue-700/5 dark:to-indigo-800/5">
                    <button
                      onClick={addLigne}
                      className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 dark:from-blue-700 dark:to-indigo-800 dark:hover:from-blue-600 dark:hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Ajouter une ligne
                    </button>
                  </div>
                )}
              </div>

              {/* En-tête de la commande */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Informations générales</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Référence</label>
                      <input
                        type="text"
                        value={commande.reference || ''}
                        onChange={(e) => setCommande({ ...commande, reference: e.target.value })}
                        disabled={isLocked}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                        placeholder="Référence..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date</label>
                      <input
                        type="date"
                        value={commande.dateCommande ? new Date(commande.dateCommande).toISOString().substr(0, 10) : ''}
                        onChange={(e) => setCommande({ ...commande, dateCommande: new Date(e.target.value) })}
                        disabled={isLocked}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Paramètres</h2>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Taux TVA (%)
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
                          className="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 transition-colors"
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

              {/* Résumé de la commande */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Actions</h2>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={triggerFileInput}
                        disabled={isLocked}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 dark:from-blue-700 dark:to-indigo-800 dark:hover:from-blue-600 dark:hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                          isLocked ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <ArrowUpTrayIcon className="h-5 w-5" />
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
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 dark:from-green-700 dark:to-emerald-800 dark:hover:from-green-600 dark:hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <ArrowDownTrayIcon className="h-5 w-5" />
                        Template Excel
                      </button>
                      
                      {commande && (
                        <button
                          onClick={exportCommandeToExcel}
                          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                            commande.id 
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 dark:from-blue-700 dark:to-indigo-800 dark:hover:from-blue-600 dark:hover:to-indigo-700 focus:ring-blue-500' 
                              : 'bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 dark:from-gray-600 dark:to-gray-700 dark:hover:from-gray-500 dark:hover:to-gray-600 focus:ring-gray-500 opacity-60 cursor-not-allowed'
                          }`}
                          title={!commande.id ? 'Enregistrez d\'abord la commande pour pouvoir l\'exporter' : 'Exporter la commande en Excel'}
                          disabled={!commande.id}
                        >
                          <DocumentArrowDownIcon className="h-5 w-5" />
                          Exporter Excel
                          {!commande.id && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-yellow-500 text-white rounded-full">!</span>
                          )}
                        </button>
                      )}
                      {commande.id && isLocked && commande.statut === 'VALIDEE' && (
                        <button
                          onClick={handleReopenCommande}
                          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 dark:from-amber-700 dark:to-orange-800 dark:hover:from-amber-600 dark:hover:to-orange-700 focus:ring-amber-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4" />
                          </svg>
                          Déverrouiller
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">Récapitulatif</h2>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sous-total HT:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{commande.sousTotal.toFixed(2)} €</span>
                      </div>
                      {commande.totalOptions > 0 && (
                        <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total options:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{commande.totalOptions.toFixed(2)} €</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TVA ({commande.tauxTVA}%):</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{commande.tva.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between items-center p-4 bg-gradient-to-br from-blue-600/10 via-blue-700/10 to-indigo-800/10 dark:from-blue-600/5 dark:via-blue-700/5 dark:to-indigo-800/5 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                        <span className="font-bold text-lg text-gray-900 dark:text-white">Total TTC:</span>
                        <span className="font-bold text-2xl text-blue-900 dark:text-white">{commande.total.toFixed(2)} €</span>
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

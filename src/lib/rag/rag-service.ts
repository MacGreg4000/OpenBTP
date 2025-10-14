// Service RAG principal
import { getOllamaClient } from '@/lib/ollama/client';
import { vectorStore } from '@/lib/rag/vector-store';
import { DocumentChunk, RAGQuery, RAGResponse } from '@/types/rag';

interface ChantierEntity {
  id: string;
  chantierId: string;
  nomChantier: string;
  adresseChantier: string;
  client?: {
    nom: string;
  };
  statut: string;
  dateDebut?: Date;
  dateFin?: Date;
  budget?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}


interface NoteEntity {
  id: string;
  contenu: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

interface DocumentEntity {
  id: string;
  nom: string;
  type: string;
  description?: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RemarqueEntity {
  id: string;
  description: string;
  localisation?: string;
  estResolue: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MateriauEntity {
  id: string;
  nom: string;
  description?: string;
  quantite: number;
  codeQR?: string;
  emplacement?: {
    rack: {
      nom: string;
      localisation: string;
    };
    ligne: number;
    colonne: number;
    codeQR: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface RackEntity {
  id: string;
  nom: string;
  description?: string;
  localisation: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MachineEntity {
  id: string;
  nom: string;
  modele: string;
  numeroSerie?: string;
  localisation: string;
  statut: string;
  dateAchat?: Date;
  qrCode: string;
  commentaire?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ClientEntity {
  id: string;
  nom: string;
  email?: string;
  adresse?: string;
  telephone?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SousTraitantEntity {
  id: string;
  nom: string;
  email: string;
  contact?: string;
  adresse?: string;
  telephone?: string;
  tva?: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DepenseEntity {
  id: string;
  montant: number;
  description: string;
  categorie: string;
  dateDepense: Date;
  chantierId: string;
  chantierNom?: string;
  clientNom?: string;
}

interface TaskEntity {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  status: string;
  priority?: string;
  chantierId?: string;
  chantierNom?: string;
  assigneA?: string;
}

interface EtatAvancementEntity {
  id: string;
  etatId: string;
  pourcentage: number;
  description?: string;
  dateCreation: Date;
  chantierId: string;
  chantierNom?: string;
  clientNom?: string;
}

interface CommandeEntity {
  id: string;
  commandeId: string;
  nomCommande: string;
  statut: string;
  dateCommande: Date;
  montantHT: number;
  montantTTC: number;
  chantierId: string;
  chantierNom?: string;
  clientNom?: string;
}

export class RAGService {
  private ollamaClient = getOllamaClient();

  // Indexer un document (créer l'embedding et l'ajouter au store)
  async indexDocument(chunk: DocumentChunk): Promise<void> {
    try {
      console.log('📚 Indexation du document:', {
        id: chunk.id,
        type: chunk.metadata.type,
        entityName: chunk.metadata.entityName
      });

      // Générer l'embedding
      const embedding = await this.ollamaClient.generateEmbedding(chunk.content);
      chunk.embedding = embedding;

      // Ajouter au vector store
      await vectorStore.addDocument(chunk);

      console.log('✅ Document indexé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation:', error);
      throw error;
    }
  }

  // Répondre à une question en utilisant RAG
  async answerQuestion(query: RAGQuery): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      console.log('🤔 Traitement de la question RAG:', {
        question: query.question,
        userId: query.userId,
        context: query.context
      });

      // 1. Générer l'embedding de la question
      const queryEmbedding = await this.ollamaClient.generateEmbedding(query.question);

      // 2. Rechercher les documents similaires
      const relevantDocs = await vectorStore.searchSimilar(
        queryEmbedding,
        query.context?.limit || 5,
        {
          type: query.context?.chantierId ? 'chantier' : undefined,
          entityId: query.context?.chantierId || query.context?.clientId
        }
      );

      if (relevantDocs.length === 0) {
        return {
          answer: "Je n'ai pas trouvé d'informations pertinentes dans la base de données pour répondre à votre question.",
          sources: [],
          confidence: 0,
          query: query.question,
          processingTime: Date.now() - startTime
        };
      }

      // 3. Construire le contexte pour le LLM
      const context = this.buildContext(relevantDocs);
      
      // 4. Construire le prompt pour Ollama
      const prompt = this.buildPrompt(query.question, context);

      // 5. Générer la réponse avec Ollama
      const answer = await this.ollamaClient.generateResponse(prompt);

      // 6. Calculer la confiance (basée sur la similarité des documents)
      const confidence = this.calculateConfidence(relevantDocs);

      const processingTime = Date.now() - startTime;

      console.log('✅ Réponse RAG générée:', {
        answerLength: answer.length,
        sourcesCount: relevantDocs.length,
        confidence: confidence.toFixed(2),
        processingTime: `${processingTime}ms`
      });

      return {
        answer,
        sources: relevantDocs,
        confidence,
        query: query.question,
        processingTime
      };

    } catch (error) {
      console.error('❌ Erreur lors du traitement RAG:', error);
      
      return {
        answer: "Je rencontre un problème technique pour traiter votre question. Veuillez réessayer plus tard.",
        sources: [],
        confidence: 0,
        query: query.question,
        processingTime: Date.now() - startTime
      };
    }
  }

  // Construire le contexte à partir des documents pertinents
  private buildContext(documents: DocumentChunk[]): string {
    return documents.map((doc, index) => {
      const metadata = doc.metadata;
      return `
[Source ${index + 1}]
Type: ${metadata.type}
Entité: ${metadata.entityName}
Contenu: ${doc.content}
---`;
    }).join('\n');
  }

  // Construire le prompt pour Ollama
  private buildPrompt(question: string, context: string): string {
    return `Vous êtes un assistant intelligent pour l'application SecoTech, spécialisé dans la gestion de chantiers de construction.

CONTEXTE DE L'APPLICATION:
Vous avez accès aux informations complètes de SecoTech incluant :
- Chantiers, clients, commandes, états d'avancement
- Sous-traitants et équipes
- Inventaire complet : matériaux, racks, machines/équipements
- Stock en temps réel avec quantités et localisations
- Documents, notes et remarques

INFORMATIONS PERTINENTES:
${context}

QUESTION DE L'UTILISATEUR:
${question}

INSTRUCTIONS IMPORTANTES:
1. Répondez UNIQUEMENT en français
2. Basez votre réponse EXCLUSIVEMENT sur les informations fournies dans le contexte ci-dessus
3. NE PAS ajouter d'informations qui ne sont pas dans le contexte
4. Pour les questions sur le stock/inventaire, donnez des informations précises sur les quantités et localisations
5. Si les informations ne sont pas suffisantes, indiquez-le clairement
6. Soyez précis et concis
7. Utilisez un ton professionnel et technique approprié au secteur de la construction
8. Pour les montants, utilisez le format français (ex: 1 234,56 €)
9. Pour l'inventaire, indiquez clairement les quantités disponibles et les emplacements
10. IMPORTANT: Ne mentionnez que les informations qui sont explicitement dans le contexte fourni

RÉPONSE:`;
  }

  // Calculer la confiance basée sur la similarité des documents
  private calculateConfidence(documents: DocumentChunk[]): number {
    if (documents.length === 0) return 0;
    
    // Calcul plus sophistiqué de la confiance
    let confidence = 0;
    
    // Base de confiance selon le nombre de documents
    if (documents.length >= 3) {
      confidence = 0.8; // Bon nombre de sources
    } else if (documents.length === 2) {
      confidence = 0.7; // Sources modérées
    } else {
      confidence = 0.6; // Une seule source
    }
    
    // Bonus si on a des documents récents (basé sur la longueur du contenu)
    const avgContentLength = documents.reduce((sum, doc) => sum + doc.content.length, 0) / documents.length;
    if (avgContentLength > 200) {
      confidence += 0.1; // Contenu détaillé
    }
    
    // Bonus si on a des métadonnées riches
    const hasRichMetadata = documents.some(doc => {
      try {
        const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
        return Object.keys(metadata).length > 2;
      } catch {
        return false;
      }
    });
    
    if (hasRichMetadata) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, Math.round(confidence * 100) / 100);
  }

  // Indexer toute la base de données
  async indexAllData(): Promise<void> {
    try {
      console.log('🗄️ Indexation complète de la base de données...');
      console.log('🔍 Début de l\'indexation - timestamp:', new Date().toISOString());
      
      let totalIndexed = 0;
      
      // Indexer les chantiers
      try {
        console.log('🏗️ Étape 1/8: Indexation des chantiers...');
        await this.indexAllChantiers();
        totalIndexed++;
        console.log('✅ Étape 1/8 terminée - Chantiers');
      } catch (error) {
        console.warn('⚠️ Indexation des chantiers échouée, continuation...', error.message);
        console.warn('⚠️ Détails erreur chantiers:', error.stack);
      }
      
      // Indexer l'inventaire
      try {
        console.log('📦 Étape 2/8: Indexation de l\'inventaire...');
        await this.indexAllInventory();
        totalIndexed++;
        console.log('✅ Étape 2/8 terminée - Inventaire');
      } catch (error) {
        console.warn('⚠️ Indexation de l\'inventaire échouée, continuation...', error.message);
        console.warn('⚠️ Détails erreur inventaire:', error.stack);
      }
      
      // Indexer les clients
      try {
        console.log('👥 Étape 3/8: Indexation des clients...');
        await this.indexAllClients();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des clients échouée, continuation...', error.message);
      }
      
      // Indexer les sous-traitants
      try {
        console.log('🏗️ Étape 4/8: Indexation des sous-traitants...');
        await this.indexAllSousTraitants();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des sous-traitants échouée, continuation...', error.message);
      }
      
      // Indexer les commandes
      try {
        console.log('📋 Étape 5/8: Indexation des commandes...');
        await this.indexAllCommandes();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des commandes échouée, continuation...', error.message);
      }
      
      // Indexer les états d'avancement
      try {
        console.log('📊 Étape 6/8: Indexation des états d\'avancement...');
        await this.indexAllEtatsAvancement();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des états d\'avancement échouée, continuation...', error.message);
      }
      
      // Indexer les dépenses
      try {
        console.log('💰 Étape 7/8: Indexation des dépenses...');
        await this.indexAllDepenses();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des dépenses échouée, continuation...', error.message);
      }
      
      // Indexer les tâches
      try {
        console.log('✅ Étape 8/8: Indexation des tâches...');
        await this.indexAllTasks();
        totalIndexed++;
      } catch (error) {
        console.warn('⚠️ Indexation des tâches échouée, continuation...', error.message);
      }
      
      console.log(`✅ Indexation complète terminée - ${totalIndexed}/8 étapes réussies`);
      console.log('🔍 Fin de l\'indexation - timestamp:', new Date().toISOString());
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation complète:', error);
      console.error('❌ Détails erreur globale:', error.stack);
      throw error;
    }
  }

  // Indexer tout l'inventaire
  async indexAllInventory(): Promise<void> {
    try {
      console.log('📦 Indexation de l\'inventaire...');
      
      const { prisma } = await import('@/lib/prisma');
      
      // Debug: Vérifier la connexion à la base
      console.log('🔍 Test de connexion à la base de données...');
      const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('✅ Connexion DB OK:', dbTest);
      
      // Indexer les matériaux
      console.log('🔍 Recherche des matériaux...');
      const materiaux = await prisma.materiau.findMany();
      console.log(`📦 ${materiaux.length} matériaux trouvés`);
      if (materiaux.length > 0) {
        console.log('   Exemples:', materiaux.slice(0, 2).map(m => ({ id: m.id, nom: m.nom, quantite: m.quantite })));
      }

      for (const materiau of materiaux) {
        console.log(`   Indexation matériau: ${materiau.nom}`);
        await this.indexMateriau(materiau);
      }

      // Indexer les racks
      console.log('🔍 Recherche des racks...');
      const racks = await prisma.rack.findMany();
      console.log(`📦 ${racks.length} racks trouvés`);
      if (racks.length > 0) {
        console.log('   Exemples:', racks.slice(0, 2).map(r => ({ id: r.id, nom: r.nom, localisation: r.localisation })));
      }
      for (const rack of racks) {
        console.log(`   Indexation rack: ${rack.nom}`);
        await this.indexRack(rack);
      }

      // Indexer les machines
      console.log('🔍 Recherche des machines...');
      const machines = await prisma.machine.findMany();
      console.log(`📦 ${machines.length} machines trouvées`);
      if (machines.length > 0) {
        console.log('   Exemples:', machines.slice(0, 2).map(m => ({ id: m.id, nom: m.nom, modele: m.modele })));
      }
      for (const machine of machines) {
        console.log(`   Indexation machine: ${machine.nom}`);
        await this.indexMachine(machine);
      }

      console.log(`✅ Inventaire indexé: ${materiaux.length} matériaux, ${racks.length} racks, ${machines.length} machines`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation de l\'inventaire:', error);
      console.error('❌ Détails de l\'erreur:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  // Indexer tous les clients
  async indexAllClients(): Promise<void> {
    try {
      console.log('👥 Indexation des clients...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const clients = await prisma.client.findMany();
      for (const client of clients) {
        await this.indexClient(client);
      }

      console.log(`✅ ${clients.length} clients indexés`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des clients:', error);
      throw error;
    }
  }

  // Indexer tous les sous-traitants
  async indexAllSousTraitants(): Promise<void> {
    try {
      console.log('🏗️ Indexation des sous-traitants...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const sousTraitants = await prisma.soustraitant.findMany();
      for (const sousTraitant of sousTraitants) {
        await this.indexSousTraitant(sousTraitant);
      }

      console.log(`✅ ${sousTraitants.length} sous-traitants indexés`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des sous-traitants:', error);
      throw error;
    }
  }

  // Indexer tous les chantiers
  async indexAllChantiers(): Promise<void> {
    try {
      console.log('🏗️ Indexation de tous les chantiers...');
      
      const { prisma } = await import('@/lib/prisma');
      
      // Debug: Compter d'abord les chantiers sans relations
      const chantiersCount = await prisma.chantier.count();
      console.log(`📊 Nombre total de chantiers dans la base: ${chantiersCount}`);
      
      // Debug: Récupérer les chantiers sans relations
      const chantiersSimple = await prisma.chantier.findMany({
        select: {
          id: true,
          chantierId: true,
          nomChantier: true,
          statut: true
        }
      });
      console.log(`📋 Chantiers trouvés (simple): ${chantiersSimple.length}`);
      if (chantiersSimple.length > 0) {
        console.log('   Exemples:', chantiersSimple.slice(0, 3));
      }
      
      // Maintenant avec les relations
      const chantiers = await prisma.chantier.findMany({
        include: {
          client: true
        }
      });
      console.log(`📋 Chantiers trouvés (avec relations): ${chantiers.length}`);

      for (const chantier of chantiers) {
        console.log(`📝 Indexation du chantier: ${chantier.nomChantier} (${chantier.chantierId})`);
        // Indexer le chantier lui-même
        await this.indexChantier(chantier);
      }

      console.log(`✅ ${chantiers.length} chantiers indexés avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des chantiers:', error);
      console.error('❌ Détails de l\'erreur:', error.message);
      console.error('❌ Stack trace:', error.stack);
      throw error;
    }
  }

  // Indexer un chantier spécifique
  public async indexChantier(chantier: ChantierEntity): Promise<void> {
    const content = `
CHANTIER: ${chantier.nomChantier}
ID: ${chantier.chantierId}
Adresse: ${chantier.adresseChantier}
Client: ${chantier.client?.nom || 'Non spécifié'}
Statut: ${chantier.statut}
Date de début: ${chantier.dateDebut ? new Date(chantier.dateDebut).toLocaleDateString('fr-FR') : 'Non spécifiée'}
Date de fin: ${chantier.dateFin ? new Date(chantier.dateFin).toLocaleDateString('fr-FR') : 'Non spécifiée'}
Description: ${chantier.description || 'Aucune description'}
Budget: ${chantier.budget ? `${chantier.budget.toLocaleString('fr-FR')} €` : 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `chantier-${chantier.id}`,
      content,
      metadata: {
        type: 'chantier',
        entityId: chantier.id,
        entityName: chantier.nomChantier,
        createdAt: new Date(chantier.createdAt),
        updatedAt: new Date(chantier.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }



  // Indexer une note libre
  public async indexNote(note: NoteEntity, chantier: ChantierEntity): Promise<void> {
    const content = `
NOTE LIBRE - Chantier: ${chantier.nomChantier} (${chantier.chantierId})
Date: ${new Date(note.createdAt).toLocaleDateString('fr-FR')}
Auteur: ${note.createdBy}
Contenu:
${note.contenu}
    `.trim();

    const chunk: DocumentChunk = {
      id: `note-${note.id}`,
      content,
      metadata: {
        type: 'note',
        entityId: note.id,
        entityName: `Note - ${chantier.nomChantier}`,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer un document attaché
  public async indexDocumentAttache(document: DocumentEntity, chantier: ChantierEntity): Promise<void> {
    const content = `
DOCUMENT - Chantier: ${chantier.nomChantier} (${chantier.chantierId})
Nom: ${document.nom}
Type: ${document.type}
Description: ${document.description || 'Aucune description'}
URL: ${document.url}
Date d'ajout: ${new Date(document.createdAt).toLocaleDateString('fr-FR')}
    `.trim();

    const chunk: DocumentChunk = {
      id: `document-${document.id}`,
      content,
      metadata: {
        type: 'document',
        entityId: document.id,
        entityName: `Document ${document.nom} - ${chantier.nomChantier}`,
        createdAt: new Date(document.createdAt),
        updatedAt: new Date(document.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer une remarque de réception
  public async indexRemarqueReception(remarque: RemarqueEntity, chantier: ChantierEntity): Promise<void> {
    const content = `
REMARQUE DE RÉCEPTION - Chantier: ${chantier.nomChantier} (${chantier.chantierId})
Localisation: ${remarque.localisation || 'Non spécifiée'}
Description: ${remarque.description}
Statut: ${remarque.estResolue ? 'Résolue' : 'En cours'}
Date: ${new Date(remarque.createdAt).toLocaleDateString('fr-FR')}
    `.trim();

    const chunk: DocumentChunk = {
      id: `remarque-${remarque.id}`,
      content,
      metadata: {
        type: 'remarque',
        entityId: remarque.id,
        entityName: `Remarque - ${chantier.nomChantier}`,
        createdAt: new Date(remarque.createdAt),
        updatedAt: new Date(remarque.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer un matériau
  public async indexMateriau(materiau: MateriauEntity): Promise<void> {
    const location = materiau.emplacement 
      ? `Rack: ${materiau.emplacement.rack.nom} (${materiau.emplacement.rack.localisation}), Position: ${materiau.emplacement.ligne}-${materiau.emplacement.colonne}`
      : 'Non localisé';

    const content = `
MATÉRIAU: ${materiau.nom}
Description: ${materiau.description || 'Aucune description'}
Quantité en stock: ${materiau.quantite} unité(s)
Code QR: ${materiau.codeQR || 'Non assigné'}
Localisation: ${location}
Statut: ${materiau.quantite > 0 ? 'Disponible' : 'Épuisé'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `materiau-${materiau.id}`,
      content,
      metadata: {
        type: 'materiau',
        entityId: materiau.id,
        entityName: materiau.nom,
        createdAt: new Date(materiau.createdAt),
        updatedAt: new Date(materiau.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer un rack
  public async indexRack(rack: RackEntity): Promise<void> {
    const content = `
RACK: ${rack.nom}
Description: ${rack.description || 'Aucune description'}
Localisation: ${rack.localisation}
    `.trim();

    const chunk: DocumentChunk = {
      id: `rack-${rack.id}`,
      content,
      metadata: {
        type: 'rack',
        entityId: rack.id,
        entityName: rack.nom,
        createdAt: new Date(rack.createdAt),
        updatedAt: new Date(rack.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer une machine
  public async indexMachine(machine: MachineEntity): Promise<void> {
    const content = `
MACHINE/ÉQUIPEMENT: ${machine.nom}
Modèle: ${machine.modele}
Numéro de série: ${machine.numeroSerie || 'Non spécifié'}
Localisation: ${machine.localisation}
Statut: ${machine.statut}
Date d'achat: ${machine.dateAchat ? new Date(machine.dateAchat).toLocaleDateString('fr-FR') : 'Non spécifiée'}
Code QR: ${machine.qrCode}
Commentaire: ${machine.commentaire || 'Aucun commentaire'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `machine-${machine.id}`,
      content,
      metadata: {
        type: 'machine',
        entityId: machine.id,
        entityName: machine.nom,
        createdAt: new Date(machine.createdAt),
        updatedAt: new Date(machine.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer un client
  public async indexClient(client: ClientEntity): Promise<void> {
    const content = `
CLIENT: ${client.nom}
Email: ${client.email || 'Non spécifié'}
Adresse: ${client.adresse || 'Non spécifiée'}
Téléphone: ${client.telephone || 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `client-${client.id}`,
      content,
      metadata: {
        type: 'client',
        entityId: client.id,
        entityName: client.nom,
        createdAt: new Date(client.createdAt),
        updatedAt: new Date(client.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer un sous-traitant
  public async indexSousTraitant(sousTraitant: SousTraitantEntity): Promise<void> {
    const content = `
SOUS-TRAITANT: ${sousTraitant.nom}
Email: ${sousTraitant.email}
Contact: ${sousTraitant.contact || 'Non spécifié'}
Adresse: ${sousTraitant.adresse || 'Non spécifiée'}
Téléphone: ${sousTraitant.telephone || 'Non spécifié'}
TVA: ${sousTraitant.tva || 'Non spécifiée'}
Statut: ${sousTraitant.actif ? 'Actif' : 'Inactif'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `soustraitant-${sousTraitant.id}`,
      content,
      metadata: {
        type: 'soustraitant',
        entityId: sousTraitant.id,
        entityName: sousTraitant.nom,
        createdAt: new Date(sousTraitant.createdAt),
        updatedAt: new Date(sousTraitant.updatedAt)
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer toutes les commandes
  async indexAllCommandes(): Promise<void> {
    try {
      console.log('📋 Indexation de toutes les commandes...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const commandes = await prisma.commande.findMany({
        include: {
          Chantier: {
            include: {
              client: true
            }
          }
        }
      });
      
      console.log(`📋 ${commandes.length} commandes trouvées`);
      
      for (const commande of commandes) {
        await this.indexCommande({
          id: commande.id,
          commandeId: commande.commandeId,
          nomCommande: commande.nomCommande,
          statut: commande.statut,
          dateCommande: commande.dateCommande,
          montantHT: commande.montantHT,
          montantTTC: commande.montantTTC,
          chantierId: commande.chantierId,
          chantierNom: commande.Chantier?.nomChantier,
          clientNom: commande.Chantier?.clientNom || commande.Chantier?.client?.nom
        });
      }
      
      console.log(`✅ ${commandes.length} commandes indexées avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des commandes:', error);
      throw error;
    }
  }

  // Indexer une commande
  public async indexCommande(commande: CommandeEntity): Promise<void> {
    const content = `
COMMANDE: ${commande.nomCommande}
ID: ${commande.commandeId}
Statut: ${commande.statut}
Date: ${commande.dateCommande.toLocaleDateString('fr-FR')}
Montant HT: ${commande.montantHT.toFixed(2)}€
Montant TTC: ${commande.montantTTC.toFixed(2)}€
Chantier: ${commande.chantierNom || 'Non spécifié'}
Client: ${commande.clientNom || 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `commande-${commande.id}`,
      content,
      metadata: {
        type: 'commande',
        entityId: commande.id,
        entityName: commande.nomCommande,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer tous les états d'avancement
  async indexAllEtatsAvancement(): Promise<void> {
    try {
      console.log('📊 Indexation de tous les états d\'avancement...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const etats = await prisma.etatAvancement.findMany({
        include: {
          Chantier: {
            include: {
              client: true
            }
          }
        }
      });
      
      console.log(`📊 ${etats.length} états d'avancement trouvés`);
      
      for (const etat of etats) {
        await this.indexEtatAvancement({
          id: etat.id,
          etatId: etat.etatId,
          pourcentage: etat.pourcentage,
          description: etat.commentaires,
          dateCreation: etat.date,
          chantierId: etat.chantierId,
          chantierNom: etat.Chantier?.nomChantier,
          clientNom: etat.Chantier?.clientNom || etat.Chantier?.client?.nom
        });
      }
      
      console.log(`✅ ${etats.length} états d'avancement indexés avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des états d\'avancement:', error);
      throw error;
    }
  }

  // Indexer un état d'avancement
  public async indexEtatAvancement(etat: EtatAvancementEntity): Promise<void> {
    const content = `
ÉTAT D'AVANCEMENT: ${etat.pourcentage}%
ID: ${etat.etatId}
Date: ${etat.dateCreation.toLocaleDateString('fr-FR')}
Description: ${etat.description || 'Aucune description'}
Chantier: ${etat.chantierNom || 'Non spécifié'}
Client: ${etat.clientNom || 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `etat-avancement-${etat.id}`,
      content,
      metadata: {
        type: 'etat_avancement',
        entityId: etat.id,
        entityName: `État ${etat.pourcentage}%`,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer toutes les dépenses
  async indexAllDepenses(): Promise<void> {
    try {
      console.log('💰 Indexation de toutes les dépenses...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const depenses = await prisma.depense.findMany();
      
      console.log(`💰 ${depenses.length} dépenses trouvées`);
      
      for (const depense of depenses) {
        await this.indexDepense({
          id: depense.id,
          montant: depense.montant,
          description: depense.description,
          categorie: depense.categorie,
          dateDepense: depense.date,
          chantierId: depense.chantierId,
          chantierNom: 'Non spécifié',
          clientNom: 'Non spécifié'
        });
      }
      
      console.log(`✅ ${depenses.length} dépenses indexées avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des dépenses:', error);
      throw error;
    }
  }

  // Indexer une dépense
  public async indexDepense(depense: DepenseEntity): Promise<void> {
    const content = `
DÉPENSE: ${depense.description}
Montant: ${depense.montant.toFixed(2)}€
Catégorie: ${depense.categorie}
Date: ${depense.dateDepense.toLocaleDateString('fr-FR')}
Chantier: ${depense.chantierNom || 'Non spécifié'}
Client: ${depense.clientNom || 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `depense-${depense.id}`,
      content,
      metadata: {
        type: 'depense',
        entityId: depense.id,
        entityName: depense.description,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await this.indexDocument(chunk);
  }

  // Indexer toutes les tâches
  async indexAllTasks(): Promise<void> {
    try {
      console.log('✅ Indexation de toutes les tâches...');
      
      const { prisma } = await import('@/lib/prisma');
      
      const tasks = await prisma.task.findMany({
        include: {
          chantier: true
        }
      });
      
      console.log(`✅ ${tasks.length} tâches trouvées`);
      
      for (const task of tasks) {
        await this.indexTask({
          id: task.id,
          title: task.title,
          description: task.description,
          start: task.start,
          end: task.end,
          status: task.status,
          priority: task.priority,
          chantierId: task.chantierId,
          chantierNom: task.chantier?.nomChantier,
          assigneA: task.assigneA
        });
      }
      
      console.log(`✅ ${tasks.length} tâches indexées avec succès`);
    } catch (error) {
      console.error('❌ Erreur lors de l\'indexation des tâches:', error);
      throw error;
    }
  }

  // Indexer une tâche
  public async indexTask(task: TaskEntity): Promise<void> {
    const content = `
TÂCHE: ${task.title}
Description: ${task.description || 'Aucune description'}
Statut: ${task.status}
Priorité: ${task.priority || 'Non spécifiée'}
Début: ${task.start.toLocaleDateString('fr-FR')}
Fin: ${task.end.toLocaleDateString('fr-FR')}
Assignée à: ${task.assigneA || 'Non assignée'}
Chantier: ${task.chantierNom || 'Non spécifié'}
    `.trim();

    const chunk: DocumentChunk = {
      id: `task-${task.id}`,
      content,
      metadata: {
        type: 'task',
        entityId: task.id,
        entityName: task.title,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    };

    await this.indexDocument(chunk);
  }
}

export const ragService = new RAGService();

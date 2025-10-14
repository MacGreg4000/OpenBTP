// Système de stockage vectoriel pour RAG
import { prisma } from '@/lib/prisma/client';
import { DocumentChunk } from '@/types/rag';

export class VectorStore {
  // Calculer la similarité cosinus entre deux vecteurs
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Les vecteurs doivent avoir la même dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // Ajouter un document avec son embedding
  async addDocument(chunk: DocumentChunk): Promise<void> {
    try {
      console.log('📝 Ajout de document au vector store:', {
        id: chunk.id,
        type: chunk.metadata.type,
        entityName: chunk.metadata.entityName,
        contentLength: chunk.content.length,
        hasEmbedding: !!chunk.embedding
      });

      await prisma.documentChunk.upsert({
        where: { id: chunk.id },
        update: {
          content: chunk.content,
          metadata: JSON.stringify(chunk.metadata),
          embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
          updatedAt: new Date(),
        },
        create: {
          id: chunk.id,
          content: chunk.content,
          metadata: JSON.stringify(chunk.metadata),
          embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
        },
      });

      console.log('✅ Document ajouté au vector store');
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du document:', error);
      throw error;
    }
  }

  // Rechercher les documents similaires
  async searchSimilar(queryEmbedding: number[], limit: number = 5, filter?: {
    type?: string;
    entityId?: string;
  }): Promise<DocumentChunk[]> {
    try {
      console.log('🔍 Recherche de documents similaires:', {
        queryDimension: queryEmbedding.length,
        limit,
        filter
      });

      // Récupérer tous les documents avec embeddings (simplifié)
      const documents = await prisma.documentChunk.findMany({
        where: {
          embedding: { not: null }
        },
        orderBy: { updatedAt: 'desc' },
        take: limit * 3, // Prendre plus pour filtrer après
      });

      console.log(`📊 ${documents.length} documents trouvés avec embeddings`);
      
      if (documents.length === 0) {
        console.log('⚠️ Aucun document trouvé avec embeddings - vérifiez la base de données');
        return [];
      }

      // Calculer les similarités
      const scoredDocuments: Array<{ chunk: DocumentChunk; score: number }> = [];

      for (const doc of documents) {
        if (doc.embedding) {
          try {
            const docEmbedding = JSON.parse(doc.embedding) as number[];
            const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding);
            
            console.log(`🔍 Document ${doc.id}: similarité = ${similarity.toFixed(4)}`);
            
            const chunk: DocumentChunk = {
              id: doc.id,
              content: doc.content,
              metadata: JSON.parse(doc.metadata),
              embedding: docEmbedding,
            };

            scoredDocuments.push({ chunk, score: similarity });
          } catch (error) {
            console.warn('⚠️ Erreur lors du parsing de l\'embedding:', doc.id, error.message);
          }
        }
      }

      // Trier par score et retourner les meilleurs
      scoredDocuments.sort((a, b) => b.score - a.score);
      const topResults = scoredDocuments.slice(0, limit);

      console.log('🎯 Top résultats trouvés:', topResults.map(r => ({
        id: r.chunk.id,
        score: r.score.toFixed(3),
        type: r.chunk.metadata.type,
        entityName: r.chunk.metadata.entityName
      })));

      return topResults.map(r => r.chunk);
    } catch (error) {
      console.error('❌ Erreur lors de la recherche:', error);
      throw error;
    }
  }

  // Supprimer un document
  async removeDocument(id: string): Promise<void> {
    try {
      await prisma.documentChunk.delete({
        where: { id }
      });
      console.log('🗑️ Document supprimé du vector store:', id);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      throw error;
    }
  }

  // Vider le store (pour réindexation)
  async clearStore(): Promise<void> {
    try {
      await prisma.documentChunk.deleteMany({});
      console.log('🧹 Vector store vidé');
    } catch (error) {
      console.error('❌ Erreur lors du vidage:', error);
      throw error;
    }
  }

  // Récupérer tous les documents
  async getAllDocuments(): Promise<DocumentChunk[]> {
    try {
      const documents = await prisma.documentChunk.findMany({
        orderBy: { createdAt: 'desc' }
      });

      return documents.map(doc => ({
        id: doc.id,
        content: doc.content,
        metadata: JSON.parse(doc.metadata),
        embedding: doc.embedding ? JSON.parse(doc.embedding) : undefined
      }));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des documents:', error);
      throw error;
    }
  }

  // Statistiques du store
  async getStats(): Promise<{
    totalDocuments: number;
    documentsWithEmbeddings: number;
    byType: Record<string, number>;
  }> {
    try {
      const total = await prisma.documentChunk.count();
      const withEmbeddings = await prisma.documentChunk.count({
        where: { embedding: { not: null } }
      });

      // Compter par type
      const documents = await prisma.documentChunk.findMany({
        select: { metadata: true }
      });

      const byType: Record<string, number> = {};
      for (const doc of documents) {
        try {
          const metadata = JSON.parse(doc.metadata);
          const type = metadata.type || 'unknown';
          byType[type] = (byType[type] || 0) + 1;
        } catch {
          byType['invalid'] = (byType['invalid'] || 0) + 1;
        }
      }

      return { totalDocuments: total, documentsWithEmbeddings: withEmbeddings, byType };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des stats:', error);
      throw error;
    }
  }
}

export const vectorStore = new VectorStore();




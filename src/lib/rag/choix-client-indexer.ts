// Service d'indexation RAG pour les choix clients
import { prisma } from '@/lib/prisma/client'
import { VectorStore } from './vector-store'
import { DocumentChunk } from '@/types/rag'

const vectorStore = new VectorStore()

// Fonction pour générer un embedding simple (simulation)
// Dans un vrai système, utilisez OpenAI, Cohere, etc.
function generateEmbedding(text: string): number[] {
  // Pour l'instant, embedding factice basé sur les caractères
  // À remplacer par un vrai service d'embedding
  const normalized = text.toLowerCase()
  const embedding = new Array(384).fill(0)
  
  for (let i = 0; i < normalized.length && i < embedding.length; i++) {
    embedding[i % embedding.length] += normalized.charCodeAt(i) / 1000
  }
  
  return embedding
}

// Formater un choix client en texte pour l'indexation
export function formatChoixClientForRAG(choixClient: any): string {
  const parts: string[] = []
  
  // En-tête
  parts.push(`Choix client pour ${choixClient.nomClient}`)
  parts.push(`Date de visite: ${new Date(choixClient.dateVisite).toLocaleDateString('fr-FR')}`)
  parts.push(`Statut: ${choixClient.statut}`)
  
  if (choixClient.chantier) {
    parts.push(`Chantier associé: ${choixClient.chantier.nomChantier}`)
  }
  
  if (choixClient.telephoneClient) {
    parts.push(`Téléphone: ${choixClient.telephoneClient}`)
  }
  
  if (choixClient.emailClient) {
    parts.push(`Email: ${choixClient.emailClient}`)
  }
  
  if (choixClient.notesGenerales) {
    parts.push(`Notes générales: ${choixClient.notesGenerales}`)
  }
  
  // Détails des choix
  if (choixClient.detailsChoix && choixClient.detailsChoix.length > 0) {
    parts.push(`\nChoix de revêtements (${choixClient.detailsChoix.length} choix):`)
    
    choixClient.detailsChoix.forEach((detail: any) => {
      parts.push(`\nChoix #${detail.numeroChoix} - ${detail.type}:`)
      
      if (detail.localisations && detail.localisations.length > 0) {
        parts.push(`Localisation: ${detail.localisations.join(', ')}`)
      }
      
      parts.push(`Marque: ${detail.marque}`)
      
      if (detail.collection) {
        parts.push(`Collection: ${detail.collection}`)
      }
      
      parts.push(`Modèle: ${detail.modele}`)
      
      if (detail.reference) {
        parts.push(`Référence: ${detail.reference}`)
      }
      
      if (detail.couleur) {
        parts.push(`Couleur: ${detail.couleur}`)
      }
      
      if (detail.formatLongueur && detail.formatLargeur) {
        parts.push(`Format: ${detail.formatLongueur}x${detail.formatLargeur} cm`)
      }
      
      if (detail.epaisseur) {
        parts.push(`Épaisseur: ${detail.epaisseur} mm`)
      }
      
      if (detail.finition) {
        parts.push(`Finition: ${detail.finition}`)
      }
      
      if (detail.surfaceEstimee) {
        parts.push(`Surface estimée: ${detail.surfaceEstimee} m²`)
      }
      
      if (detail.couleurJoint) {
        parts.push(`Joints: ${detail.couleurJoint}`)
        if (detail.largeurJoint) {
          parts.push(`Largeur joint: ${detail.largeurJoint} mm`)
        }
        if (detail.typeJoint) {
          parts.push(`Type de joint: ${detail.typeJoint}`)
        }
      }
      
      if (detail.typePose) {
        parts.push(`Type de pose: ${detail.typePose}`)
      }
      
      if (detail.sensPose) {
        parts.push(`Sens de pose: ${detail.sensPose}`)
      }
      
      if (detail.particularitesPose) {
        parts.push(`Particularités de pose: ${detail.particularitesPose}`)
      }
      
      if (detail.notes) {
        parts.push(`Notes: ${detail.notes}`)
      }
    })
  }
  
  return parts.join('\n')
}

// Indexer un choix client
export async function indexChoixClient(choixClientId: string): Promise<void> {
  try {
    console.log(`🔍 Indexation du choix client ${choixClientId}`)
    
    // Récupérer le choix client complet
    const choixClient = await prisma.choixClient.findUnique({
      where: { id: choixClientId },
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        detailsChoix: {
          orderBy: {
            numeroChoix: 'asc'
          }
        }
      }
    })
    
    if (!choixClient) {
      console.log(`❌ Choix client ${choixClientId} non trouvé`)
      return
    }
    
    // Formater le texte
    const content = formatChoixClientForRAG(choixClient)
    
    // Générer l'embedding
    const embedding = generateEmbedding(content)
    
    // Créer le chunk de document
    const chunk: DocumentChunk = {
      id: `choix-client-${choixClientId}`,
      content,
      metadata: {
        type: 'choix-client',
        entityId: choixClientId,
        entityName: choixClient.nomClient,
        chantierId: choixClient.chantierId || undefined,
        statut: choixClient.statut,
        dateVisite: choixClient.dateVisite.toISOString(),
        nombreChoix: choixClient.detailsChoix.length,
        updatedAt: choixClient.updatedAt.toISOString()
      },
      embedding
    }
    
    // Ajouter au vector store
    await vectorStore.addDocument(chunk)
    
    console.log(`✅ Choix client ${choixClientId} indexé avec succès`)
  } catch (error) {
    console.error(`❌ Erreur lors de l'indexation du choix client ${choixClientId}:`, error)
    throw error
  }
}

// Supprimer l'indexation d'un choix client
export async function removeChoixClientFromIndex(choixClientId: string): Promise<void> {
  try {
    console.log(`🗑️ Suppression de l'indexation du choix client ${choixClientId}`)
    
    await prisma.documentChunk.delete({
      where: { id: `choix-client-${choixClientId}` }
    })
    
    console.log(`✅ Indexation du choix client ${choixClientId} supprimée`)
  } catch (error) {
    // Si le document n'existe pas, ce n'est pas une erreur
    if ((error as any)?.code === 'P2025') {
      console.log(`ℹ️ Choix client ${choixClientId} n'était pas indexé`)
      return
    }
    console.error(`❌ Erreur lors de la suppression de l'indexation:`, error)
    throw error
  }
}

// Ré-indexer tous les choix clients
export async function reindexAllChoixClients(): Promise<void> {
  try {
    console.log('🔄 Ré-indexation de tous les choix clients...')
    
    const choixClients = await prisma.choixClient.findMany({
      select: { id: true }
    })
    
    console.log(`📊 ${choixClients.length} choix clients à indexer`)
    
    for (const choix of choixClients) {
      await indexChoixClient(choix.id)
    }
    
    console.log(`✅ Ré-indexation terminée: ${choixClients.length} choix clients indexés`)
  } catch (error) {
    console.error('❌ Erreur lors de la ré-indexation:', error)
    throw error
  }
}


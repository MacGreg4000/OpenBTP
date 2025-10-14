'use server'

import { prisma } from '@/lib/prisma'

type DocumentRow = {
  id: string;
  chantierId: string;
  url?: string | null;
  type?: string | null;
  updatedAt?: string | Date;
  [key: string]: unknown;
};

/**
 * Récupère tous les documents d'un chantier
 */
export async function getDocuments(chantierId: string): Promise<DocumentRow[]> {
  try {
    const documents = await (prisma as unknown as { document: { findMany: (args: { where: { chantierId: string }, orderBy: { updatedAt: 'desc' } }) => Promise<DocumentRow[]> } }).document.findMany({
      where: { chantierId },
      orderBy: { updatedAt: 'desc' }
    })
    
    return documents
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error)
    return []
  }
}

/**
 * Récupère un document spécifique
 */
export async function getDocument(documentId: string): Promise<DocumentRow | null> {
  try {
    const document = await (prisma as unknown as { document: { findUnique: (args: { where: { id: string } }) => Promise<DocumentRow | null> } }).document.findUnique({
      where: { id: documentId }
    })

    return document
  } catch (error) {
    console.error('Erreur lors de la récupération du document:', error)
    return null
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string, documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le document
    const document = await prisma.documentOuvrier.findUnique({
      where: { 
        id: params.documentId,
        ouvrierId: params.ouvrierId
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le fichier physique
    const filePath = join(process.cwd(), 'public', document.url)
    try {
      await unlink(filePath)
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier:', error)
      // Continuer même si le fichier n'existe pas
    }

    // Supprimer l'entrée dans la base de données
    await prisma.documentOuvrier.delete({
      where: { id: params.documentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
} 
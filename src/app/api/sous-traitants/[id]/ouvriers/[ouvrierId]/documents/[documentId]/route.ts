import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { archiverDocumentOuvrier } from '@/lib/documents/stockage'

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

    // Jamais de suppression : le document est ARCHIVÉ (preuve en cas de
    // contrôle) — retiré des documents en vigueur, fichier conservé, et
    // déplacé dans _Archives sur le NAS.
    await archiverDocumentOuvrier(document.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
} 
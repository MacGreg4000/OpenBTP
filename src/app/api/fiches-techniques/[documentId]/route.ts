import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'

export async function DELETE(request: Request, props: { params: Promise<{ documentId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier si l'utilisateur est administrateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    // Convertir l'ID en nombre
    const documentId = parseInt(params.documentId, 10)
    if (isNaN(documentId)) {
      return NextResponse.json({ error: 'ID de document invalide' }, { status: 400 })
    }

    // Récupérer le document
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    }

    // Supprimer le fichier physique
    const filePath = path.join(process.cwd(), 'public', document.url)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
    }

    // Supprimer l'entrée dans la base de données
    await prisma.document.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ message: 'Document supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
} 
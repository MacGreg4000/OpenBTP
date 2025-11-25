import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'

// Fonction pour obtenir le chemin du dossier personnalisé d'un chantier
function getCustomFichesPath(chantierId: string): string {
  return path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
}

// Fonction pour vérifier si un chantier a un dossier personnalisé
function hasCustomFiches(chantierId: string): boolean {
  const customPath = getCustomFichesPath(chantierId)
  return fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est MANAGER ou ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (!user || (user.role !== 'MANAGER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Seuls les managers et administrateurs peuvent supprimer un dossier de fiches techniques' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId est requis' }, { status: 400 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Vérifier si le chantier a un dossier personnalisé
    if (!hasCustomFiches(chantierId)) {
      return NextResponse.json({ error: 'Ce chantier n\'a pas de dossier personnalisé de fiches techniques à supprimer.' }, { status: 404 })
    }

    // Supprimer le dossier personnalisé
    const customPath = getCustomFichesPath(chantierId)
    await rm(customPath, { recursive: true, force: true })

    return NextResponse.json({ 
      success: true, 
      message: 'Le dossier personnalisé de fiches techniques a été supprimé avec succès. Le chantier utilise maintenant le dossier standard.'
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier personnalisé:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la suppression du dossier personnalisé. Veuillez réessayer ou contacter le support si le problème persiste.' },
      { status: 500 }
    )
  }
}


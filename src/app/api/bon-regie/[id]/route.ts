import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const bonRegieId = parseInt(id)
    if (isNaN(bonRegieId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    // Récupérer le bon de régie avec l'ID spécifié
    const bonRegie = await prisma.bonRegie.findUnique({
      where: { id: bonRegieId }
    })

    // Vérifier si le bon de régie existe
    if (!bonRegie) {
      return NextResponse.json(
        { error: 'Bon de régie non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(bonRegie)
  } catch (error) {
    console.error('Erreur lors de la récupération du bon de régie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du bon de régie' },
      { status: 500 }
    )
  }
}

// DELETE /api/bon-regie/[id] - Supprimer un bon de régie
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(`🗑️ Tentative de suppression du bon de régie ${id}`)
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('❌ Session non trouvée')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    console.log(`👤 Utilisateur: ${session.user.email}, Rôle: ${session.user.role}`)

    // Vérifier que l'utilisateur est un administrateur
    if (session.user.role !== 'ADMIN') {
      console.log(`❌ Tentative de suppression par un utilisateur non-admin: ${session.user.email}`)
      return NextResponse.json(
        { error: 'Seuls les administrateurs peuvent supprimer des bons de régie' },
        { status: 403 }
      )
    }

    const bonRegieId = parseInt(id)
    if (isNaN(bonRegieId)) {
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    // Vérifier si le bon de régie existe
    const bonRegie = await prisma.bonRegie.findUnique({
      where: { id: bonRegieId }
    })

    if (!bonRegie) {
      console.log(`❌ Bon de régie ${bonRegieId} non trouvé`)
      return NextResponse.json(
        { error: 'Bon de régie non trouvé' },
        { status: 404 }
      )
    }

    console.log(`📋 Bon de régie trouvé: ${bonRegie.description}`)

    // Supprimer le bon de régie
    await prisma.bonRegie.delete({
      where: { id: bonRegieId }
    })
    
    console.log(`✅ Bon de régie ${bonRegieId} supprimé avec succès par ${session.user.email}`)
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du bon de régie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du bon de régie' },
      { status: 500 }
    )
  }
} 
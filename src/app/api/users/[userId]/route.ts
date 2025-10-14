import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcrypt'

// GET /api/users/[userId] - Récupère un utilisateur spécifique
export async function GET(request: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    )
  }
}

// PUT /api/users/[userId] - Met à jour un utilisateur
export async function PUT(request: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.userId }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    const body = await request.json()
    
    // Préparer les données de mise à jour
    const updateData: Record<string, unknown> = {
      name: body.name,
      email: body.email,
      role: body.role
    }

    // Si un nouveau mot de passe est fourni, le hasher
    if (body.password) {
      ;(updateData as { password?: string }).password = await bcrypt.hash(body.password, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'utilisateur" },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[userId] - Supprime un utilisateur
export async function DELETE(request: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: params.userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Empêcher la suppression du dernier administrateur
    if (user.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Impossible de supprimer le dernier administrateur' },
          { status: 400 }
        )
      }
    }

    await prisma.user.delete({
      where: { id: params.userId }
    })

    return NextResponse.json(
      { message: 'Utilisateur supprimé avec succès' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    )
  }
} 
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET /api/modules - Liste tous les modules
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where = activeOnly ? { isActive: true } : {}

    const modules = await prisma.featureModule.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { ordre: 'asc' }
      ]
    })

    return NextResponse.json(modules)
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modules' },
      { status: 500 }
    )
  }
}

// PATCH /api/modules - Mettre à jour un module (activation/désactivation)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Seuls les admins peuvent modifier les modules
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { code, isActive } = body

    if (!code || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Code et isActive requis' },
        { status: 400 }
      )
    }

    // Vérifier que le module existe et n'est pas système
    const featureModule = await prisma.featureModule.findUnique({
      where: { code }
    })

    if (!featureModule) {
      return NextResponse.json(
        { error: 'Module introuvable' },
        { status: 404 }
      )
    }

    if (featureModule.isSystem) {
      return NextResponse.json(
        { error: 'Les modules système ne peuvent pas être désactivés' },
        { status: 400 }
      )
    }

    // Mettre à jour le module
    const updatedModule = await prisma.featureModule.update({
      where: { code },
      data: { isActive }
    })

    return NextResponse.json(updatedModule)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du module:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du module' },
      { status: 500 }
    )
  }
}


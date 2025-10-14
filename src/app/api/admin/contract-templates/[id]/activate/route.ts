import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    // Désactiver tous les templates
    await prisma.contractTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })

    // Activer le template sélectionné
    const template = await prisma.contractTemplate.update({
      where: { id },
      data: { isActive: true }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de l\'activation du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'activation du template' },
      { status: 500 }
    )
  }
}

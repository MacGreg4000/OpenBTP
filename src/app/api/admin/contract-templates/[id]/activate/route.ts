import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { TemplateCategory } from '@/lib/templates/template-categories'

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

    const target = await prisma.contractTemplate.findUnique({ where: { id } })

    if (!target) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    const category: TemplateCategory = target.category

    // Désactiver les templates de la même catégorie
    await prisma.contractTemplate.updateMany({
      where: { isActive: true, category },
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

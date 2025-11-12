import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { isTemplateCategory, type TemplateCategory } from '@/lib/templates/template-categories'

export async function GET(
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

    // Récupérer le template
    const template = await prisma.contractTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de la récupération du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Vérifier si le template est actif
    const template = await prisma.contractTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    if (template.isActive) {
      return NextResponse.json(
        { error: 'Impossible de supprimer un template actif' },
        { status: 400 }
      )
    }

    // Supprimer le template
    await prisma.contractTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du template' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const { name, description, htmlContent, isActive, category } = await request.json()

    if (!name || !htmlContent) {
      return NextResponse.json(
        { error: 'Le nom et le contenu HTML sont requis' },
        { status: 400 }
      )
    }

    const template = await prisma.contractTemplate.findUnique({
      where: { id }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template non trouvé' }, { status: 404 })
    }

    const parsedCategory: TemplateCategory =
      category && isTemplateCategory(category) ? category : template.category

    // Si on active ce template, désactiver tous les autres
    if (isActive) {
      await prisma.contractTemplate.updateMany({
        where: { isActive: true, category: parsedCategory },
        data: { isActive: false }
      })
    }

    // Mettre à jour le template
    const updatedTemplate = await prisma.contractTemplate.update({
      where: { id },
      data: {
        name,
        description,
        htmlContent,
        isActive: isActive || false,
        category: parsedCategory
      }
    })

    return NextResponse.json(updatedTemplate)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du template' },
      { status: 500 }
    )
  }
}
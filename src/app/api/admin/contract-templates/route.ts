import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { isTemplateCategory, TEMPLATE_CATEGORIES, type TemplateCategory } from '@/lib/templates/template-categories'

export async function GET(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawCategory = searchParams.get('category')
    const categoryFilter = rawCategory && isTemplateCategory(rawCategory) ? rawCategory : undefined

    // Récupérer tous les templates
    const templates = await prisma.contractTemplate.findMany({
      where: categoryFilter
        ? { category: categoryFilter }
        : undefined,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { name, description, htmlContent, isActive, category } = await request.json()

    if (!name || !htmlContent) {
      return NextResponse.json(
        { error: 'Le nom et le contenu HTML sont requis' },
        { status: 400 }
      )
    }

    const parsedCategory: TemplateCategory =
      category && isTemplateCategory(category) ? category : TEMPLATE_CATEGORIES[0]

    // Si on active ce template, désactiver tous les autres
    if (isActive) {
      await prisma.contractTemplate.updateMany({
        where: { isActive: true, category: parsedCategory },
        data: { isActive: false }
      })
    }

    // Créer le nouveau template
    const template = await prisma.contractTemplate.create({
      data: {
        name,
        description,
        htmlContent,
        isActive: isActive || false,
        category: parsedCategory
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Erreur lors de la création du template:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du template' },
      { status: 500 }
    )
  }
}
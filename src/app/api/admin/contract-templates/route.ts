import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer tous les templates
    const templates = await prisma.contractTemplate.findMany({
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

    const { name, description, htmlContent, isActive } = await request.json()

    if (!name || !htmlContent) {
      return NextResponse.json(
        { error: 'Le nom et le contenu HTML sont requis' },
        { status: 400 }
      )
    }

    // Si on active ce template, désactiver tous les autres
    if (isActive) {
      await prisma.contractTemplate.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      })
    }

    // Créer le nouveau template
    const template = await prisma.contractTemplate.create({
      data: {
        name,
        description,
        htmlContent,
        isActive: isActive || false
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
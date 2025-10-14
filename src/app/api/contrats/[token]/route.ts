import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const contrat = await prisma.contrat.findUnique({
      where: { token: params.token },
      include: {
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
            contact: true
          }
        }
      }
    })
    
    if (!contrat) {
      return NextResponse.json(
        { error: 'Contrat non trouvé ou déjà signé' },
        { status: 404 }
      )
    }
    
    if (contrat.estSigne) {
      return NextResponse.json(
        { error: 'Ce contrat a déjà été signé' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(contrat)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du contrat' },
      { status: 500 }
    )
  }
} 
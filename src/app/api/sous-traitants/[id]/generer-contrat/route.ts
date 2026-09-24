import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContratSoustraitance } from '@/lib/contrat-generator'
import { ContratIncompletError } from '@/lib/contract-generator-puppeteer'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    // Extraire l'ID du sous-traitant depuis les paramètres de route
    const { id } = (await context.params)
    
    // Générer le contrat
    const contratUrl = await generateContratSoustraitance(id, session.user.id)
    
    return NextResponse.json({ url: contratUrl })
  } catch (error: unknown) {
    if (error instanceof ContratIncompletError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erreur lors de la génération du contrat:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du contrat' },
      { status: 500 }
    )
  }
} 
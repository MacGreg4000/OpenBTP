import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const chantierId = params.chantierId

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId requis' }, { status: 400 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer toutes les commandes pour ce chantier
    const commandes = await prisma.commande.findMany({
      where: { chantierId: chantier.id },
      orderBy: { dateCommande: 'desc' },
      include: {
        lignes: true
      }
    })

    return NextResponse.json(commandes)
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des commandes' },
      { status: 500 }
    )
  }
} 
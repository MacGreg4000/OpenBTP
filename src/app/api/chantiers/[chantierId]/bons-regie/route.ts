import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// Récupérer tous les bons de régie associés à un chantier spécifique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string }> }
) {
  try {
    const { chantierId } = await params
    
    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })
    
    if (!chantier) {
      return new NextResponse(
        JSON.stringify({ error: 'Chantier introuvable' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Récupérer tous les bons de régie associés à ce chantier avec $queryRaw
    const bonsRegie = await prisma.$queryRaw`
      SELECT * FROM bonRegie 
      WHERE chantierId = ${chantierId}
      ORDER BY createdAt DESC
    `;
    
    return NextResponse.json(bonsRegie)
  } catch (error) {
    console.error('Erreur lors de la récupération des bons de régie du chantier:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Erreur lors de la récupération des bons de régie' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
} 
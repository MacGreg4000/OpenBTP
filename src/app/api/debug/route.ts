import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    const data = await prisma.chantier.findMany({
      include: {
        marche: true,
        notes: true,
        taches: true,
        documents: true,
        etats: true
      }
    })

    // Convertir les BigInt en string avant la sérialisation
    const serializedData = JSON.parse(JSON.stringify(
      data,
      (key, value) => 
        typeof value === 'bigint' 
          ? value.toString() 
          : value
    ))

    return NextResponse.json(serializedData)
  } catch (error) {
    console.error('Erreur de connexion:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    )
  }
} 
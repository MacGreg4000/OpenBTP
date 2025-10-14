import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    // Test simple de lecture
    const count = await prisma.user.count()
    
    return NextResponse.json({ 
      status: 'ok',
      message: 'Connexion à la base de données réussie',
      userCount: count
    })
  } catch (error) {
    console.error('Erreur de connexion:', error)
    return NextResponse.json({ 
      status: 'error',
      message: 'Erreur de connexion à la base de données',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 
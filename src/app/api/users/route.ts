import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcrypt'

// GET /api/users - Liste tous les utilisateurs
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count()
    ])

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

// POST /api/users - Crée un nouvel utilisateur
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const hashedPassword = await bcrypt.hash(body.password, 10)
    
    // Générer un ID unique pour l'utilisateur
    const userId = `USER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const user = await prisma.user.create({
      data: {
        id: userId,
        name: body.name,
        email: body.email,
        password: hashedPassword,
        role: body.role,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    )
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    const tasks = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT at.*, c."nomChantier", u.name as userName, u.email as userEmail
      FROM admintask at
      LEFT JOIN chantier c ON c."chantierId" = at."chantierId"
      LEFT JOIN user u ON u.id = at."completedBy"
      ${chantierId ? prisma.$queryRaw`WHERE at."chantierId" = ${chantierId}` : prisma.$queryRaw``}
      ORDER BY at."createdAt" DESC
    `

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tâches' },
      { status: 500 }
    )
  }
}

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
    const now = new Date()

    await prisma.$executeRaw`
      INSERT INTO admintask (title, "taskType", "chantierId", "completedBy", completed, "completedAt", "createdAt", "updatedAt")
      VALUES (${body.title}, ${body.taskType}, ${body.chantierId}, ${body.completedBy}, ${body.completed || false}, ${body.completedAt ? new Date(body.completedAt) : null}, ${now}, ${now})
    `

    const created = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT at.*, c."nomChantier", u.name as userName, u.email as userEmail
      FROM admintask at
      LEFT JOIN chantier c ON c."chantierId" = at."chantierId"
      LEFT JOIN user u ON u.id = at."completedBy"
      ORDER BY at.id DESC
      LIMIT 1
    `

    return NextResponse.json(created[0] || null)
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la tâche' },
      { status: 500 }
    )
  }
} 
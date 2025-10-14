import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

type AdminTaskTypeRow = {
  id: string
  taskType: string
  label: string
  category: string | null
  isActive: boolean | number
  ordre: number | null
  createdAt: Date
  updatedAt: Date
}

// GET /api/admin-task-types/[id]
// Récupère un type de tâche administrative par son ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const taskTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    if (!taskTypes || taskTypes.length === 0) {
      return NextResponse.json(
        { error: 'Type de tâche non trouvé' },
        { status: 404 }
      )
    }

    return NextResponse.json(taskTypes[0])
  } catch (error) {
    console.error('Erreur lors de la récupération du type de tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du type de tâche' },
      { status: 500 }
    )
  }
}

// PUT /api/admin-task-types/[id]
// Met à jour un type de tâche administrative
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { label, category, isActive } = await request.json()

    if (!label) {
      return NextResponse.json(
        { error: 'Le libellé est requis' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe
    const taskTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    if (!taskTypes || taskTypes.length === 0) {
      return NextResponse.json(
        { error: 'Type de tâche non trouvé' },
        { status: 404 }
      )
    }

    // Mettre à jour le type
    const now = new Date()
    await prisma.$executeRaw`
      UPDATE admin_task_types
      SET 
        label = ${label},
        category = ${category || 'administrative'},
        isActive = ${isActive !== undefined ? isActive : true},
        updatedAt = ${now}
      WHERE id = ${id}
    `

    // Récupérer le type mis à jour
    const updatedTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    return NextResponse.json(updatedTypes[0])
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du type de tâche' },
      { status: 500 }
    )
  }
}

// PATCH /api/admin-task-types/[id]
// Met à jour partiellement un type de tâche administrative
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    // Vérifier si des données sont fournies
    if (!data.label && data.category === undefined && data.isActive === undefined && data.ordre === undefined) {
      return NextResponse.json(
        { error: 'Aucune donnée de mise à jour fournie' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe
    const taskTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    if (!taskTypes || taskTypes.length === 0) {
      return NextResponse.json(
        { error: 'Type de tâche non trouvé' },
        { status: 404 }
      )
    }

    const existingType = taskTypes[0]
    
    // Construire la requête de mise à jour
    const now = new Date()
    const label = data.label !== undefined ? data.label : existingType.label
    const category = data.category !== undefined ? data.category : existingType.category
    const isActive = data.isActive !== undefined ? data.isActive : existingType.isActive
    const ordre = data.ordre !== undefined ? data.ordre : existingType.ordre

    await prisma.$executeRaw`
      UPDATE admin_task_types
      SET 
        label = ${label},
        category = ${category},
        isActive = ${isActive},
        ordre = ${ordre},
        updatedAt = ${now}
      WHERE id = ${id}
    `

    // Récupérer le type mis à jour
    const updatedTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    return NextResponse.json(updatedTypes[0])
  } catch (error) {
    console.error('Erreur lors de la mise à jour du type de tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du type de tâche' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin-task-types/[id]
// Supprime un type de tâche administrative
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si des tâches utilisent ce type
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int as count
      FROM admintask
      WHERE "taskType" = ${id}
    `
    const tasksCount = rows?.[0]?.count ?? 0

    if (tasksCount > 0) {
      return NextResponse.json(
        { error: 'Ce type de tâche est utilisé par des tâches existantes et ne peut pas être supprimé' },
        { status: 400 }
      )
    }

    // Vérifier si le type existe
    const taskTypes = await prisma.$queryRaw<AdminTaskTypeRow[]>`
      SELECT * FROM admin_task_types WHERE id = ${id} LIMIT 1
    `

    if (!taskTypes || taskTypes.length === 0) {
      return NextResponse.json(
        { error: 'Type de tâche non trouvé' },
        { status: 404 }
      )
    }

    // Supprimer le type
    await prisma.$executeRaw`
      DELETE FROM admin_task_types WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression du type de tâche:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du type de tâche' },
      { status: 500 }
    )
  }
} 
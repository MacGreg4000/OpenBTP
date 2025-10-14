import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// GET: liste paginée/filtrée des tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')
    const chantierId = searchParams.get('chantierId')
    const savTicketId = searchParams.get('savTicketId')
    const resourceType = searchParams.get('resourceType') // OUVRIER_INTERNE | SOUSTRAITANT
    const resourceId = searchParams.get('resourceId')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '50')))

    const where: Record<string, unknown> = {}
    if (from || to) {
      where.AND = where.AND || []
      if (from) (where.AND as unknown[]).push({ end: { gte: new Date(from) } })
      if (to) (where.AND as unknown[]).push({ start: { lte: new Date(to) } })
    }
    if (status) where.status = status
    if (chantierId) where.chantierId = chantierId
    if (savTicketId) where.savTicketId = savTicketId
    if (resourceType && resourceId) {
      if (resourceType === 'OUVRIER_INTERNE') {
        where.ouvriersInternes = { some: { ouvrierInterneId: resourceId } }
      } else if (resourceType === 'SOUSTRAITANT') {
        where.sousTraitants = { some: { soustraitantId: resourceId } }
      }
    }

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        orderBy: { start: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, title: true, start: true, end: true, status: true,
          ouvriersInternes: { select: { ouvrierInterne: { select: { id: true } } } },
          sousTraitants: { select: { soustraitant: { select: { id: true } } } },
        }
      })
    ])

    return NextResponse.json({
      data: tasks,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: création
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await request.json()
    const { title, description, start, end, status, chantierId, savTicketId, ouvrierInterneIds, soustraitantIds } = body

    if (!title || !start || !end) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const created = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        start: new Date(start),
        end: new Date(end),
        status: status || 'PREVU',
        chantierId: chantierId || null,
        savTicketId: savTicketId || null,
        ouvriersInternes: ouvrierInterneIds?.length ? {
          createMany: { data: ouvrierInterneIds.map((id: string) => ({ ouvrierInterneId: id })) }
        } : undefined,
        sousTraitants: soustraitantIds?.length ? {
          createMany: { data: soustraitantIds.map((id: string) => ({ soustraitantId: id })) }
        } : undefined,
      },
      include: {
        chantier: true,
        savTicket: true,
        ouvriersInternes: { include: { ouvrierInterne: true } },
        sousTraitants: { include: { soustraitant: true } },
      }
    })

    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

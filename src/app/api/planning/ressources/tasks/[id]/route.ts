import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// PATCH: mise à jour (drag & drop, assignations, statut)
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    if (body.title !== undefined) data.title = String(body.title).trim()
    if (body.description !== undefined) data.description = String(body.description).trim()
    if (body.start) data.start = new Date(body.start)
    if (body.end) data.end = new Date(body.end)
    if (body.status) data.status = body.status
    if (body.chantierId !== undefined) data.chantierId = body.chantierId || null
    if (body.savTicketId !== undefined) data.savTicketId = body.savTicketId || null

    const updated = await prisma.$transaction(async (tx) => {
      // Mise à jour des champs simples
      await tx.task.update({ where: { id }, data })

      // Réassignations complètes si fournies
      if (Array.isArray(body.ouvrierInterneIds)) {
        await tx.taskOuvrierInterne.deleteMany({ where: { taskId: id } })
        if (body.ouvrierInterneIds.length) {
          await tx.taskOuvrierInterne.createMany({
            data: body.ouvrierInterneIds.map((oid: string) => ({ taskId: id, ouvrierInterneId: oid }))
          })
        }
      }
      if (Array.isArray(body.soustraitantIds)) {
        await tx.taskSousTraitant.deleteMany({ where: { taskId: id } })
        if (body.soustraitantIds.length) {
          await tx.taskSousTraitant.createMany({
            data: body.soustraitantIds.map((sid: string) => ({ taskId: id, soustraitantId: sid }))
          })
        }
      }

      return tx.task.findUnique({
        where: { id },
        include: {
          chantier: true,
          savTicket: true,
          ouvriersInternes: { include: { ouvrierInterne: true } },
          sousTraitants: { include: { soustraitant: true } },
        }
      })
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE: suppression
export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    await prisma.task.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

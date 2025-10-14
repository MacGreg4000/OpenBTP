import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { StatutSAV } from '@/types/sav'

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await props.params
    await prisma.ticketSAV.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erreur suppression ticket SAV:', error)
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { id } = await props.params
    const body = await request.json().catch(() => ({}))
    const { statut } = body as { statut?: StatutSAV }
    if (!statut || !Object.values(StatutSAV).includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const updated = await prisma.ticketSAV.update({ where: { id }, data: { statut } })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur mise à jour statut ticket SAV:', error)
    return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 })
  }
}

// GET /api/sav/[id] - détail d'un ticket
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params

    const ticket = await prisma.ticketSAV.findUnique({
      where: { id },
      include: {
        chantier: { select: { chantierId: true, nomChantier: true, clientNom: true, clientEmail: true, adresseChantier: true } },
        technicienAssign: { select: { id: true, name: true, email: true } },
        ouvrierInterneAssign: { select: { id: true, nom: true, prenom: true, email: true } },
        soustraitantAssign: { select: { id: true, nom: true, email: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        interventions: { include: { photos: true, technicien: { select: { id: true, name: true, email: true } } }, orderBy: { dateDebut: 'desc' } },
        documents: true,
        photos: true,
        commentaires: { include: { auteur: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'desc' } },
      }
    })
    if (!ticket) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })
    return NextResponse.json(ticket)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PATCH /api/sav/[id] - mise à jour des champs principaux / assignations
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    const assignable = ['technicienAssignId', 'ouvrierInterneAssignId', 'soustraitantAssignId']
    const editable = ['titre','description','type','priorite','statut','localisation','adresseIntervention','contactNom','contactTelephone','contactEmail','dateInterventionSouhaitee','datePlanifiee','dateIntervention']
    for (const key of editable) {
      if (key in body) {
        if (key.startsWith('date') && body[key]) data[key] = new Date(body[key])
        else data[key] = body[key] ?? null
      }
    }
    for (const key of assignable) {
      if (key in body) data[key] = body[key] || null
    }

    const updated = await prisma.ticketSAV.update({
      where: { id }, data,
      include: {
        technicienAssign: { select: { id: true, name: true, email: true } },
        ouvrierInterneAssign: { select: { id: true, nom: true, prenom: true, email: true } },
        soustraitantAssign: { select: { id: true, nom: true, email: true } },
      }
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST /api/sav/[id]/commentaires
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()
    const { contenu, type = 'COMMENTAIRE', estInterne = false } = body
    if (!contenu || !contenu.trim()) return NextResponse.json({ error: 'Contenu requis' }, { status: 400 })

    const created = await prisma.commentaireSAV.create({
      data: {
        ticketSAVId: id,
        contenu: String(contenu).trim(),
        type,
        estInterne: !!estInterne,
        auteurId: session.user.id,
      },
      include: { auteur: { select: { id: true, name: true, email: true } } }
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


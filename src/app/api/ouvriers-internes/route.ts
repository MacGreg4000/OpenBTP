import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const ouvriers = await prisma.ouvrierInterne.findMany({
      where: { actif: true },
      orderBy: { nom: 'asc' }
    })
    return NextResponse.json(ouvriers)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json()
    if (!body.nom || !body.prenom) {
      return NextResponse.json({ error: 'Nom et prénom requis' }, { status: 400 })
    }
    const created = await prisma.ouvrierInterne.create({
      data: {
        nom: String(body.nom).trim(),
        prenom: String(body.prenom).trim(),
        email: body.email || null,
        telephone: body.telephone || null,
        poste: body.poste || null,
        actif: body.actif !== false,
      }
    })
    return NextResponse.json(created, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

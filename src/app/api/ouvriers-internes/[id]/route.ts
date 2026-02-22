import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const ouvrier = await prisma.ouvrierInterne.findUnique({ where: { id } })
    if (!ouvrier) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    return NextResponse.json(ouvrier)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    const body = await request.json()
    const { nom, prenom, poste, email, telephone, actif } = body as {
      nom?: string
      prenom?: string
      poste?: string
      email?: string
      telephone?: string
      actif?: boolean
    }
    const updated = await prisma.ouvrierInterne.update({
      where: { id },
      data: {
        ...(nom !== undefined && { nom: String(nom).trim() }),
        ...(prenom !== undefined && { prenom: String(prenom).trim() }),
        ...(poste !== undefined && { poste: poste?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(telephone !== undefined && { telephone: telephone?.trim() || null }),
        ...(actif !== undefined && { actif: Boolean(actif) }),
      }
    })
    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id } = await props.params
    await prisma.ouvrierInterne.update({ where: { id }, data: { actif: false } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

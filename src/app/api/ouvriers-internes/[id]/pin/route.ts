import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const rec = await prisma.publicAccessPIN.findFirst({ where: { subjectType: 'OUVRIER_INTERNE', subjectId: id, estActif: true } })
  return NextResponse.json({ pin: rec?.codePIN || null })
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const body = await request.json().catch(()=> ({})) as { pin?: string }
    if (!body.pin || body.pin.length < 4) return NextResponse.json({ error: 'PIN invalide' }, { status: 400 })
    const rec = await prisma.publicAccessPIN.findFirst({ where: { subjectType: 'OUVRIER_INTERNE', subjectId: id } })
    if (rec) {
      await prisma.publicAccessPIN.update({ where: { id: rec.id }, data: { codePIN: body.pin, estActif: true } })
    } else {
      await prisma.publicAccessPIN.create({ data: { subjectType: 'OUVRIER_INTERNE', subjectId: id, codePIN: body.pin, estActif: true } })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Erreur mise à jour PIN' }, { status: 500 })
  }
}


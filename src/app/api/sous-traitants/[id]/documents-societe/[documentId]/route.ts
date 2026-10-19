import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CODES_SOCIETE } from '@/lib/documents/types'
import { archiverDocumentSociete, renommerDocumentSocieteNas } from '@/lib/documents/stockage'

type Params = { params: Promise<{ id: string; documentId: string }> }

/** Corrige le type, la date d'expiration ou la précision — sans changer le fichier ; le miroir NAS est renommé. */
export async function PATCH(request: Request, props: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id, documentId } = await props.params
    const document = await prisma.documentSousTraitant.findFirst({ where: { id: documentId, soustraitantId: id } })
    if (!document) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const data: { type?: string; dateExpiration?: Date | null; precision?: string | null } = {}
    if (body.type !== undefined) {
      if (!CODES_SOCIETE.includes(String(body.type))) return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
      data.type = String(body.type)
    }
    if (body.dateExpiration !== undefined) {
      if (body.dateExpiration === null || body.dateExpiration === '') data.dateExpiration = null
      else if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.dateExpiration))) data.dateExpiration = new Date(`${body.dateExpiration}T00:00:00.000Z`)
      else return NextResponse.json({ error: "Date d'expiration invalide (AAAA-MM-JJ)" }, { status: 400 })
    }
    if (body.precision !== undefined) {
      data.precision = typeof body.precision === 'string' && body.precision.trim() ? body.precision.trim().slice(0, 60) : null
    }

    const misAJour = await prisma.documentSousTraitant.update({ where: { id: document.id }, data })
    await renommerDocumentSocieteNas(document.id).catch((e) => console.error('[DOCUMENTS] Renommage NAS :', e))
    return NextResponse.json(misAJour)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la modification du document' }, { status: 500 })
  }
}

/** Retirer = ARCHIVER (preuve conservée, fichier déplacé dans _Archives sur le NAS), jamais supprimer. */
export async function DELETE(_request: Request, props: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { id, documentId } = await props.params
    const document = await prisma.documentSousTraitant.findFirst({ where: { id: documentId, soustraitantId: id, archive: false } })
    if (!document) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })
    await archiverDocumentSociete(document.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: "Erreur lors de l'archivage du document" }, { status: 500 })
  }
}

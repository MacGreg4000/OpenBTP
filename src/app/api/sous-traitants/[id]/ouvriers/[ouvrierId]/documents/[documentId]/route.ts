import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { archiverDocumentOuvrier, renommerDocumentOuvrierNas } from '@/lib/documents/stockage'
import { CODES_OUVRIER } from '@/lib/documents/types'

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string, documentId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le document
    const document = await prisma.documentOuvrier.findUnique({
      where: { 
        id: params.documentId,
        ouvrierId: params.ouvrierId
      }
    })

    if (!document) {
      return NextResponse.json(
        { error: 'Document non trouvé' },
        { status: 404 }
      )
    }

    // Jamais de suppression : le document est ARCHIVÉ (preuve en cas de
    // contrôle) — retiré des documents en vigueur, fichier conservé, et
    // déplacé dans _Archives sur le NAS.
    await archiverDocumentOuvrier(document.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du document' },
      { status: 500 }
    )
  }
}

/**
 * Corrige la nature (type), la date d'expiration ou la précision d'un document
 * déjà encodé — sans changer le fichier. Le fichier miroir du NAS est renommé.
 * Corps : { type?, dateExpiration? (AAAA-MM-JJ ou null), precision? }
 */
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string; ouvrierId: string; documentId: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const document = await prisma.documentOuvrier.findFirst({
      where: { id: params.documentId, ouvrierId: params.ouvrierId },
    })
    if (!document) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const data: { type?: string; dateExpiration?: Date | null; precision?: string | null; updatedAt: Date } = { updatedAt: new Date() }

    if (body.type !== undefined) {
      if (!CODES_OUVRIER.includes(String(body.type))) {
        return NextResponse.json({ error: 'Type de document invalide' }, { status: 400 })
      }
      data.type = String(body.type)
    }
    if (body.dateExpiration !== undefined) {
      if (body.dateExpiration === null || body.dateExpiration === '') {
        data.dateExpiration = null
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(body.dateExpiration))) {
        data.dateExpiration = new Date(`${body.dateExpiration}T00:00:00.000Z`)
      } else {
        return NextResponse.json({ error: "Date d'expiration invalide (AAAA-MM-JJ)" }, { status: 400 })
      }
    }
    if (body.precision !== undefined) {
      data.precision = typeof body.precision === 'string' && body.precision.trim() ? body.precision.trim().slice(0, 60) : null
    }

    const misAJour = await prisma.documentOuvrier.update({ where: { id: document.id }, data })
    // Le nom du fichier sur le NAS reflète type, précision et date
    await renommerDocumentOuvrierNas(document.id).catch((e) => console.error('[DOCUMENTS] Renommage NAS :', e))

    return NextResponse.json(misAJour)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur lors de la modification du document' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { CODES_OUVRIER } from '@/lib/documents/types'
import { enregistrerDocumentOuvrier } from '@/lib/documents/stockage'

// Types de documents : catalogue commun (src/lib/documents/types.ts)
const ALLOWED_TYPES = CODES_OUVRIER
const EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp']

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string, ouvrierId: string }> }
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string
    const dateExpiration = formData.get('dateExpiration') as string

    // Validation basique
    if (!file || !type) {
      return NextResponse.json(
        { error: 'Le fichier et le type sont requis' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Type de document non valide' },
        { status: 400 }
      )
    }

    // Vérifier si l'ouvrier existe
    const ouvrier = await prisma.ouvrier.findUnique({
      where: { 
        id: params.ouvrierId,
        sousTraitantId: params.id
      }
    })

    if (!ouvrier) {
      return NextResponse.json(
        { error: 'Ouvrier non trouvé' },
        { status: 404 }
      )
    }

    const extension = (file.name.split('.').pop() || '').toLowerCase()
    if (!EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `Format non accepté (.${extension}). Formats : ${EXTENSIONS.join(', ')}.` },
        { status: 400 }
      )
    }

    // Rangement central : archive le document en vigueur du même type (types
    // uniques) et recopie le fichier sur le NAS.
    const document = await enregistrerDocumentOuvrier(params.ouvrierId, {
      type,
      contenu: Buffer.from(await file.arrayBuffer()),
      extension: extension === 'jpeg' ? 'jpg' : extension,
      nomOriginal: file.name,
      dateExpiration: dateExpiration ? new Date(dateExpiration) : null,
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du document' },
      { status: 500 }
    )
  }
} 
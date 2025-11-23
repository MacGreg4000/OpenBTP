import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File
    const soustraitantId = formData.get('soustraitantId') as string

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!soustraitantId) {
      return NextResponse.json({ error: 'ID sous-traitant requis' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer le dossier pour ce sous-traitant s'il n'existe pas
    const soustraitantDir = path.join(process.cwd(), 'public', 'uploads', 'soustraitants', soustraitantId)
    await mkdir(soustraitantDir, { recursive: true })

    // Sauvegarder le logo avec un nom fixe
    const logoPath = path.join(soustraitantDir, 'logo.png')
    await writeFile(logoPath, buffer)

    // Retourner l'URL relative du logo
    const logoUrl = `/uploads/soustraitants/${soustraitantId}/logo.png`
    return NextResponse.json({ url: logoUrl })
  } catch (error) {
    console.error('Erreur lors de l\'upload du logo sous-traitant:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du logo' },
      { status: 500 }
    )
  }
}


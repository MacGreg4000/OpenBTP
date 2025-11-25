import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'
import { mkdir, rm } from 'fs/promises'
import AdmZip from 'adm-zip'

// Fonction pour obtenir le chemin du dossier personnalisé d'un chantier
function getCustomFichesPath(chantierId: string): string {
  return path.join(process.cwd(), 'public', 'chantiers', chantierId, 'fiches-techniques')
}

// Fonction pour vérifier si un chantier a un dossier personnalisé
function hasCustomFiches(chantierId: string): boolean {
  const customPath = getCustomFichesPath(chantierId)
  return fs.existsSync(customPath) && fs.statSync(customPath).isDirectory()
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer le chantierId depuis les query params
    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId est requis' }, { status: 400 })
    }

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer le fichier ZIP depuis FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier n\'a été fourni. Veuillez sélectionner un fichier ZIP.' }, { status: 400 })
    }

    // Vérifier que c'est bien un fichier ZIP
    if (!file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Le fichier sélectionné doit être un fichier ZIP (.zip). Veuillez sélectionner un fichier valide.' }, { status: 400 })
    }

    // Vérifier la taille du fichier (max 100 MB)
    const maxSize = 100 * 1024 * 1024 // 100 MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'Le fichier ZIP est trop volumineux. La taille maximale autorisée est de 100 Mo.' }, { status: 400 })
    }

    // Lire le contenu du fichier
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Chemin du dossier personnalisé
    const customPath = getCustomFichesPath(chantierId)

    // Si un dossier personnalisé existe déjà, le supprimer
    if (hasCustomFiches(chantierId)) {
      await rm(customPath, { recursive: true, force: true })
    }

    // Créer le dossier parent si nécessaire
    await mkdir(path.dirname(customPath), { recursive: true })

    // Décompresser le ZIP
    try {
      const zip = new AdmZip(buffer)
      zip.extractAllTo(customPath, true) // true = overwrite existing files
    } catch (error) {
      console.error('Erreur lors de la décompression du ZIP:', error)
      return NextResponse.json({ error: 'Une erreur est survenue lors de la décompression du fichier ZIP. Veuillez vérifier que le fichier n\'est pas corrompu et réessayer.' }, { status: 500 })
    }

    // Vérifier que le dossier contient au moins un fichier PDF
    const hasPdfFiles = (dir: string): boolean => {
      try {
        const items = fs.readdirSync(dir)
        for (const item of items) {
          const fullPath = path.join(dir, item)
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            if (hasPdfFiles(fullPath)) return true
          } else if (item.endsWith('.pdf')) {
            return true
          }
        }
      } catch {
        return false
      }
      return false
    }

    if (!hasPdfFiles(customPath)) {
      // Supprimer le dossier si aucun PDF n'est trouvé
      await rm(customPath, { recursive: true, force: true })
      return NextResponse.json({ error: 'Le fichier ZIP ne contient aucun fichier PDF. Veuillez vérifier que votre archive contient au moins un fichier PDF de fiche technique.' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Le dossier personnalisé de fiches techniques a été importé avec succès. Les fiches sont maintenant disponibles pour ce chantier.',
      path: `/chantiers/${chantierId}/fiches-techniques`
    })
  } catch (error) {
    console.error('Erreur lors de l\'import du ZIP:', error)
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de l\'import du fichier ZIP. Veuillez réessayer ou contacter le support si le problème persiste.' },
      { status: 500 }
    )
  }
}

// GET pour vérifier si un chantier a un dossier personnalisé
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId est requis' }, { status: 400 })
    }

    const hasCustom = hasCustomFiches(chantierId)
    const customPath = hasCustom ? getCustomFichesPath(chantierId) : null

    return NextResponse.json({
      hasCustom,
      path: customPath ? `/chantiers/${chantierId}/fiches-techniques` : null
    })
  } catch (error) {
    console.error('Erreur lors de la vérification du dossier personnalisé:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500 }
    )
  }
}


import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'

const DOCUMENTS_ROOT = process.env.DOCUMENTS_ROOT || path.join(process.cwd(), 'public', 'fiches-techniques')

// Fonction pour s'assurer que le chemin est dans le dossier racine
function validateAndGetFullPath(relativePath: string): string | null {
  // Normaliser le chemin relatif
  const normalizedPath = path.normalize(relativePath).replace(/\\/g, '/')
  
  // Vérifier si le chemin tente de sortir du dossier racine
  if (normalizedPath.includes('..')) {
    return null
  }
  
  // Créer le chemin complet
  const fullPath = path.join(DOCUMENTS_ROOT, normalizedPath)
  
  // Vérifier si le chemin est bien dans le dossier racine
  if (!fullPath.startsWith(DOCUMENTS_ROOT)) {
    return null
  }
  
  return fullPath
}

// Fonction pour obtenir le type MIME basé sur l'extension
function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function GET(request: NextRequest) {
  try {
    // Récupérer le chemin du fichier à télécharger
    const url = new URL(request.url)
    const filePath = url.searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json(
        { error: 'Chemin du fichier manquant' },
        { status: 400 }
      )
    }
    
    const fullPath = validateAndGetFullPath(filePath)
    if (!fullPath) {
      return NextResponse.json(
        { error: 'Chemin invalide' },
        { status: 400 }
      )
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Fichier non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier que c'est bien un fichier
    const stats = fs.statSync(fullPath)
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'L\'élément n\'est pas un fichier' },
        { status: 400 }
      )
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME
    const mimeType = getMimeType(fullPath)
    const fileName = path.basename(fullPath)
    
    // Retourner le fichier pour téléchargement
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors du téléchargement du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement du fichier' },
      { status: 500 }
    )
  }
} 
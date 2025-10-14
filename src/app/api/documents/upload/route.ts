import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { writeFile } from 'fs/promises'

const DOCUMENTS_ROOT = process.env.DOCUMENTS_ROOT || path.join(process.cwd(), 'public', 'fiches-techniques')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const uploadPath = formData.get('path') as string | null
    
    if (!file) {
      return NextResponse.json(
        { error: 'Fichier manquant' },
        { status: 400 }
      )
    }
    
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10MB)' },
        { status: 400 }
      )
    }
    
    if (!uploadPath) {
      return NextResponse.json(
        { error: 'Chemin de destination manquant' },
        { status: 400 }
      )
    }
    
    const targetDir = validateAndGetFullPath(uploadPath)
    if (!targetDir) {
      return NextResponse.json(
        { error: 'Chemin de destination invalide' },
        { status: 400 }
      )
    }
    
    // Vérifier que le dossier existe
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    
    // Créer le chemin complet du fichier
    const fileName = file.name
    const filePath = path.join(targetDir, fileName)
    
    // Vérifier si un fichier existe déjà avec ce nom
    if (fs.existsSync(filePath)) {
      // Option 1: Retourner une erreur
      // return NextResponse.json(
      //   { error: 'Un fichier avec ce nom existe déjà' },
      //   { status: 409 }
      // )
      
      // Option 2: Remplacer le fichier existant (ce que nous faisons ici)
      fs.unlinkSync(filePath)
    }
    
    // Écrire le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)
    
    // Récupérer les informations du fichier
    const fileStats = fs.statSync(filePath)
    
    // Créer le chemin relatif pour la réponse
    const relativeFilePath = `${uploadPath === '/' ? '' : uploadPath}/${fileName}`.replace(/\/\//g, '/')
    
    // Créer l'objet de réponse
    const uploadedFile = {
      id: `file-${Buffer.from(relativeFilePath).toString('base64')}`,
      name: fileName,
      path: relativeFilePath,
      type: getMimeType(fileName),
      size: fileStats.size,
      updatedAt: fileStats.mtime.toISOString()
    }
    
    return NextResponse.json(uploadedFile, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de l\'upload du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du fichier' },
      { status: 500 }
    )
  }
} 
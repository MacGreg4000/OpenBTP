import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DOCUMENTS_ROOT = process.env.DOCUMENTS_ROOT || path.join(process.cwd(), 'public', 'fiches-techniques')

// Fonction pour valider le nom du dossier
function isValidFolderName(name: string): boolean {
  return Boolean(name && !name.includes('/') && !name.includes('\\') && name.trim().length > 0)
}

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

export async function POST(request: NextRequest) {
  try {
    const { name, path: folderPath } = await request.json()
    
    // Validation des entrées
    if (!isValidFolderName(name)) {
      return NextResponse.json(
        { error: 'Nom de dossier invalide' },
        { status: 400 }
      )
    }
    
    const parentPath = validateAndGetFullPath(folderPath)
    if (!parentPath) {
      return NextResponse.json(
        { error: 'Chemin parent invalide' },
        { status: 400 }
      )
    }
    
    // Vérifier que le dossier parent existe
    if (!fs.existsSync(parentPath)) {
      fs.mkdirSync(parentPath, { recursive: true })
    }
    
    // Créer le chemin complet du nouveau dossier
    const newFolderFullPath = path.join(parentPath, name)
    
    // Vérifier si le dossier existe déjà
    if (fs.existsSync(newFolderFullPath)) {
      return NextResponse.json(
        { error: 'Un dossier avec ce nom existe déjà' },
        { status: 409 }
      )
    }
    
    // Créer le dossier
    fs.mkdirSync(newFolderFullPath)
    
    // Créer l'objet de réponse
    const relativeFolderPath = `${folderPath === '/' ? '' : folderPath}/${name}`.replace(/\/\//g, '/')
    const newFolder = {
      id: `folder-${Buffer.from(relativeFolderPath).toString('base64')}`,
      name,
      path: relativeFolderPath,
      subfolders: [],
      files: []
    }
    
    return NextResponse.json(newFolder, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du dossier' },
      { status: 500 }
    )
  }
} 
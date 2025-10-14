import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { rm } from 'fs/promises'

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

export async function DELETE(request: NextRequest) {
  try {
    // Récupérer les paramètres de la requête
    const url = new URL(request.url)
    const itemPath = url.searchParams.get('path')
    const isFolder = url.searchParams.get('isFolder') === 'true'
    
    if (!itemPath) {
      return NextResponse.json(
        { error: 'Chemin de l\'élément à supprimer manquant' },
        { status: 400 }
      )
    }
    
    const fullPath = validateAndGetFullPath(itemPath)
    if (!fullPath) {
      return NextResponse.json(
        { error: 'Chemin invalide' },
        { status: 400 }
      )
    }
    
    // Vérifier que l'élément existe
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json(
        { error: 'Élément non trouvé' },
        { status: 404 }
      )
    }
    
    // Vérifier que c'est bien un dossier ou un fichier selon le paramètre isFolder
    const stats = fs.statSync(fullPath)
    if (isFolder && !stats.isDirectory()) {
      return NextResponse.json(
        { error: 'L\'élément n\'est pas un dossier' },
        { status: 400 }
      )
    }
    
    if (!isFolder && !stats.isFile()) {
      return NextResponse.json(
        { error: 'L\'élément n\'est pas un fichier' },
        { status: 400 }
      )
    }
    
    // Supprimer l'élément
    if (isFolder) {
      // Supprimer récursivement le dossier
      await rm(fullPath, { recursive: true })
    } else {
      // Supprimer le fichier
      await rm(fullPath)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la suppression:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression' },
      { status: 500 }
    )
  }
} 
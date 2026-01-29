import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chantierId: string; path: string[] }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Attendre que params soit résolu
    const resolvedParams = await params
    const { chantierId, path: pathSegments } = resolvedParams
    
    console.log('📄 [API] Tentative d\'accès au fichier:', { chantierId, pathSegments })
    
    // Reconstruire le chemin relatif à partir des segments
    const relativePath = pathSegments.join('/')
    console.log('📄 [API] Chemin relatif reconstruit:', relativePath)
    
    // Chemin complet vers le fichier dans public/chantiers/[chantierId]/documents/...
    const fullPath = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents', relativePath)
    console.log('📄 [API] Chemin complet:', fullPath)
    
    // Vérifier si le chemin est sécurisé (ne contient pas ..)
    const normalizedPath = path.normalize(fullPath)
    const allowedBasePath = path.join(process.cwd(), 'public', 'chantiers', chantierId, 'documents')
    if (!normalizedPath.startsWith(allowedBasePath)) {
      console.error('❌ [API] Tentative d\'accès à un fichier en dehors du dossier autorisé')
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 })
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      console.error('❌ [API] Fichier non trouvé:', fullPath)
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }
    
    // Vérifier que c'est bien un fichier
    const stats = fs.statSync(fullPath)
    if (!stats.isFile()) {
      console.error('❌ [API] L\'élément n\'est pas un fichier:', fullPath)
      return NextResponse.json({ error: 'L\'élément n\'est pas un fichier' }, { status: 400 })
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME
    const mimeType = getMimeType(fullPath)
    
    // Retourner le fichier en ligne (pas comme pièce jointe)
    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(fileBuffer)
    const response = new NextResponse(uint8Array, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache pendant 1 an
        'X-Content-Type-Options': 'nosniff',
        // Headers pour permettre l'affichage dans iframe
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        // Utiliser Content-Security-Policy à la place de X-Frame-Options (plus moderne)
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    })
    
    // Supprimer explicitement X-Frame-Options si défini par next.config.js
    response.headers.delete('X-Frame-Options')
    
    console.log('✅ [API] Fichier servi avec succès:', path.basename(fullPath))
    return response
  } catch (error) {
    console.error('❌ [API] Erreur lors de la lecture du fichier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la lecture du fichier' },
      { status: 500 }
    )
  }
}

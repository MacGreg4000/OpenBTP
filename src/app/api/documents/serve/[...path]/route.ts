import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'
import { Readable } from 'stream'

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
    '.webp': 'image/webp',
    '.heic': 'image/heic',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
  }
  
  return mimeTypes[ext] || 'application/octet-stream'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Attendre que params soit résolu
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;
    
    console.log('Tentative d\'accès au fichier avec chemin:', pathSegments);
    
    // Reconstruire le chemin relatif à partir des segments
    const relativePath = pathSegments.join('/');
    console.log('Chemin relatif reconstruit:', relativePath);
    
    // Chemin complet vers le fichier dans public/uploads
    const fullPath = path.join(process.cwd(), 'public', 'uploads', relativePath);
    console.log('Chemin complet:', fullPath);
    
    // Vérifier si le chemin est sécurisé (ne contient pas ..)
    const normalizedPath = path.normalize(fullPath);
    if (!normalizedPath.startsWith(path.join(process.cwd(), 'public', 'uploads'))) {
      console.error('Tentative d\'accès à un fichier en dehors du dossier uploads');
      return NextResponse.json({ error: 'Chemin non autorisé' }, { status: 403 });
    }
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(fullPath)) {
      console.error('Fichier non trouvé:', fullPath);
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 });
    }
    
    // Vérifier que c'est bien un fichier
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      console.error('L\'élément n\'est pas un fichier:', fullPath);
      return NextResponse.json({ error: 'L\'élément n\'est pas un fichier' }, { status: 400 });
    }
    
    // Déterminer le type MIME
    const mimeType = getMimeType(fullPath);

    // Vidéos : envoi par plages (HTTP 206). Safari/iOS refuse de lire une
    // vidéo sans « Range », et le streaming évite de charger tout le fichier
    // en mémoire. Les autres fichiers gardent le comportement d'origine.
    if (mimeType.startsWith('video/')) {
      const range = request.headers.get('range')
      const taille = stats.size
      const communs = {
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
      }
      if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range)
        let debut = m && m[1] ? parseInt(m[1], 10) : 0
        let fin = m && m[2] ? parseInt(m[2], 10) : taille - 1
        if (m && !m[1] && m[2]) {
          // « bytes=-N » : les N derniers octets
          debut = Math.max(0, taille - parseInt(m[2], 10))
          fin = taille - 1
        }
        fin = Math.min(fin, taille - 1)
        if (!m || debut > fin || debut >= taille) {
          return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${taille}` } })
        }
        const flux = Readable.toWeb(fs.createReadStream(fullPath, { start: debut, end: fin })) as ReadableStream
        return new NextResponse(flux, {
          status: 206,
          headers: { ...communs, 'Content-Range': `bytes ${debut}-${fin}/${taille}`, 'Content-Length': String(fin - debut + 1) },
        })
      }
      const flux = Readable.toWeb(fs.createReadStream(fullPath)) as ReadableStream
      return new NextResponse(flux, { headers: { ...communs, 'Content-Length': String(taille) } })
    }

    // Lire le fichier
    const fileBuffer = await readFile(fullPath);
    
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
        // Supprimer X-Frame-Options pour permettre l'affichage dans iframe
        // Utiliser Content-Security-Policy à la place (plus moderne)
        'Content-Security-Policy': "frame-ancestors 'self'",
      },
    });
    
    // Supprimer explicitement X-Frame-Options si défini par next.config.js
    response.headers.delete('X-Frame-Options');
    
    return response;
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture du fichier' },
      { status: 500 }
    );
  }
} 
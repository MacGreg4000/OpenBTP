import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { readFile } from 'fs/promises'

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
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath);
    
    // Déterminer le type MIME
    const mimeType = getMimeType(fullPath);
    
    // Retourner le fichier en ligne (pas comme pièce jointe)
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache pendant 1 an
        'X-Content-Type-Options': 'nosniff',
        // Headers pour permettre l'affichage dans iframe
        'Content-Disposition': `inline; filename="${path.basename(fullPath)}"`,
        'X-Frame-Options': 'SAMEORIGIN', // Permet l'affichage dans un iframe depuis la même origine
      },
    });
  } catch (error) {
    console.error('Erreur lors de la lecture du fichier:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la lecture du fichier' },
      { status: 500 }
    );
  }
} 
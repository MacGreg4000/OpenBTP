import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier si l'utilisateur est admin ou manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }

    const documentsDir = path.join(process.cwd(), 'public', 'documents', 'administratifs')
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(documentsDir)) {
      fs.mkdirSync(documentsDir, { recursive: true })
    }

    // Lire le contenu du dossier
    const files = fs.readdirSync(documentsDir)
    
    const documents = files.map(file => {
      const filePath = path.join(documentsDir, file)
      const stats = fs.statSync(filePath)
      
      return {
        id: file,
        nom: file,
        type: path.extname(file).slice(1), // Enlever le point de l'extension
        taille: stats.size,
        dateUpload: stats.mtime.toISOString(),
        url: `/documents/administratifs/${encodeURIComponent(file)}`
      }
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
} 
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { stat } from 'fs/promises'

const DOCUMENTS_ROOT = process.env.DOCUMENTS_ROOT || path.join(process.cwd(), 'public', 'fiches-techniques')

// Types pour la structure des dossiers et fichiers
interface File {
  id: string
  name: string
  path: string
  type: string
  size: number
  updatedAt: string
}

interface Folder {
  id: string
  name: string
  path: string
  isExpanded?: boolean
  subfolders: Folder[]
  files: File[]
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

// Fonction pour scanner récursivement un répertoire
async function scanDirectory(dirPath: string, relativePath: string): Promise<Folder> {
  // Vérifier que le dossier existe
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
  
  const entries = fs.readdirSync(dirPath)
  
  const folder: Folder = {
    id: `folder-${Buffer.from(relativePath).toString('base64')}`,
    name: path.basename(dirPath),
    path: relativePath,
    isExpanded: relativePath === '/',
    subfolders: [],
    files: []
  }
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry)
    const entryRelativePath = path.join(relativePath, entry).replace(/\\/g, '/')
    
    const entryStat = await stat(entryPath)
    
    if (entryStat.isDirectory()) {
      const subfolder = await scanDirectory(entryPath, entryRelativePath)
      folder.subfolders.push(subfolder)
    } else {
      folder.files.push({
        id: `file-${Buffer.from(entryRelativePath).toString('base64')}`,
        name: entry,
        path: entryRelativePath,
        type: getMimeType(entry),
        size: entryStat.size,
        updatedAt: entryStat.mtime.toISOString()
      })
    }
  }
  
  return folder
}

export async function GET() {
  try {
    // Vérifier que le dossier racine existe
    if (!fs.existsSync(DOCUMENTS_ROOT)) {
      fs.mkdirSync(DOCUMENTS_ROOT, { recursive: true })
    }
    
    const structure = await scanDirectory(DOCUMENTS_ROOT, '/')
    
    return NextResponse.json(structure)
  } catch (error) {
    console.error('Erreur lors de la récupération de la structure des dossiers:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la structure des dossiers' },
      { status: 500 }
    )
  }
} 
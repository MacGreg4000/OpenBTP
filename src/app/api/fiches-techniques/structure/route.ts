import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import fs from 'fs'
import path from 'path'

interface FicheTechnique {
  id: string
  titre: string
  categorie: string
  sousCategorie?: string | null
  fichierUrl: string
  description?: string | null
  referenceCC?: string | null
}

interface Dossier {
  nom: string
  chemin: string
  sousDossiers: Dossier[]
  fiches: FicheTechnique[]
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const baseDir = path.join(process.cwd(), 'public', 'fiches-techniques')
    const structure = scanDirectory(baseDir)

    return NextResponse.json(structure)
  } catch (error) {
    console.error('Erreur lors de la lecture de la structure:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la lecture de la structure des dossiers' },
      { status: 500 }
    )
  }
}

function scanDirectory(dir: string): Dossier[] {
  const items = fs.readdirSync(dir)
  const structure: Dossier[] = []
  const fichesParDossier: Record<string, FicheTechnique[]> = {}

  // Première passe: récupérer tous les fichiers et les organiser par dossier
  items.forEach(item => {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    const relativePath = path.relative(path.join(process.cwd(), 'public'), fullPath)

    if (stat.isDirectory()) {
      // C'est un dossier
      const sousDossiers = scanDirectory(fullPath)
      structure.push({
        nom: item,
        chemin: relativePath,
        sousDossiers,
        fiches: []
      })
    } else if (item.endsWith('.pdf')) {
      // C'est une fiche technique
      const parentDir = path.basename(dir)
      const grandParentDir = path.basename(path.dirname(dir))
      
      const fiche = {
        id: `${relativePath}`, // Utiliser le chemin complet comme ID unique
        titre: path.parse(item).name,
        categorie: grandParentDir,
        sousCategorie: parentDir,
        fichierUrl: relativePath,
        description: null
      }
      
      // Regrouper les fiches par dossier parent
      if (!fichesParDossier[parentDir]) {
        fichesParDossier[parentDir] = []
      }
      fichesParDossier[parentDir].push(fiche)
    }
  })

  // Deuxième passe: ajouter les dossiers avec leurs fiches
  Object.entries(fichesParDossier).forEach(([nomDossier, fiches]) => {
    structure.push({
      nom: nomDossier,
      chemin: path.dirname(fiches[0].fichierUrl),
      sousDossiers: [],
      fiches: fiches
    })
  })

  return structure
} 
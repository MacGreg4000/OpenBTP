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

    // Compter toutes les fiches pour debug
    const countAllFiches = (dossiers: Dossier[]): number => {
      let count = 0
      dossiers.forEach(d => {
        count += d.fiches.length
        if (d.sousDossiers.length > 0) {
          count += countAllFiches(d.sousDossiers)
        }
      })
      return count
    }
    const totalFiches = countAllFiches(structure)
    console.log(`[API Structure] Total fiches trouvées: ${totalFiches}`)
    console.log(`[API Structure] Structure:`, JSON.stringify(structure, null, 2))

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
      // C'est un dossier - scanner récursivement
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
    const cheminDossier = path.dirname(fiches[0].fichierUrl)
    
    // Chercher un dossier existant avec le même nom et le même chemin
    const dossierExistant = structure.find(d => 
      d.nom === nomDossier && 
      d.chemin === cheminDossier
    )
    
    if (dossierExistant) {
      // Si le dossier existe déjà, ajouter les fiches à ce dossier (éviter les doublons)
      const fichesExistantes = new Set(dossierExistant.fiches.map(f => f.id))
      fiches.forEach(fiche => {
        if (!fichesExistantes.has(fiche.id)) {
          dossierExistant.fiches.push(fiche)
        }
      })
    } else {
      // Sinon, créer un nouveau dossier
      structure.push({
        nom: nomDossier,
        chemin: cheminDossier,
        sousDossiers: [],
        fiches: fiches
      })
    }
  })

  return structure
} 
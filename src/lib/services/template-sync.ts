import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'

/**
 * Synchronise le template professionnel du fichier HTML avec la base de données
 * S'exécute au démarrage de l'application
 */
export async function syncProfessionalTemplate() {
  let connectionEstablished = false
  try {
    console.log('🔄 Synchronisation du template professionnel...')
    
    // Lire le fichier HTML du template
    const templatePath = path.join(process.cwd(), 'templates', 'contrat-professionnel.html')
    
    if (!fs.existsSync(templatePath)) {
      console.warn('⚠️  Fichier template professionnel non trouvé:', templatePath)
      return
    }
    
    const htmlContent = fs.readFileSync(templatePath, 'utf-8')
    
    // Vérifier si le template existe déjà
    const existingTemplate = await prisma.contractTemplate.findFirst({
      where: {
        name: 'Contrat de Sous-Traitance Professionnel'
      }
    })
    connectionEstablished = true
    
    if (existingTemplate) {
      // Mettre à jour uniquement si le contenu a changé
      if (existingTemplate.htmlContent !== htmlContent) {
        await prisma.contractTemplate.update({
          where: {
            id: existingTemplate.id
          },
          data: {
            htmlContent,
            description: 'Modèle professionnel de contrat de sous-traitance avec toutes les clauses légales et signatures électroniques',
            updatedAt: new Date()
          }
        })
        console.log('✅ Template professionnel mis à jour dans la base de données')
      } else {
        console.log('✅ Template professionnel déjà à jour')
      }
    } else {
      // Créer le nouveau template
      const template = await prisma.contractTemplate.create({
        data: {
          name: 'Contrat de Sous-Traitance Professionnel',
          description: 'Modèle professionnel de contrat de sous-traitance avec toutes les clauses légales et signatures électroniques',
          htmlContent,
          isActive: true
        }
      })
      console.log('✅ Template professionnel créé avec ID:', template.id)
    }
  } catch (error: any) {
    // Vérifier si c'est une erreur de connexion à la base de données
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      console.warn('⚠️  Base de données non disponible, synchronisation du template reportée')
      // Ne pas afficher l'erreur complète pour les erreurs de connexion
      return
    }
    console.error('❌ Erreur lors de la synchronisation du template:', error?.message || error)
    // Ne pas faire échouer le démarrage de l'application
  } finally {
    // Ne déconnecter que si la connexion a été établie
    if (connectionEstablished) {
      try {
        await prisma.$disconnect()
      } catch (disconnectError) {
        // Ignorer les erreurs de déconnexion
      }
    }
  }
}

/**
 * Récupère le template actif depuis la base de données
 */
export async function getActiveTemplate() {
  try {
    const template = await prisma.contractTemplate.findFirst({
      where: {
        isActive: true
      }
    })
    
    return template
  } catch (error: any) {
    // Vérifier si c'est une erreur de connexion à la base de données
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database server")) {
      console.warn('⚠️  Base de données non disponible')
      return null
    }
    console.error('❌ Erreur lors de la récupération du template actif:', error?.message || error)
    return null
  }
  // Ne pas déconnecter ici car cette fonction peut être appelée plusieurs fois
  // et Prisma gère les connexions automatiquement
}

/**
 * Exporte le template actif vers un fichier HTML
 */
export async function exportActiveTemplate(outputPath: string) {
  try {
    const template = await getActiveTemplate()
    
    if (!template) {
      throw new Error('Aucun template actif trouvé')
    }
    
    fs.writeFileSync(outputPath, template.htmlContent, 'utf-8')
    console.log('✅ Template exporté vers:', outputPath)
    
    return template
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'exportation du template:', error?.message || error)
    throw error
  }
  // Ne pas déconnecter ici car cette fonction peut être appelée plusieurs fois
  // et Prisma gère les connexions automatiquement
}


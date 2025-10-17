import { prisma } from '@/lib/prisma/client'
import fs from 'fs'
import path from 'path'

/**
 * Synchronise le template professionnel du fichier HTML avec la base de données
 * S'exécute au démarrage de l'application
 */
export async function syncProfessionalTemplate() {
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
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation du template:', error)
    // Ne pas faire échouer le démarrage de l'application
  } finally {
    await prisma.$disconnect()
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
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du template actif:', error)
    return null
  } finally {
    await prisma.$disconnect()
  }
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
  } catch (error) {
    console.error('❌ Erreur lors de l\'exportation du template:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}


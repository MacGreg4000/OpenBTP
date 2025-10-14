const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function insertProfessionalTemplate() {
  try {
    console.log('Lecture du template professionnel...')
    
    // Lire le template HTML professionnel
    const templatePath = path.join(__dirname, '..', 'templates', 'contrat-sous-traitant-professionnel.html')
    const htmlContent = fs.readFileSync(templatePath, 'utf8')
    
    console.log('Template lu avec succès')
    
    // Désactiver tous les templates existants
    console.log('Désactivation des templates existants...')
    await prisma.contractTemplate.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    })
    
    // Créer le nouveau template professionnel
    console.log('Création du template professionnel...')
    const template = await prisma.contractTemplate.create({
      data: {
        name: 'Template Professionnel 2024',
        description: 'Template de contrat de sous-traitance professionnel avec design moderne, logo, en-tête et pied de page',
        htmlContent: htmlContent,
        isActive: true
      }
    })
    
    console.log('Template professionnel créé avec succès:', template.id)
    console.log('Nom:', template.name)
    console.log('Actif:', template.isActive)
    
  } catch (error) {
    console.error('Erreur lors de l\'insertion du template:', error)
  } finally {
    await prisma.$disconnect()
  }
}

insertProfessionalTemplate()

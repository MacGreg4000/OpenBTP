const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function insertProfessionalTemplate() {
  try {
    console.log('📄 Lecture du template professionnel...');
    
    // Lire le fichier HTML du template
    const templatePath = path.join(__dirname, '..', 'templates', 'contrat-professionnel.html');
    const htmlContent = fs.readFileSync(templatePath, 'utf-8');
    
    console.log('✅ Template lu avec succès');
    
    // Vérifier si le template existe déjà
    const existingTemplate = await prisma.contractTemplate.findFirst({
      where: {
        name: 'Contrat de Sous-Traitance Professionnel'
      }
    });
    
    if (existingTemplate) {
      console.log('⚠️  Le template professionnel existe déjà (ID:', existingTemplate.id, ')');
      console.log('   Mise à jour du template...');
      
      await prisma.contractTemplate.update({
        where: {
          id: existingTemplate.id
        },
        data: {
          htmlContent,
          description: 'Modèle professionnel de contrat de sous-traitance avec toutes les clauses légales et signatures électroniques',
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Template mis à jour avec succès !');
    } else {
      console.log('📝 Création du nouveau template...');
      
      // Créer le nouveau template
      const template = await prisma.contractTemplate.create({
        data: {
          name: 'Contrat de Sous-Traitance Professionnel',
          description: 'Modèle professionnel de contrat de sous-traitance avec toutes les clauses légales et signatures électroniques',
          htmlContent,
          isActive: true
        }
      });
      
      console.log('✅ Template créé avec succès !');
      console.log('   ID:', template.id);
      console.log('   Nom:', template.name);
      console.log('   Actif:', template.isActive);
    }
    
    // Afficher un récapitulatif
    const allTemplates = await prisma.contractTemplate.findMany();
    console.log('\n📋 Récapitulatif des templates:');
    console.log('   Total:', allTemplates.length, 'template(s)');
    allTemplates.forEach(t => {
      console.log(`   - ${t.name} (${t.isActive ? 'ACTIF' : 'Inactif'}) - ID: ${t.id}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion du template:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
insertProfessionalTemplate()
  .then(() => {
    console.log('\n✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erreur fatale:', error.message);
    process.exit(1);
  });

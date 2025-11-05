const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, '..', 'public')
const svgPath = path.join(publicDir, 'favicon.svg')
const output192 = path.join(publicDir, 'favicon-192.png')
const output512 = path.join(publicDir, 'favicon-512.png')

async function generateIcons() {
  try {
    // Vérifier que le SVG existe
    if (!fs.existsSync(svgPath)) {
      console.error('❌ Le fichier favicon.svg n\'existe pas dans public/')
      process.exit(1)
    }

    console.log('🔄 Génération des icônes PWA...')

    // Générer l'icône 192x192
    await sharp(svgPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 37, g: 99, b: 235, alpha: 1 } // Bleu #2563eb
      })
      .png()
      .toFile(output192)

    console.log('✅ favicon-192.png créé')

    // Générer l'icône 512x512
    await sharp(svgPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 37, g: 99, b: 235, alpha: 1 } // Bleu #2563eb
      })
      .png()
      .toFile(output512)

    console.log('✅ favicon-512.png créé')
    console.log('✨ Icônes PWA générées avec succès !')
  } catch (error) {
    console.error('❌ Erreur lors de la génération des icônes:', error)
    process.exit(1)
  }
}

generateIcons()


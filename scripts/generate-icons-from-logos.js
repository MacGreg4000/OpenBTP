const sharp = require('sharp')
const fs = require('fs').promises
const path = require('path')

async function generateIcons() {
  const publicDir = path.join(process.cwd(), 'public')
  const desktopLogo = path.join(publicDir, 'Logo-Desktop.png')
  const mobileLogo = path.join(publicDir, 'Logo-Mobile.png')

  // Vérifier si les fichiers existent
  try {
    await fs.access(desktopLogo)
    console.log('✅ Logo-Desktop.png trouvé')
  } catch {
    console.log('❌ Logo-Desktop.png non trouvé, utilisation des icônes par défaut')
    return
  }

  try {
    await fs.access(mobileLogo)
    console.log('✅ Logo-Mobile.png trouvé')
  } catch {
    console.log('❌ Logo-Mobile.png non trouvé, utilisation des icônes par défaut')
  }

  // Générer les icônes desktop
  if (await fs.access(desktopLogo).then(() => true).catch(() => false)) {
    console.log('📱 Génération des icônes desktop...')
    const desktopSizes = [16, 32, 192, 512]
    
    for (const size of desktopSizes) {
      try {
        await sharp(desktopLogo)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toFile(path.join(publicDir, `favicon-${size}.png`))
        console.log(`  ✅ favicon-${size}.png créé`)
      } catch (error) {
        console.error(`  ❌ Erreur lors de la création de favicon-${size}.png:`, error)
      }
    }

    // Créer aussi le favicon.svg si possible (copie du logo)
    try {
      const svgBuffer = await sharp(desktopLogo)
        .resize(32, 32, { fit: 'contain' })
        .png()
        .toBuffer()
      // Note: On ne peut pas créer un vrai SVG, mais on peut créer un favicon.ico
      console.log('  ℹ️  Note: favicon.svg doit être créé manuellement si nécessaire')
    } catch (error) {
      console.warn('  ⚠️  Impossible de créer le favicon.svg:', error)
    }
  }

  // Générer les icônes mobile
  if (await fs.access(mobileLogo).then(() => true).catch(() => false)) {
    console.log('📱 Génération des icônes mobile...')
    const mobileSizes = [180, 192, 512]
    
    for (const size of mobileSizes) {
      try {
        const outputPath = size === 180 
          ? path.join(publicDir, 'apple-touch-icon.png')
          : path.join(publicDir, `favicon-${size}.png`)
        
        await sharp(mobileLogo)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 37, g: 99, b: 235, alpha: 1 } // Bleu #2563eb
          })
          .png()
          .toFile(outputPath)
        
        const filename = path.basename(outputPath)
        console.log(`  ✅ ${filename} créé`)
      } catch (error) {
        console.error(`  ❌ Erreur lors de la création de l'icône mobile ${size}x${size}:`, error)
      }
    }
  }

  // Copier aussi dans public/images/icons/ pour compatibilité avec le système d'upload
  const iconsDir = path.join(publicDir, 'images', 'icons')
  await fs.mkdir(iconsDir, { recursive: true })

  if (await fs.access(desktopLogo).then(() => true).catch(() => false)) {
    const desktopSizes = [16, 32, 192, 512]
    for (const size of desktopSizes) {
      try {
        const sourcePath = path.join(publicDir, `favicon-${size}.png`)
        const destPath = path.join(iconsDir, `favicon-${size}.png`)
        await fs.copyFile(sourcePath, destPath)
        console.log(`  ✅ Copié favicon-${size}.png dans images/icons/`)
      } catch (error) {
        console.error(`  ❌ Erreur lors de la copie de favicon-${size}.png:`, error)
      }
    }
  }

  if (await fs.access(mobileLogo).then(() => true).catch(() => false)) {
    try {
      const sourcePath = path.join(publicDir, 'apple-touch-icon.png')
      const destPath = path.join(iconsDir, 'apple-touch-icon.png')
      await fs.copyFile(sourcePath, destPath)
      console.log('  ✅ Copié apple-touch-icon.png dans images/icons/')
    } catch (error) {
      console.error('  ❌ Erreur lors de la copie de apple-touch-icon.png:', error)
    }
  }

  console.log('✅ Génération des icônes terminée!')
}

generateIcons().catch(console.error)


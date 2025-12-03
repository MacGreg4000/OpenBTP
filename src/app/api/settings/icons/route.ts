import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('icon') as File
    const type = formData.get('type') as string // 'desktop' ou 'mobile'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!type || (type !== 'desktop' && type !== 'mobile')) {
      return NextResponse.json({ error: 'Type invalide (doit être "desktop" ou "mobile")' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Créer le dossier public/images/icons s'il n'existe pas
    const iconsDir = path.join(process.cwd(), 'public', 'images', 'icons')
    await mkdir(iconsDir, { recursive: true })

      try {
        // Redimensionner et optimiser l'image selon le type
        if (type === 'desktop') {
          // Pour desktop, créer plusieurs tailles : 16x16, 32x32, 192x192, 512x512
          const sizes = [16, 32, 192, 512]
          const promises = sizes.map(async (size) => {
            const resized = await sharp(buffer)
              .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
              })
              .png()
              .toBuffer()
            
            const filename = `favicon-${size}.png`
            await writeFile(path.join(iconsDir, filename), resized)
            console.log(`✅ Icône desktop ${size}x${size} créée: ${filename}`)
          })
          
          await Promise.all(promises)
          
          // Sauvegarder aussi dans le dossier public pour compatibilité
          const publicIconsDir = path.join(process.cwd(), 'public')
          const publicSizes = [192, 512]
          for (const size of publicSizes) {
            const resized = await sharp(buffer)
              .resize(size, size, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
              })
              .png()
              .toBuffer()
            
            const filename = `favicon-${size}.png`
            await writeFile(path.join(publicIconsDir, filename), resized)
            console.log(`✅ Icône desktop ${size}x${size} créée dans public: ${filename}`)
          }
        } else {
          // Pour mobile, créer les tailles iOS : 180x180, 192x192, 512x512
          const sizes = [180, 192, 512]
          const promises = sizes.map(async (size) => {
            const resized = await sharp(buffer)
              .resize(size, size, {
                fit: 'contain',
                background: { r: 37, g: 99, b: 235, alpha: 1 } // Bleu #2563eb
              })
              .png()
              .toBuffer()
            
            const filename = size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`
            await writeFile(path.join(iconsDir, filename), resized)
            console.log(`✅ Icône mobile ${size}x${size} créée: ${filename}`)
          })
          
          await Promise.all(promises)
          
          // Sauvegarder aussi dans le dossier public pour compatibilité
          const publicIconsDir = path.join(process.cwd(), 'public')
          const appleIcon = await sharp(buffer)
            .resize(180, 180, {
              fit: 'contain',
              background: { r: 37, g: 99, b: 235, alpha: 1 }
            })
            .png()
            .toBuffer()
          
          await writeFile(path.join(publicIconsDir, 'apple-touch-icon.png'), appleIcon)
          console.log('✅ Icône mobile 180x180 créée dans public: apple-touch-icon.png')
        }

        // Sauvegarder l'icône source originale
        const sourceFilename = type === 'desktop' ? 'icon-desktop-source.png' : 'icon-mobile-source.png'
        await writeFile(path.join(iconsDir, sourceFilename), buffer)

        return NextResponse.json({ 
          success: true,
          message: `Icône ${type} uploadée et traitée avec succès`,
          url: `/images/icons/${type === 'desktop' ? 'favicon-192.png' : 'apple-touch-icon.png'}`
        })
    } catch (error) {
      console.error('Erreur lors du traitement de l\'image:', error)
      return NextResponse.json(
        { error: 'Erreur lors du traitement de l\'image' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'icône:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'icône' },
      { status: 500 }
    )
  }
}


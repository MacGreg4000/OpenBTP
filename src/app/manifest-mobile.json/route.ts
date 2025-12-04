import { NextResponse } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const iconsDir = path.join(publicDir, 'images', 'icons')
    
    // Vérifier quelles icônes sont disponibles
    // Priorité : 1) Icônes uploadées dans images/icons/ 2) Icônes dans public/
    const checkIcon = (iconPath: string): boolean => {
      return existsSync(path.join(process.cwd(), 'public', iconPath.replace(/^\//, '')))
    }
    
    // Déterminer les icônes à utiliser pour mobile
    // Priorité : 1) Icônes uploadées mobile dans images/icons/ 2) Icônes générées depuis Logo-Mobile dans public/
    let mobileIcon192 = '/favicon-192.png'
    let mobileIcon512 = '/favicon-512.png'
    
    // Vérifier d'abord les icônes uploadées mobile dans images/icons/
    // (générées depuis Logo-Mobile.png via l'upload ou le script)
    if (checkIcon('/images/icons/favicon-192.png')) {
      // Vérifier si c'est une icône mobile (générée depuis Logo-Mobile)
      // En vérifiant si icon-mobile-source.png existe
      if (checkIcon('/images/icons/icon-mobile-source.png')) {
        mobileIcon192 = '/images/icons/favicon-192.png'
      } else {
        // Sinon, utiliser les icônes dans public/ (générées depuis Logo-Mobile.png)
        // Note: Si Logo-Mobile.png a été utilisé, les icônes dans public/ sont mobile
        mobileIcon192 = '/favicon-192.png'
      }
    } else if (checkIcon('/favicon-192.png')) {
      mobileIcon192 = '/favicon-192.png'
    }
    
    if (checkIcon('/images/icons/favicon-512.png')) {
      if (checkIcon('/images/icons/icon-mobile-source.png')) {
        mobileIcon512 = '/images/icons/favicon-512.png'
      } else {
        mobileIcon512 = '/favicon-512.png'
      }
    } else if (checkIcon('/favicon-512.png')) {
      mobileIcon512 = '/favicon-512.png'
    }
    
    const manifest = {
      name: 'OpenBTP Mobile',
      short_name: 'OpenBTP',
      description: 'Application mobile de gestion de chantiers',
      start_url: '/mobile',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'portrait',
      icons: [
        {
          src: mobileIcon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: mobileIcon512,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    }
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du manifest mobile:', error)
    // Retourner un manifest par défaut en cas d'erreur
    return NextResponse.json({
      name: 'OpenBTP Mobile',
      short_name: 'OpenBTP',
      description: 'Application mobile de gestion de chantiers',
      start_url: '/mobile',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'portrait',
      icons: [
        {
          src: '/favicon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: '/favicon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/manifest+json'
      }
    })
  }
}


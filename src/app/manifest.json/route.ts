import { NextResponse } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'

export async function GET() {
  try {
    // Vérifier quelles icônes sont disponibles
    // Priorité : 1) Icônes uploadées dans images/icons/ 2) Icônes dans public/
    const checkIcon = (iconPath: string): boolean => {
      return existsSync(path.join(process.cwd(), 'public', iconPath.replace(/^\//, '')))
    }
    
    // Déterminer les icônes à utiliser pour desktop
    // Priorité : 1) Icônes uploadées desktop dans images/icons/ 2) Icônes générées depuis Logo-Desktop dans public/
    let desktopIcon192 = '/favicon-192.png'
    let desktopIcon512 = '/favicon-512.png'
    
    // Vérifier d'abord les icônes uploadées desktop dans images/icons/
    // (générées depuis Logo-Desktop.png via l'upload ou le script)
    if (checkIcon('/images/icons/favicon-192.png')) {
      // Vérifier si c'est une icône desktop (générée depuis Logo-Desktop)
      // En vérifiant si icon-desktop-source.png existe
      if (checkIcon('/images/icons/icon-desktop-source.png')) {
        desktopIcon192 = '/images/icons/favicon-192.png'
      } else {
        // Sinon, utiliser les icônes dans public/ (générées depuis Logo-Desktop.png)
        desktopIcon192 = '/favicon-192.png'
      }
    } else if (checkIcon('/favicon-192.png')) {
      desktopIcon192 = '/favicon-192.png'
    }
    
    if (checkIcon('/images/icons/favicon-512.png')) {
      if (checkIcon('/images/icons/icon-desktop-source.png')) {
        desktopIcon512 = '/images/icons/favicon-512.png'
      } else {
        desktopIcon512 = '/favicon-512.png'
      }
    } else if (checkIcon('/favicon-512.png')) {
      desktopIcon512 = '/favicon-512.png'
    }
    
    const manifest = {
      name: 'OpenBTP',
      short_name: 'OpenBTP',
      description: 'Application de gestion de chantiers',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'any',
      icons: [
        {
          src: desktopIcon192,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: desktopIcon512,
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
    console.error('Erreur lors de la génération du manifest:', error)
    // Retourner un manifest par défaut en cas d'erreur
    return NextResponse.json({
      name: 'OpenBTP',
      short_name: 'OpenBTP',
      description: 'Application de gestion de chantiers',
      start_url: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'any',
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


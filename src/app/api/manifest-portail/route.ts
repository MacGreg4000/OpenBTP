import { NextRequest, NextResponse } from 'next/server'
import { existsSync } from 'fs'
import path from 'path'

/**
 * Manifest PWA pour le portail ouvrier/sous-traitant.
 * Accepte start_url en query pour que "Ajouter à l'écran d'accueil" enregistre
 * l'URL spécifique du sous-traitant/ouvrier (et non la page d'accueil desktop).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startUrl = searchParams.get('start_url') || '/'

    // Sécurité : start_url doit être une path valide (pas d'URL externe)
    const sanitized = startUrl.startsWith('/') && !startUrl.startsWith('//')
      ? startUrl
      : '/'

    const checkIcon = (iconPath: string): boolean =>
      existsSync(path.join(process.cwd(), 'public', iconPath.replace(/^\//, '')))

    let mobileIcon192 = '/favicon-192.png'
    let mobileIcon512 = '/favicon-512.png'
    if (checkIcon('/images/icons/favicon-192.png')) mobileIcon192 = '/images/icons/favicon-192.png'
    if (checkIcon('/images/icons/favicon-512.png')) mobileIcon512 = '/images/icons/favicon-512.png'

    const manifest = {
      name: 'OpenBTP Portail',
      short_name: 'OpenBTP',
      description: 'Portail ouvrier et sous-traitant',
      start_url: sanitized,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      orientation: 'portrait',
      icons: [
        { src: mobileIcon192, sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: mobileIcon512, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }

    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erreur manifest portail:', error)
    return NextResponse.json(
      { name: 'OpenBTP Portail', start_url: '/', display: 'standalone' },
      { headers: { 'Content-Type': 'application/manifest+json' } }
    )
  }
}

'use client'

// Photo OU vidéo de chantier, selon l'extension du fichier.
//  - vignette : première image de la vidéo + pastille « lecture »
//  - lecteur  : contrôles natifs (lecture en ligne sur iPhone)
// Remplace un <img> sans changer la mise en page : la classe est transmise.

import type { MouseEvent } from 'react'

const EXTENSIONS_VIDEO = ['.mp4', '.m4v', '.mov', '.webm', '.avi']

export function estVideo(url: string | null | undefined): boolean {
  const u = String(url || '').split(/[?#]/)[0].toLowerCase()
  return EXTENSIONS_VIDEO.some((ext) => u.endsWith(ext))
}

export default function MediaChantier({
  url,
  alt = 'Photo',
  className,
  mode = 'vignette',
  onClick,
}: {
  url: string
  alt?: string
  className?: string
  /** vignette : aperçu cliquable ; lecteur : vidéo lisible avec contrôles */
  mode?: 'vignette' | 'lecteur'
  onClick?: (e: MouseEvent<HTMLElement>) => void
}) {
  if (!estVideo(url)) {
    return <img src={url} alt={alt} className={className} onClick={onClick} />
  }

  if (mode === 'lecteur') {
    return <video src={url} controls playsInline preload="metadata" className={className} />
  }

  // « #t=0.1 » : force l'affichage de la première image (sinon noir sur iOS)
  return (
    <span className="relative block h-full w-full" onClick={onClick}>
      <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className={className} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white">
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </span>
  )
}

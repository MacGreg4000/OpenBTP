'use client'

// Menu déroulant affiché dans un portail (document.body), en position fixe sous
// son élément parent. Il n'est donc plus coupé par un conteneur en
// overflow-hidden (tableaux, cartes arrondies) et s'ouvre vers le haut quand la
// place manque en dessous. Remplace un <div className="absolute … mt-1"> placé
// dans un parent « relative » : le parent sert d'ancre.

import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

const ECART = 4

export default function MenuFlottant({
  children,
  className = '',
  alignement = 'gauche',
  largeurAncre = false,
  menuRef,
}: {
  children: ReactNode
  className?: string
  /** Bord du parent sur lequel s'aligne le menu */
  alignement?: 'gauche' | 'droite'
  /** Même largeur que le parent (listes de choix) */
  largeurAncre?: boolean
  /** Pour les « clic en dehors » qui testent contains() : le menu n'est plus dans le parent */
  menuRef?: RefObject<HTMLDivElement | null>
}) {
  const repere = useRef<HTMLSpanElement>(null)
  const menu = useRef<HTMLDivElement | null>(null)
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' })
  // Rendu dans le portail dès le premier rendu côté navigateur : les composants
  // qui donnent le focus à un champ du menu à l'ouverture le trouvent déjà monté.
  // (Les menus sont fermés au rendu serveur.)
  const navigateur = typeof document !== 'undefined'

  useLayoutEffect(() => {
    const placer = () => {
      const ancre = repere.current?.parentElement
      if (!ancre || !menu.current) return
      const r = ancre.getBoundingClientRect()
      const h = menu.current.offsetHeight
      const enDessous = window.innerHeight - r.bottom
      const versLeHaut = enDessous < h + ECART && r.top > enDessous
      const s: CSSProperties = {
        position: 'fixed',
        zIndex: 1000,
        top: versLeHaut ? Math.max(ECART, r.top - h - ECART) : r.bottom + ECART,
      }
      if (largeurAncre) {
        s.width = r.width
        s.left = r.left
      } else if (alignement === 'droite') {
        s.right = Math.max(ECART, window.innerWidth - r.right)
      } else {
        s.left = Math.max(ECART, Math.min(r.left, window.innerWidth - menu.current.offsetWidth - ECART))
      }
      setStyle(s)
    }
    placer()
    // Suivre l'ancre quand la page ou un conteneur défile, et le menu quand son
    // contenu change de taille (liste filtrée)
    window.addEventListener('scroll', placer, true)
    window.addEventListener('resize', placer)
    const observateur = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(placer) : null
    if (menu.current) observateur?.observe(menu.current)
    return () => {
      window.removeEventListener('scroll', placer, true)
      window.removeEventListener('resize', placer)
      observateur?.disconnect()
    }
  }, [alignement, largeurAncre])

  return (
    <>
      <span ref={repere} hidden />
      {navigateur &&
        createPortal(
          <div
            ref={(el) => {
              menu.current = el
              if (menuRef) (menuRef as { current: HTMLDivElement | null }).current = el
            }}
            style={style}
            className={className}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  )
}

'use client'

import { useEffect } from 'react'

export default function CustomIcons() {
  useEffect(() => {
    // Vérifier si les icônes personnalisées existent et les ajouter au head
    // Priorité : 1) Icônes générées depuis Logo-Desktop/Logo-Mobile dans public/ 
    //            2) Icônes uploadées dans images/icons/
    const checkAndAddIcons = async () => {
      const head = document.head

      // Vérifier d'abord les icônes dans public/ (générées depuis les logos)
      // Puis les icônes dans images/icons/ (uploadées via la page de configuration)
      const checkIcon = async (path: string): Promise<boolean> => {
        try {
          const res = await fetch(path, { method: 'HEAD' })
          return res.ok
        } catch {
          return false
        }
      }

      // Vérifier l'icône desktop - d'abord dans public/, puis dans images/icons/
      const desktopPaths = ['/favicon-192.png', '/images/icons/favicon-192.png']
      let desktopBasePath = null
      
      for (const path of desktopPaths) {
        if (await checkIcon(path)) {
          desktopBasePath = path.replace('/favicon-192.png', '')
          break
        }
      }

      if (desktopBasePath) {
        // Ajouter les icônes desktop personnalisées
        const sizes = [16, 32, 192, 512]
        sizes.forEach(size => {
          const href = `${desktopBasePath}/favicon-${size}.png`
          const link = document.createElement('link')
          link.rel = 'icon'
          link.type = 'image/png'
          link.sizes = `${size}x${size}`
          link.href = href
          // Vérifier si le lien n'existe pas déjà
          if (!document.querySelector(`link[href="${href}"]`)) {
            head.appendChild(link)
          }
        })
      }

      // Vérifier l'icône mobile - d'abord dans images/icons/ (uploadées), puis dans public/ (générées)
      const mobilePaths = ['/images/icons/apple-touch-icon.png', '/apple-touch-icon.png']
      let mobileBasePath = null
      
      for (const path of mobilePaths) {
        if (await checkIcon(path)) {
          mobileBasePath = path.replace('/apple-touch-icon.png', '')
          break
        }
      }

      if (mobileBasePath) {
        // Ajouter l'icône mobile personnalisée
        const link = document.createElement('link')
        link.rel = 'apple-touch-icon'
        link.sizes = '180x180'
        link.href = `${mobileBasePath}/apple-touch-icon.png`
        // Vérifier si le lien n'existe pas déjà
        if (!document.querySelector(`link[href="${mobileBasePath}/apple-touch-icon.png"]`)) {
          head.appendChild(link)
        }
        
        // Ajouter aussi les autres tailles pour mobile
        const mobileSizes = [192, 512]
        mobileSizes.forEach(size => {
          const href = `${mobileBasePath}/favicon-${size}.png`
          const link = document.createElement('link')
          link.rel = 'apple-touch-icon'
          link.sizes = `${size}x${size}`
          link.href = href
          if (!document.querySelector(`link[href="${href}"]`)) {
            head.appendChild(link)
          }
        })
      }
    }

    checkAndAddIcons()
  }, [])

  return null
}


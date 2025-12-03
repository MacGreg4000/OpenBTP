'use client'

import { useEffect } from 'react'

export default function CustomIcons() {
  useEffect(() => {
    // Vérifier si les icônes personnalisées existent et les ajouter au head
    const checkAndAddIcons = async () => {
      const head = document.head

      // Vérifier l'icône desktop
      try {
        const desktopRes = await fetch('/images/icons/favicon-192.png', { method: 'HEAD' })
        if (desktopRes.ok) {
          // Ajouter les icônes desktop personnalisées
          const sizes = [16, 32, 192, 512]
          sizes.forEach(size => {
            const link = document.createElement('link')
            link.rel = 'icon'
            link.type = 'image/png'
            link.sizes = `${size}x${size}`
            link.href = `/images/icons/favicon-${size}.png`
            // Vérifier si le lien n'existe pas déjà
            if (!document.querySelector(`link[href="/images/icons/favicon-${size}.png"]`)) {
              head.appendChild(link)
            }
          })
        }
      } catch (e) {
        // Les icônes personnalisées n'existent pas, on utilise les icônes par défaut
      }

      // Vérifier l'icône mobile
      try {
        const mobileRes = await fetch('/images/icons/apple-touch-icon.png', { method: 'HEAD' })
        if (mobileRes.ok) {
          // Ajouter l'icône mobile personnalisée
          const link = document.createElement('link')
          link.rel = 'apple-touch-icon'
          link.sizes = '180x180'
          link.href = '/images/icons/apple-touch-icon.png'
          // Vérifier si le lien n'existe pas déjà
          if (!document.querySelector('link[href="/images/icons/apple-touch-icon.png"]')) {
            head.appendChild(link)
          }
          
          // Ajouter aussi les autres tailles pour mobile
          const mobileSizes = [192, 512]
          mobileSizes.forEach(size => {
            const link = document.createElement('link')
            link.rel = 'apple-touch-icon'
            link.sizes = `${size}x${size}`
            link.href = `/images/icons/favicon-${size}.png`
            if (!document.querySelector(`link[href="/images/icons/favicon-${size}.png"]`)) {
              head.appendChild(link)
            }
          })
        }
      } catch (e) {
        // Les icônes personnalisées n'existent pas, on utilise les icônes par défaut
      }
    }

    checkAndAddIcons()
  }, [])

  return null
}


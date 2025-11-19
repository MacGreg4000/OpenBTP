/**
 * Compresse et redimensionne une image avant l'upload
 * @param file - Le fichier image à compresser
 * @param maxWidth - Largeur maximale en pixels (défaut: 1920)
 * @param maxHeight - Hauteur maximale en pixels (défaut: 1920)
 * @param quality - Qualité de compression entre 0 et 1 (défaut: 0.8)
 * @returns Promise<File> - Le fichier compressé
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    // Vérifier que c'est bien une image
    if (!file.type.startsWith('image/')) {
      resolve(file) // Retourner le fichier tel quel si ce n'est pas une image
      return
    }

    const reader = new FileReader()
    
    reader.onload = (e) => {
      const img = new Image()
      
      img.onload = () => {
        // Calculer les nouvelles dimensions en conservant le ratio
        let width = img.width
        let height = img.height
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }
        
        // Créer un canvas pour redimensionner et compresser
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Impossible de créer le contexte canvas'))
          return
        }
        
        // Dessiner l'image redimensionnée
        ctx.drawImage(img, 0, 0, width, height)
        
        // Convertir en blob avec compression
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Erreur lors de la compression'))
              return
            }
            
            // Créer un nouveau File avec le blob compressé
            const compressedFile = new File(
              [blob],
              file.name,
              {
                type: file.type,
                lastModified: Date.now()
              }
            )
            
            // Si le fichier compressé est plus grand que l'original, retourner l'original
            if (compressedFile.size >= file.size) {
              console.log('La compression n\'a pas réduit la taille, utilisation du fichier original')
              resolve(file)
            } else {
              console.log(`Image compressée: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
              resolve(compressedFile)
            }
          },
          file.type,
          quality
        )
      }
      
      img.onerror = () => {
        reject(new Error('Erreur lors du chargement de l\'image'))
      }
      
      img.src = e.target?.result as string
    }
    
    reader.onerror = () => {
      reject(new Error('Erreur lors de la lecture du fichier'))
    }
    
    reader.readAsDataURL(file)
  })
}

/**
 * Compresse plusieurs images en parallèle
 * @param files - Tableau de fichiers à compresser
 * @param maxWidth - Largeur maximale en pixels (défaut: 1920)
 * @param maxHeight - Hauteur maximale en pixels (défaut: 1920)
 * @param quality - Qualité de compression entre 0 et 1 (défaut: 0.8)
 * @returns Promise<File[]> - Tableau de fichiers compressés
 */
export async function compressImages(
  files: File[],
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<File[]> {
  const compressionPromises = files.map(file => compressImage(file, maxWidth, maxHeight, quality))
  return Promise.all(compressionPromises)
}


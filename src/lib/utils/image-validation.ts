/**
 * Validation sécurisée des fichiers image par lecture des magic bytes.
 *
 * Le Content-Type HTTP est fourni par le client et peut être falsifié :
 * un attaquant peut uploader un fichier PHP/Shell avec Content-Type: image/jpeg.
 * La lecture des magic bytes (premiers octets réels du fichier) est la seule
 * vérification fiable côté serveur.
 */

export interface ImageValidationResult {
  isValid: boolean
  safeExtension: 'jpg' | 'png' | 'webp' | 'heic' | null
}

/**
 * Valide un objet File en lisant ses magic bytes réels.
 * Retourne l'extension sécurisée basée sur le contenu réel, jamais sur le nom du fichier.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // Première barrière : Content-Type client (rapide, mais non fiable seule)
  // On accepte les fichiers avec type vide (certains appareils photo Android/iOS renvoient "")
  if (file.type && !file.type.startsWith('image/')) {
    return { isValid: false, safeExtension: null }
  }

  // Lire les 12 premiers octets pour inspecter les magic bytes
  const slice = file.slice(0, 12)
  const bytes = await slice.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const isJPEG = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  const isPNG  = buffer[0] === 0x89 && buffer[1] === 0x50 &&
                 buffer[2] === 0x4E && buffer[3] === 0x47
  const isWEBP = buffer.length >= 12 &&
                 buffer.slice(8, 12).toString('ascii') === 'WEBP'

  // HEIC/HEIF : fichiers ISOBMFF (bytes 4-7 = 'ftyp')
  // Brands acceptés : heic, heif, mif1, msf1 (standard) + hei1, heis, heix (iPhone)
  const isFtyp = buffer.length >= 8 &&
                 buffer.slice(4, 8).toString('ascii') === 'ftyp'
  const majorBrand = buffer.length >= 12
    ? buffer.slice(8, 12).toString('ascii').toLowerCase()
    : ''
  const heicBrands = ['heic', 'heif', 'mif1', 'msf1', 'hei1', 'heis', 'heix']
  const isHEIC = isFtyp && heicBrands.includes(majorBrand)

  if (!isJPEG && !isPNG && !isWEBP && !isHEIC) {
    console.warn(`⚠️ Fichier rejeté (magic bytes invalides): ${file.name} type=${file.type} brand=${majorBrand}`)
    return { isValid: false, safeExtension: null }
  }

  const safeExtension = isJPEG ? 'jpg' : isPNG ? 'png' : isWEBP ? 'webp' : 'heic'
  return { isValid: true, safeExtension }
}

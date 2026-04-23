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
  safeExtension: 'jpg' | 'png' | 'webp' | 'heic' | 'avif' | null
}

/**
 * Logique interne de détection par magic bytes (partagée).
 * Reçoit les 12 premiers octets du fichier.
 */
function _checkMagicBytes(header: Buffer, fileName: string = ''): ImageValidationResult {
  const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF
  const isPNG  = header[0] === 0x89 && header[1] === 0x50 &&
                 header[2] === 0x4E && header[3] === 0x47
  const isWEBP = header.length >= 12 &&
                 header.slice(8, 12).toString('ascii') === 'WEBP'

  // ISOBMFF (HEIC, HEIF, AVIF…) : bytes 4-7 = 'ftyp'
  const isFtyp = header.length >= 8 &&
                 header.slice(4, 8).toString('ascii') === 'ftyp'
  const majorBrand = header.length >= 12
    ? header.slice(8, 12).toString('ascii').toLowerCase().trim()
    : ''

  // HEIC/HEIF : brands Apple (standard + variantes iOS récentes)
  // hev1/hevc = iOS 17+, mp41/mp42 = certains appareils Android
  const heicBrands = ['heic', 'heif', 'mif1', 'msf1', 'hei1', 'heis', 'heix', 'hev1', 'hevc', 'mp41', 'mp42']
  const isHEIC = isFtyp && heicBrands.includes(majorBrand)

  // AVIF : format moderne Android/Chrome
  const avifBrands = ['avif', 'avis', 'avci', 'av01']
  const isAVIF = isFtyp && avifBrands.includes(majorBrand)

  if (!isJPEG && !isPNG && !isWEBP && !isHEIC && !isAVIF) {
    console.warn(`⚠️ Fichier rejeté (format non supporté): ${fileName} brand="${majorBrand}"`)
    return { isValid: false, safeExtension: null }
  }

  const safeExtension = isJPEG ? 'jpg' : isPNG ? 'png' : isWEBP ? 'webp' : isAVIF ? 'avif' : 'heic'
  return { isValid: true, safeExtension }
}

/**
 * Valide un Buffer déjà lu en mémoire via ses magic bytes.
 * ✅ Version recommandée pour les routes API — évite tout problème de stream.
 */
export function validateImageBuffer(buffer: Buffer, fileType: string = '', fileName: string = ''): ImageValidationResult {
  if (fileType && !fileType.startsWith('image/')) {
    return { isValid: false, safeExtension: null }
  }
  return _checkMagicBytes(buffer.subarray(0, 12), fileName)
}

/**
 * Valide un objet File en lisant ses magic bytes réels.
 * ⚠️ Ne pas utiliser quand le Buffer complet doit être lu ensuite —
 *    utiliser validateImageBuffer() à la place pour éviter une double lecture.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  if (file.type && !file.type.startsWith('image/')) {
    return { isValid: false, safeExtension: null }
  }

  const slice = file.slice(0, 12)
  const bytes = await slice.arrayBuffer()
  return _checkMagicBytes(Buffer.from(bytes), file.name)
}

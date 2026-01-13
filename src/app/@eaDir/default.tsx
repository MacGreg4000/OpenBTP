// Fichier fallback pour le dossier système Synology @eaDir
// Next.js détecte ce dossier comme une "parallel route" alors que c'est juste un dossier de métadonnées
// Ce fichier est nécessaire pour éviter l'erreur de build

export default function DefaultEaDir() {
  return null
}

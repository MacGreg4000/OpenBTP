// Police Inter embarquée dans le HTML des PDF.
//
// Les modèles importaient Inter depuis fonts.googleapis.com : Chrome attend le
// chargement des polices avant d'imprimer, donc chaque PDF dépendait d'un
// aller-retour vers Google depuis le NAS (DNS, réseau) — parfois 1 s, parfois
// plusieurs dizaines. On remplace cet @import par la police locale en base64 :
// aucune requête réseau, rendu identique à chaque fois.

import fs from 'fs'
import path from 'path'

const IMPORT_GOOGLE = /@import\s+url\(\s*['"]?https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^)]*\)\s*;?/g

let fontFaceCache: string | null = null

function lirePolice(fichier: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'public', 'fonts', 'inter', fichier)).toString('base64')
  } catch {
    return null
  }
}

/** @font-face Inter (400 pour les graisses fines, 600 pour les grasses), mis en cache. */
function fontFaceInter(): string {
  if (fontFaceCache !== null) return fontFaceCache
  const normal = lirePolice('inter-latin-400.woff2')
  const gras = lirePolice('inter-latin-600.woff2')
  const face = (b64: string, plage: string) =>
    `@font-face{font-family:'Inter';font-style:normal;font-weight:${plage};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`
  fontFaceCache = [normal && face(normal, '100 450'), gras && face(gras, '451 900')].filter(Boolean).join('\n')
  return fontFaceCache
}

/**
 * Remplace l'import Google Fonts d'Inter par la police embarquée. Sans fichier
 * local, l'import est simplement retiré : les modèles retombent sur leurs
 * polices de secours (-apple-system, Segoe UI, Roboto, sans-serif).
 */
export function embarquerPolices(html: string): string {
  if (!html.includes('fonts.googleapis.com')) return html
  return html.replace(IMPORT_GOOGLE, () => fontFaceInter())
}

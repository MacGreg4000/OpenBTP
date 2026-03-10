import { evaluate } from 'mathjs'

/**
 * Évalue une expression numérique ou une formule préfixée par "=".
 * Retourne null si la valeur est vide ou invalide.
 *
 * Exemples :
 *   "=5+6+8"          → 19
 *   "=(2.5+1.5)*4"    → 16
 *   "=10/3"           → 3.3333
 *   "42"              → 42
 *   "3,14"            → 3.14  (virgule acceptée)
 */
export function evaluateFormula(raw: string): number | null {
  const trimmed = (raw ?? '').trim()
  if (trimmed === '' || trimmed === '-' || trimmed === '.') return null

  if (trimmed.startsWith('=')) {
    const expression = trimmed.slice(1).trim()
    if (!expression) return null
    try {
      const result = evaluate(expression)
      if (typeof result === 'number' && isFinite(result)) {
        // Arrondir à 4 décimales pour éviter les flottants parasites
        return Math.round(result * 10000) / 10000
      }
      return null
    } catch {
      return null
    }
  }

  // Valeur numérique classique (accepte virgule comme séparateur décimal)
  const normalized = trimmed.replace(',', '.')
  const n = parseFloat(normalized)
  return isNaN(n) ? null : n
}

/** Retourne true si la chaîne ressemble à une formule */
export function isFormula(raw: string): boolean {
  return (raw ?? '').trim().startsWith('=')
}

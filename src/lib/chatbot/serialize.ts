// Sérialisation des résultats d'outils pour le LLM
// Dates lisibles, pas de null, pas de base64, taille bornée.

const MAX_RESULT_CHARS = 4000

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return hasTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date
}

export function toToolJSON(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (value instanceof Date) return formatDate(value)
  if (typeof value === 'bigint') return Number(value)
  if (Array.isArray(value)) {
    return value.map(toToolJSON).filter((v) => v !== undefined)
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // jamais de base64 / data URI vers le modèle (signatures, images)
      if (typeof v === 'string' && (v.startsWith('data:') || v.length > 2000)) {
        out[k] = `${v.slice(0, 200)}… [tronqué]`
        continue
      }
      const converted = toToolJSON(v)
      if (converted !== undefined) out[k] = converted
    }
    return out
  }
  return value
}

/** Stringify + borne la taille pour ne pas exploser le contexte du modèle. */
export function serializeToolResult(value: unknown, maxChars: number = MAX_RESULT_CHARS): string {
  let json: string
  try {
    json = JSON.stringify(toToolJSON(value))
  } catch {
    json = JSON.stringify({ erreur: 'Résultat non sérialisable' })
  }
  if (json.length <= maxChars) return json
  return JSON.stringify({
    _truncated: true,
    _info: `Résultat tronqué (${json.length} caractères). Affinez la recherche ou réduisez limit.`,
    apercu: json.slice(0, maxChars),
  })
}

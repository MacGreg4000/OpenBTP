import { NextResponse } from 'next/server'

export type PortalSession = { t: 'OUVRIER_INTERNE' | 'SOUSTRAITANT' | 'MAGASINIER'; id: string }

export function readPortalSessionFromCookie(cookieHeader: string | null): PortalSession | null {
  if (!cookieHeader) return null
  const m = /portalSession=([^;]+)/.exec(cookieHeader)
  if (!m) return null
  try {
    const raw = decodeURIComponent(m[1])
    // Format: TYPE:ID
    const [t, id] = raw.split(':')
    if ((t === 'OUVRIER_INTERNE' || t === 'SOUSTRAITANT' || t === 'MAGASINIER') && id) {
      return { t: t as PortalSession['t'], id }
    }
    return null
  } catch {
    return null
  }
}

/** Récupère l'ID magasinier depuis le cookie (pour les routes portail magasinier) */
export function getMagasinierIdFromCookie(cookieHeader: string | null): string | null {
  const session = readPortalSessionFromCookie(cookieHeader)
  return session?.t === 'MAGASINIER' ? session.id : null
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}


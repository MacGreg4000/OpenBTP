import { NextResponse } from 'next/server'

export type PortalSession = { t: 'OUVRIER_INTERNE' | 'SOUSTRAITANT'; id: string }

export function readPortalSessionFromCookie(cookieHeader: string | null): PortalSession | null {
  if (!cookieHeader) return null
  const m = /portalSession=([^;]+)/.exec(cookieHeader)
  if (!m) return null
  try {
    const raw = decodeURIComponent(m[1])
    // Format: TYPE:ID
    const [t, id] = raw.split(':')
    if ((t === 'OUVRIER_INTERNE' || t === 'SOUSTRAITANT') && id) return { t: t as 'OUVRIER_INTERNE' | 'SOUSTRAITANT', id }
    return null
  } catch {
    return null
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}


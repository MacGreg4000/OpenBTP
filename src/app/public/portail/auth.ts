import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'

export type PortalSession = { t: 'OUVRIER_INTERNE' | 'SOUSTRAITANT' | 'MAGASINIER'; id: string }

function getHmacSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET manquant')
  return secret
}

function computeHmac(payload: string): string {
  return createHmac('sha256', getHmacSecret()).update(payload).digest('hex')
}

/** Crée une valeur de cookie signée : TYPE:id.hmac */
export function signPortalSession(t: PortalSession['t'], id: string): string {
  const payload = `${t}:${id}`
  const hmac = computeHmac(payload)
  return `${payload}.${hmac}`
}

export function readPortalSessionFromCookie(cookieHeader: string | null): PortalSession | null {
  if (!cookieHeader) return null
  const m = /portalSession=([^;]+)/.exec(cookieHeader)
  if (!m) return null
  try {
    const raw = decodeURIComponent(m[1])
    // Format signé: TYPE:id.hmac
    const lastDot = raw.lastIndexOf('.')
    if (lastDot === -1) return null
    const payload = raw.slice(0, lastDot)
    const providedHmac = raw.slice(lastDot + 1)
    // Vérification HMAC en temps constant (résistant aux timing attacks)
    const expectedHmac = computeHmac(payload)
    const provided = Buffer.from(providedHmac, 'hex')
    const expected = Buffer.from(expectedHmac, 'hex')
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return null
    }
    const [t, id] = payload.split(':')
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


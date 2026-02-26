import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

export type JournalAuthResult =
  | { allowed: true; isOwner: boolean }
  | { allowed: false; status: 401 | 403 }

/**
 * Vérifie l'authentification pour les routes journal (entrée individuelle).
 * isOwner=true => soumis aux règles de modification (48h).
 */
export async function checkJournalEntryAuth(
  request: Request,
  ouvrierIdOfEntry: string
): Promise<JournalAuthResult> {
  const session = await getServerSession(authOptions)

  if (session) {
    if (session.user.role === 'ADMIN' || session.user.role === 'MANAGER') {
      return { allowed: true, isOwner: false }
    }
    if (session.user.role === 'OUVRIER_INTERNE' && session.user.id === ouvrierIdOfEntry) {
      return { allowed: true, isOwner: true }
    }
    return { allowed: false, status: 403 }
  }

  const portalSession = readPortalSessionFromCookie(request.headers.get('cookie'))
  if (portalSession && (portalSession.t === 'OUVRIER_INTERNE' || portalSession.t === 'MAGASINIER')) {
    if (portalSession.id === ouvrierIdOfEntry) {
      return { allowed: true, isOwner: true }
    }
    return { allowed: false, status: 403 }
  }

  return { allowed: false, status: 401 }
}

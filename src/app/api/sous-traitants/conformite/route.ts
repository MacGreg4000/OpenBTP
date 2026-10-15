// Tableau de conformité documentaire des sous-traitants (page « Documents
// des sous-traitants ») : personnes × types de documents.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { conformiteSousTraitants } from '@/lib/documents/conformite'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const url = new URL(request.url)
  const societes = await conformiteSousTraitants({ inclureInactifs: url.searchParams.get('inactifs') === '1' })
  return NextResponse.json({ societes })
}

// Recopie sur le NAS les documents en vigueur pas encore présents dans le
// miroir (premier démarrage, NAS momentanément indisponible…). ADMIN.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resynchroniserMiroirNas } from '@/lib/documents/stockage'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (session?.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })
  const r = await resynchroniserMiroirNas()
  if (!r.actif) return NextResponse.json({ error: 'Miroir NAS non configuré (NAS_DOCUMENTS_HOST_PATH dans .env).' }, { status: 409 })
  return NextResponse.json(r)
}

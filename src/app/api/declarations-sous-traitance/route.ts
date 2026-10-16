import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listerRegistre } from '@/lib/declarations/sous-traitance'

/** Registre des déclarations de sous-traitance : ?chantierId= &soustraitantId= */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const sp = new URL(request.url).searchParams
  const entrees = await listerRegistre({
    chantierId: sp.get('chantierId') || undefined,
    soustraitantId: sp.get('soustraitantId') || undefined,
  })
  return NextResponse.json({ entrees })
}

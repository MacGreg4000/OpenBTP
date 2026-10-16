import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

/** Mail exact d'une déclaration du registre (affiché tel qu'envoyé). */
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { id } = await props.params
  const d = await prisma.declarationSousTraitance.findUnique({ where: { id: Number(id) || 0 } })
  if (!d) return NextResponse.json({ error: 'Déclaration introuvable' }, { status: 404 })
  return new NextResponse(d.contenuHtml, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Le HTML est le nôtre, mais on l'isole quand même : aucun script, aucune ressource externe
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  })
}

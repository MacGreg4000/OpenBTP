import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function PUT(req: NextRequest) {
  const body: { id: string; ordre: number }[] = await req.json()
  await prisma.$transaction(
    body.map(({ id, ordre }) =>
      prisma.ligneTarifSousTraitant.update({ where: { id }, data: { ordre } })
    )
  )
  return NextResponse.json({ ok: true })
}

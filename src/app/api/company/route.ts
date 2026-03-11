import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  try {
    const c = await prisma.companysettings.findFirst()
    if (!c) return NextResponse.json({}, { status: 200 })
    return NextResponse.json({
      name: c.name,
      address: c.address,
      zipCode: c.zipCode,
      city: c.city,
      phone: c.phone,
      email: c.email,
      tva: c.tva,
      iban: c.iban,
      logo: c.logo || null,
      logoSquare: c.logoSquare || null,
    })
  } catch {
    return NextResponse.json({ error: 'Erreur récupération société' }, { status: 500 })
  }
}


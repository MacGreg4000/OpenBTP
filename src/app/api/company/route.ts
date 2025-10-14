import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

export async function GET() {
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
    })
  } catch {
    return NextResponse.json({ error: 'Erreur récupération société' }, { status: 500 })
  }
}


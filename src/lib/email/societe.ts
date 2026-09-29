// Coordonnées de la société pour l'en-tête et le pied des emails (gabarit.ts).

import { prisma } from '@/lib/prisma/client'

export async function societeEmail(): Promise<{ nom: string; adresse?: string; tva?: string }> {
  try {
    const s = await prisma.companysettings.findFirst({
      select: { name: true, address: true, zipCode: true, city: true, tva: true },
    })
    if (!s) return { nom: 'OpenBTP' }
    const ville = [s.zipCode, s.city].filter(Boolean).join(' ')
    return {
      nom: s.name || 'OpenBTP',
      adresse: [s.address, ville].filter(Boolean).join(', ') || undefined,
      tva: s.tva || undefined,
    }
  } catch {
    return { nom: 'OpenBTP' }
  }
}

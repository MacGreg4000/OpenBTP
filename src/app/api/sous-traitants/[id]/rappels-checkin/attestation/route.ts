// Export PDF « Attestation de rappels » d'un sous-traitant sur une période.
// ?du=AAAA-MM-JJ&au=AAAA-MM-JJ — par défaut : du premier rappel à aujourd'hui.

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { construireAttestationHtml } from '@/lib/checkin/attestation'
import { maintenantBruxelles } from '@/lib/checkin/envoi'

const DATE = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { id } = await context.params
  const st = await prisma.soustraitant.findUnique({
    where: { id },
    select: { nom: true, tva: true, representantPrenom: true, representantNom: true, representantFonction: true },
  })
  if (!st) return NextResponse.json({ error: 'Sous-traitant introuvable' }, { status: 404 })

  const url = new URL(request.url)
  const aujourdhui = maintenantBruxelles().date
  let au = url.searchParams.get('au') || aujourdhui
  let du = url.searchParams.get('du') || ''
  if (!du) {
    const premier = await prisma.rappelCheckinLog.findFirst({
      where: { soustraitantId: id, modeTest: false },
      orderBy: { dateRappel: 'asc' },
      select: { dateRappel: true },
    })
    du = premier?.dateRappel || au
  }
  if (!DATE.test(du) || !DATE.test(au)) {
    return NextResponse.json({ error: 'Dates au format AAAA-MM-JJ' }, { status: 400 })
  }
  if (du > au) [du, au] = [au, du]

  const [lignes, settings] = await Promise.all([
    prisma.rappelCheckinLog.findMany({
      where: { soustraitantId: id, modeTest: false, dateRappel: { gte: du, lte: au } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.companysettings.findFirst(),
  ])

  const representant = [st.representantPrenom, st.representantNom].filter(Boolean).join(' ')
  const html = construireAttestationHtml({
    societe: {
      nom: settings?.name || '',
      adresse: [settings?.address, [settings?.zipCode, settings?.city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
      tva: settings?.tva || '',
      logo: settings?.logo ? await PDFGenerator.getImageAsBase64(settings.logo) : null,
    },
    soustraitant: {
      nom: st.nom,
      tva: st.tva,
      representant: representant ? `${representant}${st.representantFonction ? `, ${st.representantFonction}` : ''}` : null,
    },
    du,
    au,
    lignes,
    editeLe: new Date(),
  })

  const pdf = await PDFGenerator.generatePDF(html, { format: 'A4' })
  const nomFichier = `Attestation_rappels_${st.nom.replace(/[^\w-]+/g, '_')}_${du}_${au}.pdf`
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${nomFichier}"`,
    },
  })
}

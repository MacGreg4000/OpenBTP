import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { notifier } from '@/lib/services/notificationService'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  try {
    const session = await getServerSession(authOptions)
    
    const metre = await prisma.metreSoustraitant.update({
      where: { id },
      data: { statut: 'VALIDE' },
      include: { 
        lignes: true,
        chantier: { select: { chantierId: true, nomChantier: true } },
        soustraitant: { select: { id: true, nom: true } }
      }
    })

    // TODO: Intégrer dans soustraitant_etat_avancement (lignes/avenants) selon logique métier

    // 🔔 NOTIFICATION : Métré validé
    await notifier({
      code: 'METRE_VALIDE',
      destinataires: [], // Sera envoyé au sous-traitant via email
      metadata: {
        chantierId: metre.chantierId,
        chantierNom: metre.chantier.nomChantier,
        soustraitantId: metre.soustraitantId,
        soustraitantNom: metre.soustraitant.nom,
        metreId: metre.id,
        userName: session?.user?.name || 'Un administrateur',
      },
    })

    return NextResponse.json(metre)
  } catch {
    return NextResponse.json({ error: 'Validation impossible' }, { status: 400 })
  }
}

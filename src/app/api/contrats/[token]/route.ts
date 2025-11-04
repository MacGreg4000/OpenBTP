import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'

// Fonction pour obtenir l'adresse IP du client
function getClientIP(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip') // Cloudflare
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  return null
}

export async function GET(request: NextRequest, props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  try {
    const contrat = await prisma.contrat.findUnique({
      where: { token: params.token },
      include: {
        soustraitant: {
          select: {
            id: true,
            nom: true,
            email: true,
            contact: true
          }
        }
      }
    })
    
    if (!contrat) {
      return NextResponse.json(
        { error: 'Contrat non trouvé ou déjà signé' },
        { status: 404 }
      )
    }
    
    if (contrat.estSigne) {
      return NextResponse.json(
        { error: 'Ce contrat a déjà été signé' },
        { status: 400 }
      )
    }

    // Enregistrer l'action de consultation dans le journal d'audit
    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || null
    
    try {
      await prisma.contratSignatureAudit.create({
        data: {
          contratId: contrat.id,
          action: 'CONSULTATION',
          ipAddress,
          userAgent,
          emailSignataire: contrat.soustraitant.email,
          nomSignataire: contrat.soustraitant.nom,
          details: JSON.stringify({ timestamp: new Date().toISOString() })
        }
      })
    } catch (auditError) {
      // Ne pas bloquer la récupération du contrat en cas d'erreur d'audit
      console.error('Erreur lors de l\'enregistrement de l\'audit de consultation:', auditError)
    }
    
    return NextResponse.json(contrat)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du contrat' },
      { status: 500 }
    )
  }
} 
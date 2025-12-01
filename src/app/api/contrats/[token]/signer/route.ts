import { NextRequest, NextResponse } from 'next/server'
import { signerContrat } from '@/lib/contract-generator-simple'
import { prisma } from '@/lib/prisma/client'
import { notifier } from '@/lib/services/notificationService'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { signature, identityConfirmed, consentGiven } = body
    
    console.log(`Demande de signature pour le token: ${token}`)
    console.log(`Taille de la signature base64: ${signature ? signature.length : 'non fournie'} caractères`)
    
    if (!signature) {
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 })
    }

    if (!identityConfirmed || !consentGiven) {
      return NextResponse.json({ error: "Consentement et confirmation d'identité requis" }, { status: 400 })
    }
    
    // Récupérer les informations d'audit
    const ipAddress = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || null
    
    // Récupérer le contrat pour obtenir les informations du signataire
    const contrat = await prisma.contrat.findUnique({
      where: { token },
      include: { soustraitant: true }
    })

    if (!contrat) {
      return NextResponse.json({ error: "Contrat non trouvé" }, { status: 404 })
    }

    // Horodatage certifié (timestamp de la signature)
    const horodatageCertifie = new Date()
    
    // Enregistrer les actions d'audit avant la signature
    await prisma.contratSignatureAudit.createMany({
      data: [
        {
          contratId: contrat.id,
          action: 'CONSULTATION',
          ipAddress,
          userAgent,
          emailSignataire: contrat.soustraitant.email,
          nomSignataire: contrat.soustraitant.nom,
          details: JSON.stringify({ timestamp: new Date().toISOString() })
        },
        {
          contratId: contrat.id,
          action: 'CONSENTEMENT',
          ipAddress,
          userAgent,
          emailSignataire: contrat.soustraitant.email,
          nomSignataire: contrat.soustraitant.nom,
          details: JSON.stringify({ 
            identityConfirmed,
            consentGiven,
            timestamp: new Date().toISOString()
          })
        }
      ]
    })
    
    // Signer le contrat avec les informations d'audit
    const contratUrl = await signerContrat(
      token, 
      signature, 
      {
        ipAddress,
        userAgent,
        identityConfirmed,
        consentGiven,
        horodatageCertifie
      }
    )
    
    // Enregistrer l'action de signature dans le journal d'audit
    await prisma.contratSignatureAudit.create({
      data: {
        contratId: contrat.id,
        action: 'SIGNATURE',
        ipAddress,
        userAgent,
        emailSignataire: contrat.soustraitant.email,
        nomSignataire: contrat.soustraitant.nom,
        details: JSON.stringify({
          horodatageCertifie: horodatageCertifie.toISOString(),
          identityConfirmed,
          consentGiven,
          signatureLength: signature.length
        })
      }
    })
    
    console.log(`Contrat signé avec succès, URL: ${contratUrl}`)
    console.log(`Audit enregistré - IP: ${ipAddress}, User-Agent: ${userAgent?.substring(0, 50)}...`)
    
    // 🔔 NOTIFICATION : Contrat signé
    await notifier({
      code: 'CONTRAT_SIGNE',
      rolesDestinataires: ['ADMIN'],
      metadata: {
        soustraitantId: contrat.soustraitant.id,
        soustraitantNom: contrat.soustraitant.nom,
      },
    })
    
    return NextResponse.json({ url: contratUrl })
  } catch (error) {
    console.error("Erreur lors de la signature du contrat:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Une erreur est survenue" },
      { status: 500 }
    )
  }
} 
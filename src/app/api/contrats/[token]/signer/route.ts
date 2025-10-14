import { NextResponse } from 'next/server'
import { signerContrat } from '@/lib/contract-generator-simple'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { signature } = await request.json()
    
    console.log(`Demande de signature pour le token: ${token}`)
    console.log(`Taille de la signature base64: ${signature ? signature.length : 'non fournie'} caractères`)
    
    if (!signature) {
      return NextResponse.json({ error: "Signature manquante" }, { status: 400 })
    }
    
    const contratUrl = await signerContrat(token, signature)
    console.log(`Contrat signé avec succès, URL: ${contratUrl}`)
    
    return NextResponse.json({ url: contratUrl })
  } catch (error) {
    console.error("Erreur lors de la signature du contrat:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Une erreur est survenue" },
      { status: 500 }
    )
  }
} 
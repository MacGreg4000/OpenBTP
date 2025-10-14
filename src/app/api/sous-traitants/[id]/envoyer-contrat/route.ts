import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendContractSignatureEmail } from '@/lib/email-sender'
import { generateContratSoustraitance } from '@/lib/contract-generator-simple'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    // Extraire l'ID du sous-traitant
    const { id } = (await context.params)
    
    // Récupérer le sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id }
    })
    
    if (!soustraitant) {
      return NextResponse.json({ error: 'Sous-traitant non trouvé' }, { status: 404 })
    }
    
    if (!soustraitant.email) {
      return NextResponse.json({ error: 'Le sous-traitant n\'a pas d\'adresse email' }, { status: 400 })
    }
    
    // Vérifier si un contrat existe déjà pour ce sous-traitant
    const existingContract = await prisma.contrat.findFirst({
      where: { 
        soustraitantId: id,
        estSigne: false
      }
    })
    
    let token: string
    
    if (existingContract && existingContract.token) {
      // Utiliser le contrat existant
      // url déjà présente sur le contrat existant
      token = existingContract.token
    } else {
      // Générer un nouveau contrat
      await generateContratSoustraitance(id, session.user.id)
      
      // Récupérer le token du contrat nouvellement créé
      const newContract = await prisma.contrat.findFirst({
        where: { 
          soustraitantId: id,
          estSigne: false
        },
        orderBy: {
          dateGeneration: 'desc'
        }
      })
      
      if (!newContract || !newContract.token) {
        return NextResponse.json({ error: 'Erreur lors de la génération du contrat' }, { status: 500 })
      }
      
      token = newContract.token
    }
    
    // Récupérer les informations de l'entreprise
    const companySettings = await prisma.companysettings.findFirst()
    const companyName = companySettings?.name || 'Secotech'
    
    // Envoyer l'email
    const emailSent = await sendContractSignatureEmail(
      soustraitant.email,
      soustraitant.nom,
      companyName,
      token
    )
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, message: 'Email envoyé avec succès' })
  } catch (error: unknown) {
    console.error('Erreur lors de l\'envoi du contrat:', error)
    return NextResponse.json(
      { error: `Erreur lors de l'envoi du contrat` },
      { status: 500 }
    )
  }
} 
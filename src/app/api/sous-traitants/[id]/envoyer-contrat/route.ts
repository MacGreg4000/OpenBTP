import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendContractSignatureEmail } from '@/lib/email-sender'
import { generateContratSoustraitance } from '@/lib/contrat-generator'
import { ContratIncompletError } from '@/lib/contract-generator-puppeteer'
import { champsRepresentantManquants } from '@/lib/soustraitants/representant'
import { notifier } from '@/lib/services/notificationService'

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

    // Contrat-cadre v2 : pas d'envoi en signature sans représentant complet —
    // y compris quand un ancien contrat non signé serait simplement renvoyé.
    const manquants = champsRepresentantManquants(soustraitant)
    if (manquants.length > 0) {
      return NextResponse.json(
        { error: `Contrat non envoyé — à compléter sur la fiche du sous-traitant : ${manquants.join(', ')}.` },
        { status: 400 }
      )
    }
    
    // Réutiliser un contrat non signé existant — mais seulement s'il a été
    // généré avec le template actuellement actif. Un ancien contrat (v1, sans
    // représentant ni nouvelles clauses) ne doit pas repartir en signature
    // après l'activation d'un nouveau template : on en génère un neuf.
    const templateActif = await prisma.contractTemplate.findFirst({
      where: { isActive: true, category: 'CONTRAT' },
      select: { name: true },
    })
    const existingContract = await prisma.contrat.findFirst({
      where: {
        soustraitantId: id,
        estSigne: false,
        templateVersion: templateActif?.name ?? '__aucun__',
      },
      orderBy: { dateGeneration: 'desc' },
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
    
    // Toujours envoyer une copie à l'adresse principale de l'entreprise
    // (emailCc configuré dans les paramètres sera aussi ajouté automatiquement)
    const companyEmail = companySettings?.email || undefined
    
    // Envoyer l'email avec copie à l'adresse principale de l'entreprise
    // Le lien de signature va au représentant — c'est lui qui signe.
    const emailSent = await sendContractSignatureEmail(
      soustraitant.representantEmail || soustraitant.email,
      soustraitant.nom,
      companyName,
      token,
      companyEmail
    )
    
    if (!emailSent) {
      return NextResponse.json({ error: 'Erreur lors de l\'envoi de l\'email' }, { status: 500 })
    }
    
    // 🔔 NOTIFICATION : Contrat généré et envoyé
    await notifier({
      code: 'CONTRAT_GENERE',
      rolesDestinataires: ['ADMIN'],
      metadata: {
        soustraitantId: soustraitant.id,
        soustraitantNom: soustraitant.nom,
      },
    })
    
    return NextResponse.json({ success: true, message: 'Email envoyé avec succès' })
  } catch (error: unknown) {
    if (error instanceof ContratIncompletError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erreur lors de l\'envoi du contrat:', error)
    return NextResponse.json(
      { error: `Erreur lors de l'envoi du contrat` },
      { status: 500 }
    )
  }
} 
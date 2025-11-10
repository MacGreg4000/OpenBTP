import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    const commande = await prisma.commande.findUnique({
      where: { id },
      include: { lignes: true }
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    return NextResponse.json(commande)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Vérifier que la commande existe
    const existingCommande = await prisma.commande.findUnique({
      where: { id }
    })

    if (!existingCommande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    const commandeData = await request.json()
    console.log('Données reçues pour mise à jour:', commandeData)

    const chantierPrimaryId: string | undefined = commandeData.chantierId
    const chantierSlug: string | undefined = commandeData.chantierSlug || commandeData.chantierId

    // Préparer les données pour la mise à jour
    const existingChantier = await prisma.chantier.findUnique({ where: { id: existingCommande.chantierId } })
    let targetChantier = null

    if (chantierPrimaryId) {
      targetChantier = await prisma.chantier.findUnique({ where: { id: chantierPrimaryId } })
    }
    if (!targetChantier && chantierSlug) {
      targetChantier = await prisma.chantier.findUnique({ where: { chantierId: chantierSlug } })
    }
    if (!targetChantier) {
      targetChantier = existingChantier
    }

    if (!targetChantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 400 })
    }

    const targetChantierId = targetChantier.id
    const previousChantierId = existingCommande.chantierId

    const commandeUpdateData = {
      chantierId: targetChantierId,
      clientId: commandeData.clientId,
      dateCommande: new Date(commandeData.dateCommande),
      reference: commandeData.reference || null,
      tauxTVA: Number(commandeData.tauxTVA) || 0,
      sousTotal: Number(commandeData.sousTotal) || 0,
      totalOptions: Number(commandeData.totalOptions) || 0,
      tva: Number(commandeData.tva) || 0,
      total: Number(commandeData.total) || 0,
      statut: commandeData.statut,
      estVerrouillee: Boolean(commandeData.estVerrouillee)
    }

    // Mettre à jour la commande
    await prisma.commande.update({
      where: { id },
      data: commandeUpdateData
    })

    // Mettre à jour les lignes si elles sont fournies
    if (commandeData.lignes && Array.isArray(commandeData.lignes)) {
      // Supprimer toutes les lignes existantes
      await prisma.ligneCommande.deleteMany({
        where: { commandeId: id }
      })

      // Créer les nouvelles lignes
      if (commandeData.lignes.length > 0) {
        interface UpdateLignePayload { ordre?: number|string; article?: string; description?: string; type?: string; unite?: string; prixUnitaire?: number|string; quantite?: number|string; total?: number|string; estOption?: boolean }
        await prisma.ligneCommande.createMany({
          data: commandeData.lignes.map((ligne: UpdateLignePayload) => {
            const typeLigne = (typeof ligne.type === 'string' && ligne.type.trim() !== '') ? ligne.type : 'QP';
            const isSection = typeLigne === 'TITRE' || typeLigne === 'SOUS_TITRE';

            return {
              commandeId: id,
              ordre: Number(ligne.ordre) || 0,
              article: ligne.article || (isSection ? (typeLigne === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE') : ''),
              description: ligne.description || '',
              type: typeLigne,
              unite: isSection ? '' : (ligne.unite || 'Pièces'),
              prixUnitaire: isSection ? 0 : Number(ligne.prixUnitaire) || 0,
              quantite: isSection ? 0 : Number(ligne.quantite) || 0,
              total: isSection ? 0 : Number(ligne.total) || 0,
              estOption: isSection ? false : Boolean(ligne.estOption)
            };
          })
        })
      }
    }

    // Mettre à jour le montant total du chantier ciblé
    const commandes = await prisma.commande.findMany({
      where: { chantierId: targetChantierId }
    })
    
    const montantTotal = commandes
      .filter((cmd) => cmd.statut === 'VALIDEE')
      .reduce((sum: number, cmd) => sum + Number(cmd.total || 0), 0)
    
    console.log('Montant total calculé:', montantTotal, 'à partir de', commandes.length, 'commandes')
    
    await prisma.chantier.update({
      where: { id: targetChantierId },
      data: { budget: montantTotal }
    })

    // Si le chantier a changé, mettre à jour l'ancien chantier également
    if (previousChantierId !== targetChantierId) {
      const anciennesCommandes = await prisma.commande.findMany({
        where: { chantierId: previousChantierId }
      })

      const ancienMontantTotal = anciennesCommandes
        .filter((cmd) => cmd.statut === 'VALIDEE')
        .reduce((sum: number, cmd) => sum + Number(cmd.total || 0), 0)

      await prisma.chantier.update({
        where: { id: previousChantierId },
        data: { budget: ancienMontantTotal }
      })
    }

    // Récupérer la commande mise à jour avec ses lignes
    const commandeWithLignes = await prisma.commande.findUnique({
      where: { id },
      include: { lignes: true }
    })

    return NextResponse.json(commandeWithLignes)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ commandeId: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const id = parseInt(params.commandeId)

    if (isNaN(id)) {
      return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 })
    }

    // Récupérer la commande pour obtenir le chantierId
    const commande = await prisma.commande.findUnique({
      where: { id }
    })

    if (!commande) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 })
    }

    // Supprimer d'abord les lignes de commande
    await prisma.ligneCommande.deleteMany({
      where: { commandeId: id }
    })

    // Puis supprimer la commande
    await prisma.commande.delete({
      where: { id }
    })

    // Mettre à jour le montant total du chantier
    const commandes = await prisma.commande.findMany({
      where: { chantierId: commande.chantierId }
    })
    
    // Calculer le montant total en additionnant uniquement les commandes avec statut VALIDEE
    const montantTotal = commandes
      .filter((cmd) => cmd.statut === 'VALIDEE')
      .reduce((sum: number, cmd) => sum + Number(cmd.total || 0), 0)
    
    console.log('Montant total calculé après suppression:', montantTotal)
    
    await prisma.chantier.update({
      where: { chantierId: commande.chantierId },
      data: { budget: montantTotal }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la commande' },
      { status: 500 }
    )
  }
} 
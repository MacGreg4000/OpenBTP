import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierIdReadable = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierIdReadable },
      select: { id: true }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantier.id;

    // Récupérer la commande sous-traitant avec Prisma
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: {
        id: parseInt(commandeId),
        chantierId: chantierIdInterne,
        soustraitantId: soustraitantId
      },
      include: {
        Chantier: {
          select: {
            nomChantier: true
          }
        },
        soustraitant: {
          select: {
            nom: true,
            email: true,
            contact: true,
            adresse: true,
            telephone: true,
            tva: true
          }
        },
        lignes: {
          orderBy: {
            ordre: 'asc'
          }
        }
      }
    })

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Transformer la réponse pour correspondre au format attendu par le frontend
    const commandeFormatee = {
      id: commande.id,
      reference: commande.reference,
      dateCommande: commande.dateCommande instanceof Date 
        ? commande.dateCommande.toISOString() 
        : commande.dateCommande,
      sousTotal: Number(commande.sousTotal),
      tauxTVA: Number(commande.tauxTVA),
      tva: Number(commande.tva),
      total: Number(commande.total),
      statut: commande.statut,
      estVerrouillee: Boolean(commande.estVerrouillee),
      soustraitantNom: commande.soustraitant?.nom || '',
      soustraitantEmail: commande.soustraitant?.email || '',
      lignes: commande.lignes.map(ligne => ({
        id: ligne.id,
        ordre: ligne.ordre,
        article: ligne.article,
        description: ligne.description,
        type: ligne.type,
        unite: ligne.unite,
        prixUnitaire: Number(ligne.prixUnitaire),
        quantite: Number(ligne.quantite),
        total: Number(ligne.total)
      }))
    }

    return NextResponse.json(commandeFormatee)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la commande sous-traitant' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierIdReadable = params.chantierId;
    const soustraitantId = params.soustraitantId;
    const commandeId = params.commandeId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    // Permettre de ne recevoir que estVerrouillee et statut pour une mise à jour de verrouillage
    const { reference, tauxTVA, lignes, estVerrouillee, statut } = body 

    // 0. Récupérer l'ID interne du chantier à partir de son ID lisible (nécessaire pour la vérification et la mise à jour)
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierIdReadable },
      select: { id: true }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantier.id;

    // Vérifier que la commande existe
    const commandeExistante = await prisma.$queryRaw<Array<{ estVerrouillee: number | boolean; tauxTVA: number; reference?: string | null; sousTotal?: number | null }>>`
      SELECT * FROM commande_soustraitant
      WHERE id = ${parseInt(commandeId)}
      AND chantierId = ${chantierIdInterne}
      AND soustraitantId = ${soustraitantId}
    `

    if (!commandeExistante || commandeExistante.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Construire l'objet des champs à mettre à jour dynamiquement
    const updateData: Record<string, unknown> = {};
    let recalculateTotals = false;

    if (typeof estVerrouillee === 'boolean') {
      updateData.estVerrouillee = estVerrouillee;
    }
    if (statut) {
      updateData.statut = statut;
    }
    if (reference) {
      updateData.reference = reference;
    }
    if (typeof tauxTVA === 'number') {
      updateData.tauxTVA = tauxTVA;
      recalculateTotals = true; // Si le taux de TVA change, les totaux doivent être recalculés
    }

    // Mettre à jour les lignes de commande si fournies ET si la commande n'est pas verrouillée
    if (lignes && Array.isArray(lignes)) {
      if (commandeExistante[0].estVerrouillee && typeof estVerrouillee === 'undefined') {
        // Si la commande est déjà verrouillée et qu'on n'essaie pas explicitement de la déverrouiller,
        // on n'autorise pas la modification des lignes.
        return NextResponse.json(
          { error: 'La commande est verrouillée et ses lignes ne peuvent pas être modifiées.' },
          { status: 400 }
        );
      }

      // Supprimer les lignes existantes
      await prisma.$executeRaw`
        DELETE FROM ligne_commande_soustraitant
        WHERE commandeSousTraitantId = ${parseInt(commandeId)}
      `

      // Calculer les totaux
      let sousTotal = 0
      type LigneInput = { article: string; description: string; type?: string; unite: string; prixUnitaire: number; quantite: number }
      const lignesAvecTotal = (lignes as Array<LigneInput>).map((ligne, index: number) => {
        const total = ligne.prixUnitaire * ligne.quantite
        sousTotal += total
        return {
          ...ligne,
          ordre: index + 1,
          total
        }
      })

      const tvaValue = tauxTVA || commandeExistante[0].tauxTVA
      const tva = sousTotal * tvaValue / 100
      const total = sousTotal + tva

      updateData.sousTotal = sousTotal;
      updateData.tva = tva;
      updateData.total = total;
      recalculateTotals = false; // Les totaux sont déjà calculés avec les nouvelles lignes

      // Créer les nouvelles lignes
      for (const ligne of lignesAvecTotal) {
        await prisma.$executeRaw`
          INSERT INTO ligne_commande_soustraitant (
            commandeSousTraitantId,
            ordre,
            article,
            description,
            type,
            unite,
            prixUnitaire,
            quantite,
            total,
            createdAt,
            updatedAt
          ) VALUES (
            ${parseInt(commandeId)},
            ${ligne.ordre},
            ${ligne.article},
            ${ligne.description},
            ${ligne.type || 'QP'},
            ${ligne.unite},
            ${ligne.prixUnitaire},
            ${ligne.quantite},
            ${ligne.total},
            NOW(),
            NOW()
          )
        `
      }

      // Mettre à jour la commande
      await prisma.$executeRaw`
        UPDATE commande_soustraitant
        SET 
          reference = ${reference || commandeExistante[0].reference},
          tauxTVA = ${tvaValue},
          sousTotal = ${sousTotal},
          tva = ${tva},
          total = ${total},
          updatedAt = NOW()
        WHERE id = ${parseInt(commandeId)}
      `
    } else if (recalculateTotals) {
        // Si seulement le tauxTVA a changé sans nouvelles lignes, recalculer tva et total
        const currentSousTotal = Number(commandeExistante[0].sousTotal || 0);
        const taux = typeof updateData.tauxTVA === 'number' ? updateData.tauxTVA as number : Number(updateData.tauxTVA || 0);
        const tvaCalc = currentSousTotal * (taux / 100);
        const totalCalc = currentSousTotal + tvaCalc;
        updateData.tva = tvaCalc;
        updateData.total = totalCalc;
    }

    // Appliquer les mises à jour à la commande_soustraitant
    // Seulement si updateData contient des clés
    if (Object.keys(updateData).length > 0) {
        const setClauses = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updateData);

        await prisma.$executeRawUnsafe(
            `UPDATE commande_soustraitant SET ${setClauses}, updatedAt = NOW() WHERE id = ?`,
            ...values, parseInt(commandeId)
        );
    } else if (!lignes) {
        // Si aucune donnée n'est fournie (ni lignes, ni champs de base), ne rien faire ou retourner un message approprié
        // Pour l'instant, on ne fait rien et on retourne la commande existante
    }

    // Récupérer la commande mise à jour pour la retourner
    const commandeMiseAJour = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.id 
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(commandeId)}
    `;

    const lignesCommandeMiseAJour = await prisma.$queryRaw<Array<{ article: string; description: string; type: string; unite: string; prixUnitaire: number; quantite: number; total: number; ordre: number }>>`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(commandeId)}
      ORDER BY ordre ASC
    `;

    return NextResponse.json({
      ...commandeMiseAJour[0],
      lignes: lignesCommandeMiseAJour
    });

  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande sous-traitant' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const params = await context.params;
    const { chantierId: chantierIdLisible, soustraitantId, commandeId } = params;

    if (!soustraitantId || !commandeId || !chantierIdLisible) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 });
    }
    
    const commandeIdInt = parseInt(commandeId);
    if (isNaN(commandeIdInt)) {
        return NextResponse.json({ error: 'ID de commande invalide' }, { status: 400 });
    }

    // 1. Récupérer l'ID interne du chantier
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: chantierIdLisible },
      select: { id: true }
    });

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // 2. Vérifier si la commande existe et appartient bien au chantier et au sous-traitant
    const commande = await prisma.commandeSousTraitant.findFirst({
        where: {
            id: commandeIdInt,
            soustraitantId: soustraitantId,
            chantierId: chantierIdInterne,
        }
    });

    if (!commande) {
        return NextResponse.json({ error: 'Commande sous-traitant non trouvée' }, { status: 404 });
    }

    // 3. Vérifier s'il existe des états d'avancement liés à cette commande
    const etatsAvancementLies = await prisma.soustraitant_etat_avancement.count({
      where: {
        commandeSousTraitantId: commandeIdInt,
      }
    });

    if (etatsAvancementLies > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer la commande car des états d\'avancement y sont liés.' },
        { status: 409 } // 409 Conflict
      );
    }

    // 4. Supprimer les lignes de commande associées puis la commande elle-même
    // Prisma gère cela en cascade si les relations sont définies avec onDelete: Cascade
    // Sinon, il faut le faire manuellement :
    await prisma.ligneCommandeSousTraitant.deleteMany({
      where: {
        commandeSousTraitantId: commandeIdInt,
      }
    });

    await prisma.commandeSousTraitant.delete({
      where: {
        id: commandeIdInt,
      }
    });

    return NextResponse.json({ message: 'Commande sous-traitant supprimée avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression de la commande sous-traitant:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la suppression de la commande.' },
      { status: 500 }
    );
  }
} 
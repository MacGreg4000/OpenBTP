import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { Prisma } from '@prisma/client'

// Helper: retrouve la ligne correspondante dans l'état précédent pour reprendre quantiteTotale/montantTotal
function findMatchingLignePrecedente<T extends { description?: string | null; prixUnitaire?: number; unite?: string | null }>(
  ligne: T,
  lignesPrecedentes: Array<{ description?: string | null; prixUnitaire?: number; unite?: string | null; quantiteTotale?: number; montantTotal?: number }>
) {
  const desc = (ligne.description ?? '').trim().toLowerCase()
  const prix = Number(ligne.prixUnitaire) || 0
  const unit = (ligne.unite ?? '').trim().toLowerCase()

  return lignesPrecedentes.find((l) => {
    const lDesc = (l.description ?? '').trim().toLowerCase()
    const lPrix = Number(l.prixUnitaire) || 0
    const lUnit = (l.unite ?? '').trim().toLowerCase()
    return lDesc === desc && Math.abs(lPrix - prix) < 0.01 && lUnit === unit
  })
}

// Interface pour les photos
interface Photo {
  id: number;
  soustraitantEtatAvancementId: number;
  url: string;
  description: string | null;
  dateAjout: Date;
}

// GET /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement
// Récupère les états d'avancement d'un sous-traitant pour un chantier
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer les paramètres de l'URL
    const { chantierId, soustraitantId } = await context.params

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: chantierId },
      select: { id: true }
    });

    if (!chantierData) {
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;

    // Vérifier que le sous-traitant existe pour ce chantier
    const soustraitantExists = await prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*) as count
      FROM soustraitant s
      JOIN commande_soustraitant cs ON s.id = cs.soustraitantId
      WHERE s.id = ${soustraitantId}
      AND cs.chantierId = ${chantierIdInterne}
    `

    if (!soustraitantExists || !soustraitantExists[0] || soustraitantExists[0].count === 0) {
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé ou non associé à ce chantier' },
        { status: 404 }
      )
    }

    // Récupérer tous les états d'avancement du sous-traitant pour ce chantier uniquement
    const etatsAvancement = await prisma.soustraitant_etat_avancement.findMany({
      where: {
        soustraitantId: soustraitantId,
        etat_avancement: {
          chantierId: chantierIdInterne
        }
      },
      orderBy: {
        numero: 'asc'
      }
    })

    // Récupérer le nom du sous-traitant
    const soustraitant = await prisma.soustraitant.findUnique({
      where: {
        id: soustraitantId
      },
      select: {
        nom: true
      }
    })

    // Formatter les résultats
    const formattedEtats = await Promise.all(
      etatsAvancement.map(async (etat) => {
        // Récupérer les lignes, avenants et photos séparément
        const lignes = await prisma.ligne_soustraitant_etat_avancement.findMany({
          where: {
            soustraitantEtatAvancementId: etat.id
          },
          orderBy: { id: 'asc' } // Trier par ID pour préserver l'ordre de création
        })

        const avenants = await prisma.avenant_soustraitant_etat_avancement.findMany({
          where: {
            soustraitantEtatAvancementId: etat.id
          }
        })

        const photos = await prisma.$queryRaw`
          SELECT * FROM photo_soustraitant_etat_avancement 
          WHERE soustraitantEtatAvancementId = ${etat.id}
        ` as Photo[]

        return {
          id: etat.id,
          numero: etat.numero,
          soustraitantId: etat.soustraitantId,
          soustraitantNom: soustraitant?.nom || '',
          date: etat.date,
          commandeId: etat.commandeSousTraitantId,
          estFinalise: Boolean(etat.estFinalise),
          commentaires: etat.commentaires,
          lignes: lignes.map((ligne) => ({
            id: ligne.id,
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            quantitePrecedente: ligne.quantitePrecedente,
            quantiteActuelle: ligne.quantiteActuelle,
            quantiteTotale: ligne.quantiteTotale,
            montantPrecedent: ligne.montantPrecedent,
            montantActuel: ligne.montantActuel,
            montantTotal: ligne.montantTotal
          })),
          avenants: avenants.map((avenant) => ({
            id: avenant.id,
            article: avenant.article,
            description: avenant.description,
            type: avenant.type,
            unite: avenant.unite,
            prixUnitaire: avenant.prixUnitaire,
            quantite: avenant.quantite,
            quantitePrecedente: avenant.quantitePrecedente,
            quantiteActuelle: avenant.quantiteActuelle,
            quantiteTotale: avenant.quantiteTotale,
            montantPrecedent: avenant.montantPrecedent,
            montantActuel: avenant.montantActuel,
            montantTotal: avenant.montantTotal
          })),
          photos: photos.map((photo) => ({
            id: photo.id,
            url: photo.url,
            description: photo.description,
            dateAjout: photo.dateAjout
          }))
        }
      })
    )
    
    return NextResponse.json(formattedEtats)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des états d\'avancement' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement
// Crée un nouvel état d'avancement pour un sous-traitant
export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string; soustraitantId: string }> }
) {
  try {
    console.log('Début de la requête POST pour créer un état d\'avancement')
    console.log('Paramètres:', (await context.params))

    // Récupérer les paramètres de l'URL
    const { chantierId, soustraitantId } = await context.params

    const session = await getServerSession(authOptions)
    if (!session) {
      console.log('Session non authentifiée')
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Corps de la requête:', body)
    const { commandeId } = body

    // 1. Récupérer l'ID interne du chantier à partir de son ID lisible
    const chantierData = await prisma.chantier.findUnique({
      where: { chantierId: chantierId },
      select: { id: true }
    });

    if (!chantierData) {
      console.log('Chantier non trouvé pour cet ID lisible:', chantierId);
      return NextResponse.json({ error: 'Chantier non trouvé pour cet ID lisible' }, { status: 404 });
    }
    const chantierIdInterne = chantierData.id;
    console.log('ID interne du chantier récupéré:', chantierIdInterne);

    // Vérifier que le sous-traitant existe et est lié au chantier
    console.log('Vérification du sous-traitant:', soustraitantId, 'pour chantier interne ID:', chantierIdInterne);
    const soustraitantResult = await prisma.$queryRaw<Array<{ id: string; nom: string }>>`
      SELECT s.*
      FROM soustraitant s
      JOIN commande_soustraitant cs ON s.id = cs.soustraitantId
      WHERE s.id = ${soustraitantId}
      AND cs.chantierId = ${chantierIdInterne}
      LIMIT 1
    `;

    console.log('Résultat de la requête sous-traitant:', soustraitantResult)
    if (!soustraitantResult || soustraitantResult.length === 0) {
      console.log('Sous-traitant non trouvé ou non associé au chantier')
      return NextResponse.json(
        { error: 'Sous-traitant non trouvé ou non associé à ce chantier' },
        { status: 404 }
      )
    }

    const soustraitant = soustraitantResult[0]
    console.log('Sous-traitant trouvé:', soustraitant.nom)

    // Vérifier que la commande existe et appartient au sous-traitant
    console.log('Vérification de la commande:', commandeId)
    const commande = await prisma.commandeSousTraitant.findFirst({
      where: {
        id: commandeId,
        soustraitantId: soustraitantId,
        chantierId: chantierIdInterne
      },
      include: {
        lignes: true
      }
    })

    console.log('Résultat de la requête commande:', commande)
    if (!commande) {
      console.log('Commande sous-traitant non trouvée')
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    // Vérifier que la commande est verrouillée
    if (!commande.estVerrouillee) {
      console.log('La commande n\'est pas verrouillée')
      return NextResponse.json(
        { error: 'La commande doit être verrouillée avant de créer un état d\'avancement' },
        { status: 400 }
      )
    }

    // Vérifier si c'est le premier état d'avancement pour ce chantier
    const existingEtats = await prisma.soustraitant_etat_avancement.count({
      where: {
        soustraitantId: soustraitantId,
        etat_avancement: {
          chantierId: chantierIdInterne
        }
      }
    })

    console.log('Nombre d\'états existants pour ce chantier:', existingEtats)

    // Récupérer le dernier état d'avancement pour ce chantier uniquement
    const lastEtat = await prisma.soustraitant_etat_avancement.findFirst({
      where: {
        soustraitantId: soustraitantId,
        etat_avancement: {
          chantierId: chantierIdInterne
        }
      },
      orderBy: {
        numero: 'desc'
      },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true
      }
    })

    // Vérifier que le dernier état est finalisé SEULEMENT s'il y a des états existants
    if (existingEtats > 0 && lastEtat && !lastEtat.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.' },
        { status: 400 }
      )
    }

    // Récupérer dernier état client (nécessaire pour lier à l'état sous-traitant)
    const dernierEtatClient = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantierIdInterne
      },
      orderBy: {
        numero: 'desc'
      }
    })

    if (!dernierEtatClient) {
      return NextResponse.json(
        { error: 'Aucun état d\'avancement client trouvé pour ce chantier' },
        { status: 404 }
      )
    }

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1
    console.log('Prochain numéro:', nextNumero)

    // Créer le nouvel état d'avancement
    const etatAvancement = await prisma.soustraitant_etat_avancement.create({
      data: {
        soustraitantId: soustraitantId,
        commandeSousTraitantId: commande.id,
        numero: nextNumero,
        date: new Date(),
        etatAvancementId: dernierEtatClient.id,
        estFinalise: body.estFinalise,
        commentaires: body.commentaires,
        updatedAt: new Date()
      }
    })

    console.log('État créé:', etatAvancement)

    // Si c'est le premier état, charger les lignes de la commande
    if (existingEtats === 0) {
      console.log('Premier état, chargement de la commande...')
      
      // Si des lignes sont fournies dans le body (avec des quantités mises à jour), les utiliser
      if (body.lignes && body.lignes.length > 0) {
        console.log('Création des lignes avec les données du body...')
        // Créer les lignes séquentiellement pour préserver l'ordre
        for (const ligne of body.lignes) {
          await prisma.ligne_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type || 'QP',
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: ligne.quantitePrecedente || 0,
              quantiteActuelle: ligne.quantiteActuelle || 0,
              quantiteTotale: ligne.quantiteTotale || 0,
              montantPrecedent: ligne.montantPrecedent || 0,
              montantActuel: ligne.montantActuel || 0,
              montantTotal: ligne.montantTotal || 0,
              updatedAt: new Date()
            }
          })
        }
        console.log('Lignes créées avec succès à partir du body')
      } else if (commande.lignes && commande.lignes.length > 0) {
        console.log('Création des lignes à partir de la commande...')
        // Créer les lignes d'état d'avancement à partir des lignes de commande
        // Créer séquentiellement pour préserver l'ordre
        for (const ligne of commande.lignes) {
          await prisma.ligne_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type || 'QP',
              unite: ligne.unite,
              prixUnitaire: ligne.prixUnitaire,
              quantite: ligne.quantite,
              quantitePrecedente: 0,
              quantiteActuelle: 0,
              quantiteTotale: 0,
              montantPrecedent: 0,
              montantActuel: 0,
              montantTotal: 0,
              updatedAt: new Date()
            }
          })
        }
        console.log('Lignes créées avec succès')
      } else {
        console.log('La commande ne contient pas de lignes')
      }
    } else if (lastEtat) {
      // Pour les états 2+:
      // - quantitePrecedente/montantPrecedent = TOUJOURS depuis lastEtat (fiable, comme états client)
      // - quantiteActuelle/montantActuel = depuis body.lignes si fourni (saisie utilisateur)
      const lignesPrecedentes = lastEtat.ligne_soustraitant_etat_avancement
      console.log(`Création état 2+ : ${lignesPrecedentes.length} lignes depuis lastEtat, body.lignes: ${body.lignes?.length || 0}`)

      for (let i = 0; i < lignesPrecedentes.length; i++) {
        const lignePrev = lignesPrecedentes[i]

        // Chercher la saisie utilisateur dans body.lignes (par index d'abord, puis par matching)
        let quantiteActuelle = 0
        let montantActuel = 0
        if (body.lignes && body.lignes.length > 0) {
          // Matching par index (ordre identique commande → état)
          let bodyLigne = body.lignes[i]
          // Fallback: matching par description+prix+unite si l'index ne correspond pas
          if (!bodyLigne || bodyLigne.description?.trim().toLowerCase() !== lignePrev.description?.trim().toLowerCase()) {
            bodyLigne = body.lignes.find((bl: { description?: string; prixUnitaire?: number; unite?: string }) => {
              const dMatch = (bl.description ?? '').trim().toLowerCase() === (lignePrev.description ?? '').trim().toLowerCase()
              const pMatch = Math.abs((Number(bl.prixUnitaire) || 0) - (Number(lignePrev.prixUnitaire) || 0)) < 0.01
              const uMatch = (bl.unite ?? '').trim().toLowerCase() === (lignePrev.unite ?? '').trim().toLowerCase()
              return dMatch && pMatch && uMatch
            })
          }
          if (bodyLigne) {
            quantiteActuelle = Number(bodyLigne.quantiteActuelle) || 0
            montantActuel = Number(bodyLigne.montantActuel) || 0
          }
        }

        const quantitePrecedente = Number(lignePrev.quantiteTotale) || 0
        const montantPrecedent = Number(lignePrev.montantTotal) || 0

        await prisma.ligne_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: lignePrev.article,
            description: lignePrev.description,
            type: lignePrev.type,
            unite: lignePrev.unite,
            prixUnitaire: lignePrev.prixUnitaire,
            quantite: lignePrev.quantite,
            quantitePrecedente,
            quantiteActuelle,
            quantiteTotale: quantitePrecedente + quantiteActuelle,
            montantPrecedent,
            montantActuel,
            montantTotal: montantPrecedent + montantActuel,
            updatedAt: new Date()
          }
        })
      }

      console.log('Lignes créées avec succès (précédent=lastEtat, actuel=body)')
      
      // Copier ou créer les avenants selon si des données sont fournies dans le body
      // Pour les avenants existants, reprendre précédent depuis lastEtat (comme les lignes)
      const avenantsPrecedents = lastEtat.avenant_soustraitant_etat_avancement || []

      if (body.avenants && body.avenants.length > 0) {
        // Nouveaux avenants ajoutés dans le formulaire : enrichir avec lastEtat si correspondance
        console.log('Sauvegarde des avenants du body, enrichis par lastEtat...')
        await Promise.all(body.avenants.map((avenant) => {
          const match = findMatchingLignePrecedente(avenant, avenantsPrecedents)
          const quantitePrecedente = match ? Number((match as { quantiteTotale?: number }).quantiteTotale) || 0 : (avenant.quantitePrecedente ?? 0)
          const montantPrecedent = match ? Number((match as { montantTotal?: number }).montantTotal) || 0 : (avenant.montantPrecedent ?? 0)
          const quantiteActuelle = Number(avenant.quantiteActuelle) || 0
          const montantActuel = Number(avenant.montantActuel) || 0
          return prisma.avenant_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
              article: avenant.article || '',
              description: avenant.description || '',
              type: avenant.type || 'QP',
              unite: avenant.unite || 'U',
              prixUnitaire: avenant.prixUnitaire || 0,
              quantite: avenant.quantite || 0,
              quantitePrecedente,
              quantiteActuelle,
              quantiteTotale: quantitePrecedente + quantiteActuelle,
              montantPrecedent,
              montantActuel,
              montantTotal: montantPrecedent + montantActuel,
              updatedAt: new Date()
            }
          })
        }))
        console.log('Avenants du body sauvegardés avec succès')
      } else if (lastEtat.avenant_soustraitant_etat_avancement && lastEtat.avenant_soustraitant_etat_avancement.length > 0) {
        // Copier les avenants du dernier état seulement si aucun avenant n'est fourni dans le body
        console.log('Copie des avenants du dernier état finalisé...')
        console.log('Avenants dans dernier état:', lastEtat.avenant_soustraitant_etat_avancement.length)
        
        await Promise.all(lastEtat.avenant_soustraitant_etat_avancement.map(avenant =>
          prisma.avenant_soustraitant_etat_avancement.create({
            data: {
              soustraitantEtatAvancementId: etatAvancement.id,
              article: avenant.article,
              description: avenant.description,
              type: avenant.type,
              unite: avenant.unite,
              prixUnitaire: avenant.prixUnitaire,
              quantite: avenant.quantite,
              // Mettre à jour les valeurs précédentes avec les totales de l'état précédent
              quantitePrecedente: avenant.quantiteTotale,
              quantiteActuelle: 0,
              quantiteTotale: avenant.quantiteTotale, // Commencer avec le total précédent
              montantPrecedent: avenant.montantTotal,
              montantActuel: 0,
              montantTotal: avenant.montantTotal, // Commencer avec le total précédent
              updatedAt: new Date()
            }
          })
        ))
        console.log('Avenants copiés avec succès')
      } else {
        console.log('Aucun avenant à copier ou à créer')
      }
    } else if (body.avenants && body.avenants.length > 0) {
      // Pour le premier état, sauvegarder les nouveaux avenants créés (s'il y en a dans le body)
      console.log('Sauvegarde des nouveaux avenants créés (premier état):', body.avenants.length)
      
      await Promise.all(body.avenants.map(avenant =>
        prisma.avenant_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: avenant.article || '',
            description: avenant.description || '',
            type: avenant.type || 'QP',
            unite: avenant.unite || 'U',
            prixUnitaire: avenant.prixUnitaire || 0,
            quantite: avenant.quantite || 0,
            quantitePrecedente: avenant.quantitePrecedente || 0,
            quantiteActuelle: avenant.quantiteActuelle || 0,
            quantiteTotale: avenant.quantiteTotale || 0,
            montantPrecedent: avenant.montantPrecedent || 0,
            montantActuel: avenant.montantActuel || 0,
            montantTotal: avenant.montantTotal || 0,
            updatedAt: new Date()
          }
        })
      ))
      
      console.log('Nouveaux avenants sauvegardés avec succès (premier état)')
    }

    // Retourner l'état d'avancement complet avec ses lignes
    const etatAvancementComplet = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: etatAvancement.id
      },
      include: {
        ligne_soustraitant_etat_avancement: {
          orderBy: { id: 'asc' } // Trier par ID pour préserver l'ordre de création
        },
        avenant_soustraitant_etat_avancement: {
          orderBy: { id: 'asc' }
        },
        soustraitant: true
      }
    })

    return NextResponse.json({
      id: etatAvancementComplet?.id,
      numero: etatAvancementComplet?.numero,
      date: etatAvancementComplet?.date,
      soustraitantId: etatAvancementComplet?.soustraitantId,
      soustraitantNom: etatAvancementComplet?.soustraitant.nom,
      lignes: etatAvancementComplet?.ligne_soustraitant_etat_avancement,
      avenants: etatAvancementComplet?.avenant_soustraitant_etat_avancement,
      estFinalise: etatAvancementComplet?.estFinalise
    })
  } catch (error) {
    console.error('Erreur détaillée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 
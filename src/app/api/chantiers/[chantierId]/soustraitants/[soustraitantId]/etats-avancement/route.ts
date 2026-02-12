import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
// import { Prisma } from '@prisma/client'

// Normalise une chaîne pour comparaison (trim, lowercase, espaces multiples → 1)
function normalizeStr(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Helper: retrouve la ligne correspondante dans l'état précédent pour reprendre quantiteTotale/montantTotal
function findMatchingLignePrecedente<T extends { description?: string | null; prixUnitaire?: number; unite?: string | null }>(
  ligne: T,
  lignesPrecedentes: Array<{ description?: string | null; prixUnitaire?: number; unite?: string | null; quantiteTotale?: number; montantTotal?: number }>,
  indexFallback?: number
) {
  const desc = normalizeStr(String(ligne.description ?? ''))
  const prix = Number(ligne.prixUnitaire) || 0
  const unit = normalizeStr(String(ligne.unite ?? ''))

  const byKey = lignesPrecedentes.find((l) => {
    const lDesc = normalizeStr(String(l.description ?? ''))
    const lPrix = Number(l.prixUnitaire) || 0
    const lUnit = normalizeStr(String(l.unite ?? ''))
    return lDesc === desc && Math.abs(lPrix - prix) < 0.02 && lUnit === unit
  })
  if (byKey) return byKey
  // Fallback: même index si ordre identique
  if (indexFallback != null && indexFallback >= 0 && indexFallback < lignesPrecedentes.length)
    return lignesPrecedentes[indexFallback]
  return undefined
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
        numero: 'desc'
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

    // Créer les lignes de l'état d'avancement
    // PRIORITÉ 1 : body.lignes fourni par le frontend (déjà calculé avec les bons précédents)
    // PRIORITÉ 2 : commande (état 1 sans données frontend)
    // PRIORITÉ 3 : copie depuis lastEtat (état 2+ sans données frontend)
    if (body.lignes && body.lignes.length > 0) {
      console.log(`Création des ${body.lignes.length} lignes depuis le body (état ${nextNumero})...`)
      for (const ligne of body.lignes) {
        await prisma.ligne_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: ligne.article ?? '',
            description: ligne.description ?? '',
            type: ligne.type || 'QP',
            unite: ligne.unite ?? '',
            prixUnitaire: Number(ligne.prixUnitaire) || 0,
            quantite: Number(ligne.quantite) || 0,
            quantitePrecedente: Number(ligne.quantitePrecedente) || 0,
            quantiteActuelle: Number(ligne.quantiteActuelle) || 0,
            quantiteTotale: Number(ligne.quantiteTotale) || 0,
            montantPrecedent: Number(ligne.montantPrecedent) || 0,
            montantActuel: Number(ligne.montantActuel) || 0,
            montantTotal: Number(ligne.montantTotal) || 0,
            updatedAt: new Date()
          }
        })
      }
      console.log('Lignes créées avec succès à partir du body')
    } else if (existingEtats === 0 && commande.lignes && commande.lignes.length > 0) {
      console.log('Premier état sans body, création depuis la commande...')
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
      console.log('Lignes créées depuis la commande')
    } else if (lastEtat) {
      console.log('État 2+ sans body, copie depuis lastEtat...')
      for (const ligne of lastEtat.ligne_soustraitant_etat_avancement) {
        await prisma.ligne_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: ligne.prixUnitaire,
            quantite: ligne.quantite,
            quantitePrecedente: ligne.quantiteTotale,
            quantiteActuelle: 0,
            quantiteTotale: ligne.quantiteTotale,
            montantPrecedent: ligne.montantTotal,
            montantActuel: 0,
            montantTotal: ligne.montantTotal,
            updatedAt: new Date()
          }
        })
      }
      console.log('Lignes copiées depuis lastEtat')
    } else {
      console.log('Aucune source de lignes disponible')
    }

    // Créer les avenants
    // PRIORITÉ 1 : body.avenants (envoyés par le frontend, valeurs déjà calculées)
    // PRIORITÉ 2 : copie depuis lastEtat (état 2+ sans données frontend)
    if (body.avenants && body.avenants.length > 0) {
      console.log(`Création des ${body.avenants.length} avenants depuis le body...`)
      for (const avenant of body.avenants) {
        await prisma.avenant_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: avenant.article || '',
            description: avenant.description || '',
            type: avenant.type || 'QP',
            unite: avenant.unite || 'U',
            prixUnitaire: Number(avenant.prixUnitaire) || 0,
            quantite: Number(avenant.quantite) || 0,
            quantitePrecedente: Number(avenant.quantitePrecedente) || 0,
            quantiteActuelle: Number(avenant.quantiteActuelle) || 0,
            quantiteTotale: Number(avenant.quantiteTotale) || 0,
            montantPrecedent: Number(avenant.montantPrecedent) || 0,
            montantActuel: Number(avenant.montantActuel) || 0,
            montantTotal: Number(avenant.montantTotal) || 0,
            updatedAt: new Date()
          }
        })
      }
      console.log('Avenants créés depuis le body')
    } else if (lastEtat && lastEtat.avenant_soustraitant_etat_avancement && lastEtat.avenant_soustraitant_etat_avancement.length > 0) {
      console.log(`Copie des ${lastEtat.avenant_soustraitant_etat_avancement.length} avenants depuis lastEtat...`)
      for (const avenant of lastEtat.avenant_soustraitant_etat_avancement) {
        await prisma.avenant_soustraitant_etat_avancement.create({
          data: {
            soustraitantEtatAvancementId: etatAvancement.id,
            article: avenant.article,
            description: avenant.description,
            type: avenant.type,
            unite: avenant.unite,
            prixUnitaire: avenant.prixUnitaire,
            quantite: avenant.quantite,
            quantitePrecedente: avenant.quantiteTotale,
            quantiteActuelle: 0,
            quantiteTotale: avenant.quantiteTotale,
            montantPrecedent: avenant.montantTotal,
            montantActuel: 0,
            montantTotal: avenant.montantTotal,
            updatedAt: new Date()
          }
        })
      }
      console.log('Avenants copiés depuis lastEtat')
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
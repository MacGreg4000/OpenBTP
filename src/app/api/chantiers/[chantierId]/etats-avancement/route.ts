import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Fonction helper pour nettoyer et parser les floats
const cleanAndParseFloat = (value: unknown): number => {
  if (value === null || value === undefined || String(value).trim() === '') return 0;
  // Enlève les espaces (y compris insécables), les slashs, et remplace la virgule par un point
  const stringValue = String(value).replace(/\s/g, '').replace(/\//g, '').replace(',', '.');
  const parsed = parseFloat(stringValue);
  return isNaN(parsed) ? 0 : parsed;
};

// GET /api/chantiers/[chantierId]/etats-avancement
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierReadableId = params.chantierId; // Renommé pour plus de clarté
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le chantier par son ID lisible pour obtenir le CUID
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé pour GET' }, { status: 404 });
    }

    const etatsAvancement = await prisma.etatAvancement.findMany({
      where: {
        chantierId: chantier.id // Utiliser le CUID du chantier
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      },
      orderBy: {
        numero: 'desc'
      }
    })

    return NextResponse.json(etatsAvancement)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des états d\'avancement' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/etats-avancement
export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierReadableId = params.chantierId; // Renommé pour plus de clarté
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer le chantier par son ID lisible pour obtenir le CUID
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: chantierReadableId }
    });

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 });
    }

    // Vérifier si c'est le premier état d'avancement
    const existingEtats = await prisma.etatAvancement.count({
      where: {
        chantierId: chantier.id // Utiliser le CUID du chantier
      }
    })

    console.log('Nombre d\'états existants:', existingEtats)

    // Récupérer le dernier état d'avancement
    const lastEtat = await prisma.etatAvancement.findFirst({
      where: {
        chantierId: chantier.id // Utiliser le CUID du chantier
      },
      orderBy: {
        numero: 'desc'
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    // Vérifier que le dernier état est finalisé (sauf s'il n'y a pas d'état précédent)
    if (lastEtat && !lastEtat.estFinalise) {
      return NextResponse.json(
        { error: 'L\'état d\'avancement précédent doit être finalisé avant de créer un nouvel état.' },
        { status: 400 }
      )
    }

    const nextNumero = lastEtat ? lastEtat.numero + 1 : 1
    console.log('Prochain numéro:', nextNumero)
    
    // Log des commentaires de l'état précédent
    console.log('Commentaires de l\'état précédent:', lastEtat?.commentaires);
    
    // Si l'état précédent existe, récupérer ses commentaires à jour
    let commentairesAReprendre = '';
    if (lastEtat) {
      try {
        // Récupérer l'état précédent avec ses commentaires à jour
        const etatPrecedent = await prisma.etatAvancement.findUnique({
          where: {
            id: lastEtat.id
          }
        });
        
        if (etatPrecedent && etatPrecedent.commentaires) {
          commentairesAReprendre = etatPrecedent.commentaires;
          console.log('Commentaires récupérés de l\'état précédent:', commentairesAReprendre);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des commentaires de l\'état précédent:', error);
      }
    }

    let etatAvancement;
    try {
      // Créer le nouvel état d'avancement
      etatAvancement = await prisma.etatAvancement.create({
        data: {
          chantierId: chantier.id, // Utiliser le CUID du chantier
          numero: nextNumero,
          createdBy: session.user.email || '',
          estFinalise: false,
          commentaires: '' // Initialiser les commentaires à une chaîne vide
        }
      })
    } catch (createError) {
      // Si l'état existe déjà, essayer de le récupérer
      if (createError instanceof Error && createError.message.includes('Unique constraint')) {
        console.log('État déjà existant, tentative de récupération...')
        const existingEtat = await prisma.etatAvancement.findFirst({
          where: {
            chantierId: chantier.id,
            numero: nextNumero
          }
        })
        
        if (existingEtat) {
          etatAvancement = existingEtat
          console.log('État existant récupéré:', etatAvancement)
        } else {
          throw createError
        }
      } else {
        throw createError
      }
    }

    console.log('État créé avec commentaires:', etatAvancement.commentaires)

    // Si c'est le premier état, charger les lignes de la commande
    if (existingEtats === 0) {
      console.log('Premier état, chargement de la commande...')
      const commande = await prisma.commande.findFirst({
        where: {
          chantierId: chantier.id, // Utiliser le CUID du chantier
          statut: 'VALIDEE'
        },
        include: {
          lignes: true
        }
      })

      console.log('Commande trouvée:', commande)

      if (commande) {
        console.log('Création des lignes à partir de la commande...')
        // Créer les lignes d'état d'avancement à partir des lignes de commande
        await Promise.all(commande.lignes.map(ligne =>
          prisma.ligneEtatAvancement.create({
            data: {
              etatAvancementId: etatAvancement.id,
              ligneCommandeId: ligne.id,
              article: ligne.article,
              description: ligne.description,
              type: ligne.type,
              unite: ligne.unite,
              prixUnitaire: cleanAndParseFloat(ligne.prixUnitaire),
              quantite: cleanAndParseFloat(ligne.quantite),
              quantitePrecedente: 0,
              quantiteActuelle: 0,
              quantiteTotale: 0,
              montantPrecedent: 0,
              montantActuel: 0,
              montantTotal: 0
            }
          })
        ))
        console.log('Lignes créées avec succès')
      } else {
        console.log('Aucune commande validée trouvée')
      }
    } else if (lastEtat) {
      // Pour les états suivants, copier les lignes du dernier état
      console.log('Copie des lignes du dernier état finalisé...')
      
      await Promise.all(lastEtat.lignes.map(ligne =>
        prisma.ligneEtatAvancement.create({
          data: {
            etatAvancementId: etatAvancement.id,
            ligneCommandeId: ligne.ligneCommandeId,
            article: ligne.article,
            description: ligne.description,
            type: ligne.type,
            unite: ligne.unite,
            prixUnitaire: cleanAndParseFloat(ligne.prixUnitaire),
            quantite: cleanAndParseFloat(ligne.quantite),
            quantitePrecedente: cleanAndParseFloat(ligne.quantiteTotale),
            quantiteActuelle: 0,
            quantiteTotale: cleanAndParseFloat(ligne.quantiteTotale),
            montantPrecedent: cleanAndParseFloat(ligne.montantTotal),
            montantActuel: 0,
            montantTotal: cleanAndParseFloat(ligne.montantTotal)
          }
        })
      ))
      
      console.log('Lignes copiées avec succès')
      
      // Copier également les avenants du dernier état
      console.log('Copie des avenants du dernier état finalisé...')
      
      if (lastEtat.avenants && lastEtat.avenants.length > 0) {
        // Créer une copie des avenants pour le nouvel état
        await Promise.all(lastEtat.avenants.map(avenant =>
          prisma.avenantEtatAvancement.create({
            data: {
              etatAvancementId: etatAvancement.id,
              article: avenant.article,
              description: avenant.description,
              type: avenant.type,
              unite: avenant.unite,
              prixUnitaire: cleanAndParseFloat(avenant.prixUnitaire),
              quantite: cleanAndParseFloat(avenant.quantite),
              quantitePrecedente: cleanAndParseFloat(avenant.quantiteTotale),
              quantiteActuelle: 0,
              quantiteTotale: cleanAndParseFloat(avenant.quantiteTotale),
              montantPrecedent: cleanAndParseFloat(avenant.montantTotal),
              montantActuel: 0,
              montantTotal: cleanAndParseFloat(avenant.montantTotal)
            }
          })
        ))
        console.log('Avenants copiés avec succès')
      } else {
        console.log('Aucun avenant à copier')
      }
    }

    // Retourner l'état d'avancement avec ses lignes
    const etatAvancementComplet = await prisma.etatAvancement.findUnique({
      where: {
        id: etatAvancement.id
      },
      include: {
        lignes: {
          orderBy: {
            ligneCommandeId: 'asc'
          }
        },
        avenants: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    })

    console.log('État complet à retourner:', etatAvancementComplet)
    
    if (!etatAvancementComplet) {
      console.error('État d\'avancement non trouvé après création')
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'état d\'avancement créé' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(etatAvancementComplet)
  } catch (error) {
    console.error('Erreur détaillée:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'état d\'avancement' },
      { status: 500 }
    )
  }
} 
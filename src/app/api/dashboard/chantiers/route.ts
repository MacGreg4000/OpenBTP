import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// GET /api/dashboard/chantiers - Récupère les chantiers en cours pour la carte du dashboard
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json([], { status: 401 })
    }

    console.log('Récupération des chantiers pour le dashboard...')

    try {
      // Récupérer tous les chantiers en cours
      const chantiers = await prisma.chantier.findMany({
        where: {
          // Retirer le filtre pour récupérer tous les chantiers
        },
        include: {
          client: {
            select: {
              nom: true,
              email: true,
              adresse: true
            }
          }
        }
      })

      if (!chantiers || !Array.isArray(chantiers)) {
        console.error('Les données reçues ne sont pas un tableau:', chantiers)
        return NextResponse.json([])
      }

      console.log(`Chantiers récupérés: ${chantiers.length}`)
      
      // Formater les données pour correspondre à l'interface attendue
      const chantiersFormatted = chantiers.map(chantier => {
        // Conversion des états pour l'interface utilisateur
        let etatChantier = 'En préparation'
        if (chantier.statut === 'EN_COURS') etatChantier = 'En cours'
        else if (chantier.statut === 'TERMINE') etatChantier = 'Terminé'
        else if (chantier.statut === 'A_VENIR') etatChantier = 'À venir'

        // Attribuer une progression selon l'état du chantier
        let progression = 0;
        if (etatChantier === "En préparation") {
          progression = 25;
        } else if (etatChantier === "En cours") {
          progression = 50;
        } else if (etatChantier === "Terminé") {
          progression = 100;
        }
        
        return {
          id: chantier.chantierId,
          nom: chantier.nomChantier,
          client: chantier.client?.nom || 'Client non spécifié',
          etat: etatChantier,
          montant: chantier.budget || 0,
          dateCommencement: chantier.dateDebut,
          createdAt: chantier.createdAt,
          progression,
          adresseChantier: chantier.adresseChantier || '',
          clientAdresse: chantier.client?.adresse || ''
        }
      });

      console.log(`Données formatées pour ${chantiersFormatted.length} chantiers`);
      
      return NextResponse.json(chantiersFormatted)
    } catch (dbError) {
      console.error('Erreur lors de l\'accès à la base de données:', dbError)
      // Retourner un tableau vide en cas d'erreur de base de données
      return NextResponse.json([])
    }
  } catch (error) {
    console.error('Erreur:', error)
    // Retourner un tableau vide en cas d'erreur générale
    return NextResponse.json([])
  }
} 
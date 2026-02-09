import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// Type pour un chantier dans les statistiques
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ChantierStats {
  chantierId: string;
  budget: number | null;
  statut: string;
  createdAt: Date | null;
}

// GET /api/dashboard/stats - Récupère les statistiques pour le dashboard
export async function GET() {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les données des chantiers avec leurs relations
    const chantiers = await prisma.chantier.findMany({
      include: {
        client: {
          select: {
            nom: true,
            adresse: true
          }
        },
        commandes: {
          select: {
            total: true,
            statut: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculer les KPIs
    const totalChantiers = chantiers.length
    const chantiersEnCours = chantiers.filter(c => c.statut === 'EN_COURS').length
    
    // Calculer le C.A. à venir : (commandes EN_PREPARATION + EN_COURS) - montants déjà facturés
    // 1. Récupérer les chantiers actifs (EN_PREPARATION ou EN_COURS)
    const chantiersActifs = await prisma.chantier.findMany({
      where: {
        statut: {
          in: ['EN_PREPARATION', 'EN_COURS']
        }
      },
      include: {
        commandes: {
          where: {
            statut: {
              not: 'BROUILLON'
            }
          },
          select: {
            id: true,
            total: true
          }
        },
        etatsAvancement: {
          where: {
            estFinalise: true
          },
          include: {
            lignes: {
              select: {
                montantActuel: true
              }
            }
          }
        }
      }
    })

    // 2. Calculer le total des commandes de base (hors avenants)
    const totalCommandesBase = chantiersActifs.reduce((sum, chantier) => {
      const montantCommandes = chantier.commandes.reduce((total, commande) => total + (commande.total || 0), 0)
      return sum + montantCommandes
    }, 0)

    // 3. Calculer le total des montants déjà facturés (états d'avancement finalisés : commande de base uniquement, sans avenants)
    const montantsDejFactures = chantiersActifs.reduce((sum, chantier) => {
      const montantEtats = chantier.etatsAvancement.reduce((totalEtat, etat) => {
        const montantLignes = etat.lignes.reduce((totalLignes, ligne) => {
          const montant = ligne.montantActuel != null && !isNaN(Number(ligne.montantActuel)) ? Number(ligne.montantActuel) : 0
          return totalLignes + montant
        }, 0)
        return totalEtat + montantLignes
      }, 0)
      return sum + montantEtats
    }, 0)

    // 4. C.A. à venir = Total commandes base - Montants déjà facturés
    const chiffreAffaires = Math.max(0, totalCommandesBase - montantsDejFactures)

    // Calculer le montant total des états d'avancement du mois précédent (basé sur le champ période "mois")
    const MOIS_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
    const maintenant = new Date()
    const moisPrecedent = new Date(maintenant.getFullYear(), maintenant.getMonth() - 1, 1)
    const moisPrecedentLabel = `${MOIS_NAMES[moisPrecedent.getMonth()]} ${moisPrecedent.getFullYear()}`

    const etatsAvancementMoisPrecedent = await prisma.etatAvancement.findMany({
      where: {
        mois: moisPrecedentLabel
      },
      include: {
        lignes: {
          select: {
            montantActuel: true
          }
        },
        avenants: {
          select: {
            montantActuel: true
          }
        }
      }
    })

    const montantEtatsAvancementMoisPrecedent = etatsAvancementMoisPrecedent.reduce((total, etat) => {
      const totalLignes = etat.lignes.reduce((sum, ligne) => {
        const montant = ligne.montantActuel != null && !isNaN(Number(ligne.montantActuel)) ? Number(ligne.montantActuel) : 0
        return sum + montant
      }, 0)
      const totalAvenants = etat.avenants.reduce((sum, avenant) => {
        const montant = avenant.montantActuel != null && !isNaN(Number(avenant.montantActuel)) ? Number(avenant.montantActuel) : 0
        return sum + montant
      }, 0)
      const etatTotal = totalLignes + totalAvenants
      return total + (isNaN(etatTotal) ? 0 : etatTotal)
    }, 0)

    // S'assurer que le résultat final n'est pas NaN
    const montantFinal = isNaN(montantEtatsAvancementMoisPrecedent) ? 0 : montantEtatsAvancementMoisPrecedent

    // Répartition pour le graphique
    const chantiersByCategory = {
      enPreparation: chantiers.filter(c => c.statut === 'EN_PREPARATION').length,
      enCours: chantiersEnCours,
      termines: chantiers.filter(c => c.statut === 'TERMINE').length
    }

    // Mapper les données pour l'affichage
    const chantiersMap = chantiers.map((chantier) => {
      // Conversion des états pour l'affichage
      let etat = 'En préparation'
      if (chantier.statut === 'EN_COURS') etat = 'En cours'
      else if (chantier.statut === 'TERMINE') etat = 'Terminé'
      else if (chantier.statut === 'A_VENIR') etat = 'À venir'

      return {
        id: chantier.id,
        nom: chantier.nomChantier,
        client: chantier.client?.nom || 'Client non spécifié',
        etat,
        adresse: chantier.client?.adresse,
        adresseChantier: chantier.adresseChantier
      }
    })

    const kpis = {
      totalChantiers,
      chantiersEnCours,
      chiffreAffaires,
      montantEtatsAvancementMoisPrecedent: montantFinal
    }

    return NextResponse.json({
      kpis,
      chantiersByCategory,
      chantiersMap
    })

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}
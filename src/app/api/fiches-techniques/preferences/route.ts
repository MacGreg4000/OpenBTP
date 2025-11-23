import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

/**
 * GET /api/fiches-techniques/preferences?chantierId=xxx
 * Récupère les préférences de fiches techniques pour un chantier
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chantierId = searchParams.get('chantierId')

    if (!chantierId) {
      return NextResponse.json({ error: 'chantierId requis' }, { status: 400 })
    }

    // Récupérer le dernier dossier technique (ou créer un dossier brouillon si aucun n'existe)
    const dossier = await prisma.dossierTechnique.findFirst({
      where: { chantierId },
      orderBy: { dateGeneration: 'desc' },
      include: {
        fiches: {
          include: {
            soustraitant: {
              select: {
                id: true,
                nom: true,
                logo: true
              }
            }
          }
        }
      }
    })

    // Si aucun dossier n'existe, retourner des données vides
    if (!dossier) {
      return NextResponse.json({
        ficheReferences: {},
        fichesSoustraitants: {},
        fichesRemarques: {}
      })
    }

    // Construire les objets de préférences depuis les fiches du dossier
    const ficheReferences: Record<string, string> = {}
    const fichesSoustraitants: Record<string, string> = {}
    const fichesRemarques: Record<string, string> = {}

    dossier.fiches.forEach(fiche => {
      if (fiche.ficheReference) {
        ficheReferences[fiche.ficheId] = fiche.ficheReference
      }
      if (fiche.soustraitantId) {
        fichesSoustraitants[fiche.ficheId] = fiche.soustraitantId
      }
      if (fiche.remarques) {
        fichesRemarques[fiche.ficheId] = fiche.remarques
      }
    })

    return NextResponse.json({
      ficheReferences,
      fichesSoustraitants,
      fichesRemarques
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des préférences' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/fiches-techniques/preferences
 * Sauvegarde les préférences de fiches techniques pour un chantier
 * Body: { chantierId, ficheId, ficheReference?, soustraitantId?, remarques? }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { chantierId, ficheId, ficheReference, soustraitantId, remarques } = body

    if (!chantierId || !ficheId) {
      return NextResponse.json(
        { error: 'chantierId et ficheId requis' },
        { status: 400 }
      )
    }

    // Convertir soustraitantId en string si fourni
    let soustraitantIdStr: string | null = null
    if (soustraitantId) {
      soustraitantIdStr = String(soustraitantId).trim() || null
      // Vérifier que c'est un nombre valide (l'ID est un nombre dans la base)
      if (soustraitantIdStr && isNaN(parseInt(soustraitantIdStr))) {
        return NextResponse.json(
          { error: 'soustraitantId invalide' },
          { status: 400 }
        )
      }
    }

    // Récupérer ou créer un dossier technique "brouillon" pour ce chantier
    let dossier = await prisma.dossierTechnique.findFirst({
      where: {
        chantierId,
        statut: 'BROUILLON'
      },
      orderBy: { dateGeneration: 'desc' }
    })

    if (!dossier) {
      // Créer un nouveau dossier brouillon
      dossier = await prisma.dossierTechnique.create({
        data: {
          chantierId,
          nom: `Brouillon - ${new Date().toLocaleDateString('fr-FR')}`,
          version: 1,
          statut: 'BROUILLON',
          url: '', // Pas de PDF pour un brouillon
          taille: 0,
          createdBy: session.user.id,
          includeTableOfContents: false
        }
      })
    }

    // Vérifier si une fiche existe déjà pour ce dossier
    const existingFiche = await prisma.dossierFiche.findFirst({
      where: {
        dossierId: dossier.id,
        ficheId
      }
    })

    if (existingFiche) {
      // Mettre à jour la fiche existante
      await prisma.dossierFiche.update({
        where: { id: existingFiche.id },
        data: {
          ficheReference: ficheReference || null,
          soustraitantId: soustraitantIdStr,
          remarques: remarques || null
        }
      })
    } else {
      // Créer une nouvelle fiche
      // Compter le nombre de fiches existantes pour déterminer l'ordre
      const count = await prisma.dossierFiche.count({
        where: { dossierId: dossier.id }
      })

      await prisma.dossierFiche.create({
        data: {
          dossierId: dossier.id,
          ficheId,
          ficheReference: ficheReference || null,
          soustraitantId: soustraitantIdStr,
          remarques: remarques || null,
          ordre: count + 1,
          version: 1,
          statut: 'BROUILLON'
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des préférences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde des préférences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/fiches-techniques/preferences
 * Met à jour les préférences de plusieurs fiches en une seule fois
 * Body: { chantierId, preferences: { ficheId: { ficheReference?, soustraitantId?, remarques? } } }
 */
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const { chantierId, preferences } = body

    if (!chantierId || !preferences) {
      return NextResponse.json(
        { error: 'chantierId et preferences requis' },
        { status: 400 }
      )
    }

    // Récupérer ou créer un dossier technique "brouillon" pour ce chantier
    let dossier = await prisma.dossierTechnique.findFirst({
      where: {
        chantierId,
        statut: 'BROUILLON'
      },
      orderBy: { dateGeneration: 'desc' }
    })

    if (!dossier) {
      dossier = await prisma.dossierTechnique.create({
        data: {
          chantierId,
          nom: `Brouillon - ${new Date().toLocaleDateString('fr-FR')}`,
          version: 1,
          statut: 'BROUILLON',
          url: '',
          taille: 0,
          createdBy: session.user.id,
          includeTableOfContents: false
        }
      })
    }

    // Mettre à jour toutes les fiches
    const updates = Object.entries(preferences).map(async ([ficheId, prefs]: [string, any]) => {
      // Convertir soustraitantId en string si fourni
      let soustraitantIdStr: string | null = null
      if (prefs.soustraitantId) {
        soustraitantIdStr = String(prefs.soustraitantId).trim() || null
        if (soustraitantIdStr && isNaN(parseInt(soustraitantIdStr))) {
          console.warn(`soustraitantId invalide pour fiche ${ficheId}: ${prefs.soustraitantId}`)
          soustraitantIdStr = null
        }
      }

      const existingFiche = await prisma.dossierFiche.findFirst({
        where: {
          dossierId: dossier.id,
          ficheId
        }
      })

      if (existingFiche) {
        await prisma.dossierFiche.update({
          where: { id: existingFiche.id },
          data: {
            ficheReference: prefs.ficheReference || null,
            soustraitantId: soustraitantIdStr,
            remarques: prefs.remarques || null
          }
        })
      } else {
        const count = await prisma.dossierFiche.count({
          where: { dossierId: dossier.id }
        })

        await prisma.dossierFiche.create({
          data: {
            dossierId: dossier.id,
            ficheId,
            ficheReference: prefs.ficheReference || null,
            soustraitantId: soustraitantIdStr,
            remarques: prefs.remarques || null,
            ordre: count + 1,
            version: 1,
            statut: 'BROUILLON'
          }
        })
      }
    })

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des préférences' },
      { status: 500 }
    )
  }
}


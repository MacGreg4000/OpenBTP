import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// PUT /api/fiches-techniques/dossier/[dossierId]/fiches - Mettre à jour les statuts des fiches
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { dossierId } = await params
    const { fichesStatuts, fichesRemplacees, fichesSoustraitants, fichesRemarques } = await request.json()

    // Vérifier que le dossier existe
    const dossier = await prisma.dossierTechnique.findUnique({
      where: { id: dossierId },
      include: { fiches: true }
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Mettre à jour les statuts des fiches existantes
    if (fichesStatuts) {
      for (const [ficheId, statut] of Object.entries(fichesStatuts)) {
        const fiche = dossier.fiches.find(f => f.ficheId === ficheId)
        if (fiche) {
          const updateData: any = {
            statut: statut as any
          }
          
          // Ajouter soustraitantId si fourni
          if (fichesSoustraitants && fichesSoustraitants[ficheId]) {
            updateData.soustraitantId = fichesSoustraitants[ficheId]
          } else if (fichesSoustraitants && fichesSoustraitants[ficheId] === '') {
            updateData.soustraitantId = null
          }
          
          // Ajouter remarques si fourni
          if (fichesRemarques && fichesRemarques[ficheId] !== undefined) {
            updateData.remarques = fichesRemarques[ficheId] || null
          }
          
          await prisma.dossierFiche.update({
            where: { id: fiche.id },
            data: updateData
          })
        }
      }
    }

    // Gérer les fiches remplacées
    if (fichesRemplacees) {
      for (const [ancienneFicheId, nouvelleFicheId] of Object.entries(fichesRemplacees)) {
        const ancienneFiche = dossier.fiches.find(f => f.ficheId === ancienneFicheId)
        if (ancienneFiche) {
          // Marquer l'ancienne fiche comme remplacée
          await prisma.dossierFiche.update({
            where: { id: ancienneFiche.id },
            data: {
              statut: 'A_REMPLACER'
            }
          })

          // Créer une nouvelle entrée pour la fiche de remplacement
          const nouvelleVersion = ancienneFiche.version + 1
          await prisma.dossierFiche.create({
            data: {
              dossierId: dossierId,
              ficheId: nouvelleFicheId as string,
              ficheReference: ancienneFiche.ficheReference,
              version: nouvelleVersion,
              statut: 'NOUVELLE_PROPOSITION',
              ordre: ancienneFiche.ordre,
              ficheRemplaceeId: ancienneFiche.id
            }
          })
        }
      }
    }

    // Récupérer le dossier mis à jour
    const dossierMisAJour = await prisma.dossierTechnique.findUnique({
      where: { id: dossierId },
      include: {
        fiches: {
          orderBy: { ordre: 'asc' }
        }
      }
    })

    return NextResponse.json(dossierMisAJour)
  } catch (error) {
    console.error('Erreur lors de la mise à jour des fiches:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des fiches' },
      { status: 500 }
    )
  }
}


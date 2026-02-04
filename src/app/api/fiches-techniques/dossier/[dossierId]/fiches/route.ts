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
    const { fichesStatuts, fichesRemplacees, fichesSoustraitants, fichesReferences, fichesRemarques, fichesAAjouter, fichesASupprimer } = await request.json()

    // Vérifier que le dossier existe
    const dossier = await prisma.dossierTechnique.findUnique({
      where: { id: dossierId },
      include: { fiches: true }
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Supprimer les fiches retirées du dossier (sans modifier le schéma)
    const idsASupprimer = Array.isArray(fichesASupprimer) ? fichesASupprimer.filter((id: unknown) => typeof id === 'string') : []
    if (idsASupprimer.length > 0) {
      await prisma.dossierFiche.deleteMany({
        where: { id: { in: idsASupprimer }, dossierId }
      })
    }
    const idsSupprimes = new Set(idsASupprimer)

    // Mettre à jour les statuts des fiches existantes (sauf celles supprimées)
    if (fichesStatuts) {
      for (const [ficheId, statut] of Object.entries(fichesStatuts)) {
        const fiche = dossier.fiches.find(f => f.ficheId === ficheId && !idsSupprimes.has(f.id))
        if (fiche) {
          const updateData: {
            statut: 'VALIDEE' | 'NOUVELLE_PROPOSITION' | 'BROUILLON'
            soustraitantId?: number | null
            remarques?: string | null
            ficheReference?: string | null
            version?: number
            ficheRemplaceeId?: string | null
          } = {
            statut: statut as 'VALIDEE' | 'NOUVELLE_PROPOSITION' | 'BROUILLON'
          }
          
          // Ajouter soustraitantId si fourni
          if (fichesSoustraitants && fichesSoustraitants[ficheId]) {
            updateData.soustraitantId = fichesSoustraitants[ficheId]
          } else if (fichesSoustraitants && fichesSoustraitants[ficheId] === '') {
            updateData.soustraitantId = null
          }
          
          // Ajouter ficheReference (CSC) si fourni
          if (fichesReferences && fichesReferences[ficheId] !== undefined) {
            updateData.ficheReference = fichesReferences[ficheId] || null
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

    // Gérer les fiches remplacées (sauf celles déjà supprimées)
    if (fichesRemplacees) {
      for (const [ancienneFicheId, nouvelleFicheId] of Object.entries(fichesRemplacees)) {
        const ancienneFiche = dossier.fiches.find(f => f.ficheId === ancienneFicheId && !idsSupprimes.has(f.id))
        if (ancienneFiche) {
          // Supprimer l'ancienne fiche (elle est remplacée)
          await prisma.dossierFiche.delete({
            where: { id: ancienneFiche.id }
          })

          // Créer une nouvelle entrée pour la fiche de remplacement
          const nouvelleVersion = ancienneFiche.version + 1
          // Utiliser la référence modifiée si disponible, sinon celle de l'ancienne fiche
          const nouvelleReference = (fichesReferences && fichesReferences[ancienneFicheId]) 
            ? fichesReferences[ancienneFicheId] 
            : ancienneFiche.ficheReference
          await prisma.dossierFiche.create({
            data: {
              dossierId: dossierId,
              ficheId: nouvelleFicheId as string,
              ficheReference: nouvelleReference,
              version: nouvelleVersion,
              statut: 'NOUVELLE_PROPOSITION',
              ordre: ancienneFiche.ordre,
              ficheRemplaceeId: ancienneFiche.id,
              soustraitantId: ancienneFiche.soustraitantId,
              remarques: ancienneFiche.remarques
            }
          })
        }
      }
    }

    // Gérer les fiches à ajouter
    if (fichesAAjouter && Array.isArray(fichesAAjouter) && fichesAAjouter.length > 0) {
      // Compter le nombre de fiches existantes après suppressions pour déterminer l'ordre
      const nombreFichesExistantes = dossier.fiches.filter(f => !idsSupprimes.has(f.id)).length
      
      for (let index = 0; index < fichesAAjouter.length; index++) {
        const ficheAAjouter = fichesAAjouter[index]
        const ficheId = ficheAAjouter.ficheId || ficheAAjouter
        
        // Vérifier que la fiche n'existe pas déjà dans le dossier
        const ficheExistante = dossier.fiches.find(f => f.ficheId === ficheId)
        if (!ficheExistante) {
          await prisma.dossierFiche.create({
            data: {
              dossierId: dossierId,
              ficheId: ficheId,
              ficheReference: (fichesReferences && fichesReferences[ficheId]) ? fichesReferences[ficheId] : null,
              version: 1,
              statut: (fichesStatuts && fichesStatuts[ficheId]) ? (fichesStatuts[ficheId] as 'VALIDEE' | 'NOUVELLE_PROPOSITION' | 'BROUILLON') : 'BROUILLON',
              ordre: nombreFichesExistantes + index + 1,
              soustraitantId: (fichesSoustraitants && fichesSoustraitants[ficheId]) ? String(fichesSoustraitants[ficheId]) : null,
              remarques: (fichesRemarques && fichesRemarques[ficheId]) ? fichesRemarques[ficheId] : null
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


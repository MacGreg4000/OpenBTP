import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { checkRole } from '@/middleware/checkRole'
import fs from 'fs'
import path from 'path'

// GET /api/fiches-techniques/dossier/[dossierId] - Récupérer un dossier avec ses fiches
export async function GET(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { dossierId } = await params

    const dossier = await prisma.dossierTechnique.findUnique({
      where: { id: dossierId },
      include: {
        fiches: {
          orderBy: { ordre: 'asc' }
        },
        chantier: {
          include: {
            client: true
          }
        },
        User: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    return NextResponse.json(dossier)
  } catch (error) {
    console.error('Erreur lors de la récupération du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du dossier' },
      { status: 500 }
    )
  }
}

// PUT /api/fiches-techniques/dossier/[dossierId] - Mettre à jour le statut d'un dossier
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
    const { statut } = await request.json()

    const dossier = await prisma.dossierTechnique.update({
      where: { id: dossierId },
      data: {
        statut: statut
      }
    })

    return NextResponse.json(dossier)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du dossier' },
      { status: 500 }
    )
  }
}

// DELETE /api/fiches-techniques/dossier/[dossierId] - Supprimer un dossier (admin uniquement)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ dossierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est admin
    const roleCheck = await checkRole('ADMIN')
    if (roleCheck) {
      return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.status })
    }

    const { dossierId } = await params

    // Récupérer le dossier avec ses fiches et le document associé
    const dossier = await prisma.dossierTechnique.findUnique({
      where: { id: dossierId },
      include: {
        fiches: true
      }
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouvé' }, { status: 404 })
    }

    // Supprimer le fichier PDF s'il existe
    if (dossier.url) {
      try {
        const filePath = path.join(process.cwd(), 'public', dossier.url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (fileError) {
        console.error('Erreur lors de la suppression du fichier PDF:', fileError)
        // Continuer même si la suppression du fichier échoue
      }
    }

    // Supprimer les fiches du dossier
    await prisma.dossierFiche.deleteMany({
      where: { dossierId: dossierId }
    })

    // Supprimer le document associé s'il existe (via metadata.dossierTechniqueId)
    const documents = await prisma.document.findMany({
      where: {
        chantierId: dossier.chantierId,
        type: 'DOSSIER_TECHNIQUE'
      }
    })
    
    for (const doc of documents) {
      if (doc.metadata && typeof doc.metadata === 'object' && 'dossierTechniqueId' in doc.metadata) {
        if (doc.metadata && typeof doc.metadata === 'object' && 'dossierTechniqueId' in doc.metadata && (doc.metadata as { dossierTechniqueId?: string }).dossierTechniqueId === dossierId) {
          await prisma.document.delete({
            where: { id: doc.id }
          })
        }
      }
    }

    // Supprimer le dossier
    await prisma.dossierTechnique.delete({
      where: { id: dossierId }
    })

    return NextResponse.json({ success: true, message: 'Dossier supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du dossier' },
      { status: 500 }
    )
  }
}


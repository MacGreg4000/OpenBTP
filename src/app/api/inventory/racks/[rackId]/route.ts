import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismaWithExtensions } from '@/lib/prisma/types'

export async function DELETE(request: Request, props: { params: Promise<{ rackId: string }> }) {
  const params = await props.params;
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier les droits d'administration
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Autorisation insuffisante - seuls les administrateurs peuvent supprimer des racks' },
        { status: 403 }
      )
    }

    const rackId = params.rackId
    
    if (!rackId) {
      return NextResponse.json({ error: 'ID de rack requis' }, { status: 400 })
    }
    
    // Vérifier que le rack existe
    const rack = await prismaWithExtensions.rack.findUnique({
      where: { id: rackId },
      include: {
        emplacements: {
          include: {
            materiaux: true
          }
        }
      }
    })
    
    if (!rack) {
      return NextResponse.json({ error: 'Rack non trouvé' }, { status: 404 })
    }
    
    // Vérifier que le rack est vide (aucun matériau dans ses emplacements)
    const hasMateriaux = rack.emplacements.some(emplacement => emplacement.materiaux.length > 0)
    
    if (hasMateriaux) {
      return NextResponse.json({ 
        error: 'Impossible de supprimer un rack qui contient des matériaux. Veuillez d\'abord vider tous les emplacements.' 
      }, { status: 400 })
    }
    
    // Supprimer d'abord tous les emplacements du rack
    await prismaWithExtensions.emplacement.deleteMany({
      where: { rackId: rackId }
    })
    
    // Puis supprimer le rack
    await prismaWithExtensions.rack.delete({
      where: { id: rackId }
    })
    
    return NextResponse.json({ 
      message: 'Rack supprimé avec succès',
      deletedRack: {
        id: rack.id,
        nom: rack.nom,
        emplacementsSupprimes: rack.emplacements.length
      }
    })
  } catch (error) {
    console.error('Erreur lors de la suppression du rack:', error)
    return NextResponse.json({ 
      error: 'Erreur lors de la suppression du rack' 
    }, { status: 500 })
  }
}

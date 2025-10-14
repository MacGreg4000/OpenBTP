import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prismaWithExtensions } from '@/lib/prisma/types'

export async function DELETE(request: Request, props: { params: Promise<{ materiauId: string }> }) {
  const params = await props.params;
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const materiauId = params.materiauId
    
    if (!materiauId) {
      return NextResponse.json({ error: 'ID de matériau requis' }, { status: 400 })
    }
    
    // Trouver d'abord le matériau pour avoir accès à son emplacementId
    const materiau = await prismaWithExtensions.materiau.findUnique({
      where: { id: materiauId },
      include: { emplacement: true }
    })
    if (!materiau) {
      return NextResponse.json({ error: 'Matériau non trouvé' }, { status: 404 })
    }
    
    const emplacementId = materiau.emplacementId
    
    // Supprimer le matériau
    await prismaWithExtensions.materiau.delete({
      where: { id: materiauId }
    })
    
    // Mettre à jour le statut de l'emplacement
    if (emplacementId) {
      // Vérifier si d'autres matériaux utilisent cet emplacement
      const countMateriaux = await prismaWithExtensions.materiau.count({
        where: { emplacementId }
      })
      
      // Si aucun autre matériau n'utilise cet emplacement, le marquer comme libre
      if (countMateriaux === 0) {
        await prismaWithExtensions.emplacement.update({
          where: { id: emplacementId },
          data: { statut: 'libre' }
        })
      }
    }
    
    return NextResponse.json({ message: 'Matériau supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du matériau:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression du matériau' }, { status: 500 })
  }
} 
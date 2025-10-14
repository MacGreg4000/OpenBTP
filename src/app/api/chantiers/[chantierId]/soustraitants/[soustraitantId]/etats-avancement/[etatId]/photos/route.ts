import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { writeFile } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { mkdir } from 'fs/promises'

// Interface pour les photos
interface Photo {
  id: number;
  soustraitantEtatAvancementId: number;
  url: string;
  description: string | null;
  dateAjout: Date;
}

// POST /api/chantiers/[chantierId]/soustraitants/[soustraitantId]/etats-avancement/[etatId]/photos
// Ajoute des photos à un état d'avancement sous-traitant
export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string, etatId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que l'état d'avancement existe
    const etatAvancement = await prisma.soustraitant_etat_avancement.findUnique({
      where: {
        id: parseInt(params.etatId)
      }
    })

    if (!etatAvancement) {
      return NextResponse.json(
        { error: 'État d\'avancement non trouvé' },
        { status: 404 }
      )
    }

    // Récupérer le formData
    const formData = await request.formData()
    const photos = formData.getAll('photos')

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { error: 'Aucune photo fournie' },
        { status: 400 }
      )
    }

    // Créer le dossier pour les photos si nécessaire
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'chantiers', params.chantierId, 'soustraitants', params.soustraitantId, 'etats', params.etatId)
    await mkdir(uploadDir, { recursive: true })

    // Traiter chaque photo
    const savedPhotos: Photo[] = []
    for (const photo of photos) {
      if (!(photo instanceof File)) {
        continue
      }

      const filename = `${uuidv4()}_${photo.name.replace(/\s+/g, '_')}`.toLowerCase()
      const buffer = Buffer.from(await photo.arrayBuffer())
      const filePath = path.join(uploadDir, filename)
      
      // Sauvegarder le fichier
      await writeFile(filePath, buffer)
      
      // URL relative pour accéder à la photo
      const photoUrl = `/uploads/chantiers/${params.chantierId}/soustraitants/${params.soustraitantId}/etats/${params.etatId}/${filename}`
      
      // Utiliser une requête SQL raw pour insérer la photo
      await prisma.$executeRaw`
        INSERT INTO photo_soustraitant_etat_avancement 
        (soustraitantEtatAvancementId, url, description, dateAjout) 
        VALUES (${parseInt(params.etatId)}, ${photoUrl}, ${photo.name}, NOW())
      `
      
      // Récupérer la photo insérée
      const insertedPhoto = await prisma.$queryRaw`
        SELECT * FROM photo_soustraitant_etat_avancement 
        WHERE soustraitantEtatAvancementId = ${parseInt(params.etatId)} 
        AND url = ${photoUrl} 
        ORDER BY id DESC LIMIT 1
      ` as Photo[];
      
      savedPhotos.push(insertedPhoto[0])
    }

    return NextResponse.json(savedPhotos)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload des photos' },
      { status: 500 }
    )
  }
} 
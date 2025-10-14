import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Interface pour typer les résultats de la requête SQL brute
interface RemarqueResult {
  id: string
  description: string
  localisation: string | null
  estResolue: number | boolean
  dateResolution: string | Date | null
  estValidee: number | boolean
  estRejetee: number | boolean
  raisonRejet: string | null
  createdAt: string | Date
  // Champs supplémentaires éventuels renvoyés par la requête SQL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

interface PhotoResult {
  id: string
  url: string
  estPreuve: number | boolean
  remarqueId: string
}

interface TagResult {
  id: string
  nom: string
  email: string | null
  typeTag: string
  remarqueId: string
}

// Fonction pour formater correctement les dates
function formatDate(date: unknown): string | null {
  if (!date) return null;
  
  try {
    // Si c'est déjà une chaîne formatée, la retourner
    if (typeof date === 'string') {
      // Convertir les dates MySQL en format ISO
      if (date.includes(' ') && !date.includes('T')) {
        return date.replace(' ', 'T');
      }
      return date;
    }
    
    // Si c'est un objet Date, convertir en ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    // Sinon essayer de créer une nouvelle date en castant prudemment
    return new Date(date as string | number | Date).toISOString();
  } catch (e) {
    console.error("Erreur lors du formatage de la date:", e, date);
    return null;
  }
}

// Fonction pour corriger les URLs des photos
function corrigerUrlPhotos(photos: Array<{ url?: unknown }>): Array<{ url?: string }> {
  if (!photos || !Array.isArray(photos)) return [];
  
  const result: Array<{ url?: string }> = []
  for (const photo of photos) {
    if (!photo) continue;
    
    // Si l'objet photo n'est pas valide ou si l'URL est un nombre
    if (typeof photo !== 'object' || typeof (photo as { url?: unknown }).url === 'number') {
      console.error('Format de photo invalide:', photo);
      continue;
    }
    
    // Si l'URL ne commence pas par http ou /
    if ((photo as { url?: unknown }).url && typeof (photo as { url?: unknown }).url === 'string') {
      const url = (photo as { url: string }).url;
      if (!url.startsWith('http') && !url.startsWith('/')) {
        result.push({ url: `/uploads/${url}` });
        continue;
      }
    }
    result.push({ url: String((photo as { url?: unknown }).url || '') });
  }
  return result;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Attendre la Promise params
    const resolvedParams = await params;
    const id = resolvedParams.id;
    
    const { searchParams } = new URL(request.url)
    const pin = searchParams.get('pin')

    if (!id || !pin) {
      return NextResponse.json(
        { error: 'ID de réception et code PIN requis' },
        { status: 400 }
      )
    }

    // Vérifier d'abord le PIN
    const checkPin = await prisma.$queryRaw`
      SELECT id FROM reception_chantier
      WHERE id = ${id} AND codePIN = ${pin}
    `

    if (Array.isArray(checkPin) && checkPin.length === 0) {
      return NextResponse.json(
        { error: 'Code PIN invalide ou réception inexistante' },
        { status: 401 }
      )
    }

    // Récupérer les remarques
    const remarques = await prisma.$queryRaw<RemarqueResult[]>`
      SELECT * FROM remarque_reception
      WHERE receptionId = ${id}
      ORDER BY createdAt DESC
    `

    // Récupérer les photos associées aux remarques
    const photos = await prisma.$queryRaw<PhotoResult[]>`
      SELECT p.* FROM photo_remarque p
      JOIN remarque_reception r ON p.remarqueId = r.id
      WHERE r.receptionId = ${id}
    `

    // Récupérer les tags associés aux remarques
    const tags = await prisma.$queryRaw<TagResult[]>`
      SELECT t.* FROM tag_remarque t
      JOIN remarque_reception r ON t.remarqueId = r.id
      WHERE r.receptionId = ${id}
    `

    // Structurer les résultats
    const remarquesAvecDetails = remarques.map(remarque => {
      const photosDeCetteRemarque = photos.filter(p => p.remarqueId === remarque.id)
        .map(p => ({
          id: p.id,
          url: p.url,
          estPreuve: p.estPreuve === 1 || p.estPreuve === true
        }))

      const tagsDeCetteRemarque = tags.filter(t => t.remarqueId === remarque.id)
        .map(t => ({
          id: t.id,
          nom: t.nom,
          email: t.email,
          typeTag: t.typeTag
        }))

      return {
        id: remarque.id,
        description: remarque.description,
        localisation: remarque.localisation,
        estResolue: remarque.estResolue === 1 || remarque.estResolue === true,
        estValidee: remarque.estValidee === 1 || remarque.estValidee === true,
        estRejetee: remarque.estRejetee === 1 || remarque.estRejetee === true,
        dateResolution: formatDate(remarque.dateResolution),
        raisonRejet: remarque.raisonRejet,
        createdAt: formatDate(remarque.createdAt),
        photos: corrigerUrlPhotos(photosDeCetteRemarque),
        tags: tagsDeCetteRemarque
      }
    })

    return NextResponse.json(remarquesAvecDetails)
  } catch (error) {
    console.error('Erreur lors de la récupération des remarques:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de la récupération des remarques' },
      { status: 500 }
    )
  }
}
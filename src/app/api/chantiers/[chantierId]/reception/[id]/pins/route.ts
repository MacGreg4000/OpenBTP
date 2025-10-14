import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// Générer un code PIN aléatoire (numérique, 6 chiffres)
function generatePIN() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// GET /api/chantiers/[chantierId]/reception/[id]/pins
// Récupérer tous les PIN des sous-traitants pour une réception
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { chantierId, id: receptionId } = resolvedParams

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la réception existe et appartient au chantier
    const reception = await prisma.receptionChantier.findFirst({
      where: {
        id: receptionId,
        chantierId
      }
    })

    if (!reception) {
      return NextResponse.json(
        { error: 'Réception non trouvée ou n\'appartient pas à ce chantier' },
        { status: 404 }
      )
    }

    // Récupérer les PIN associés à cette réception avec une requête SQL directe
    const pins = await prisma.$queryRaw`
      SELECT sp.*, s.id as soustraitantId, s.nom as soustraitantNom, s.email as soustraitantEmail
      FROM soustraitant_pin sp
      LEFT JOIN soustraitant s ON sp.soustraitantId = s.id
      WHERE sp.receptionId = ${receptionId}
    `;

    // Formater les résultats pour avoir une structure cohérente
    type PinRow = {
      id: string
      receptionId: string
      codePIN: string
      estInterne: number | boolean
      createdAt: string | Date
      updatedAt: string | Date
      soustraitantId?: string | null
      soustraitantNom?: string | null
      soustraitantEmail?: string | null
    }
    const formattedPins = (pins as unknown[] as PinRow[]).map((pin) => ({
      id: pin.id,
      receptionId: pin.receptionId,
      codePIN: pin.codePIN,
      estInterne: Boolean(pin.estInterne),
      createdAt: pin.createdAt,
      updatedAt: pin.updatedAt,
      soustraitant: pin.soustraitantId
        ? { id: pin.soustraitantId, nom: pin.soustraitantNom || '', email: pin.soustraitantEmail || '' }
        : null,
    }))

    return NextResponse.json(formattedPins)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des PINs' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/reception/[id]/pins
// Créer un nouveau PIN pour un sous-traitant ou l'équipe interne
export async function POST(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string }> }
) {
  try {
    const resolvedParams = await params
    const { chantierId, id: receptionId } = resolvedParams

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la réception existe et appartient au chantier
    const reception = await prisma.receptionChantier.findFirst({
      where: {
        id: receptionId,
        chantierId
      }
    })

    if (!reception) {
      return NextResponse.json(
        { error: 'Réception non trouvée ou n\'appartient pas à ce chantier' },
        { status: 404 }
      )
    }

    // Récupérer les données de la requête
    const body = await request.json()
    const { soustraitantId, estInterne } = body

    // Vérifier si les champs requis sont présents
    if ((!soustraitantId && !estInterne) || (soustraitantId && estInterne)) {
      return NextResponse.json(
        { error: 'Vous devez fournir soit un soustraitantId, soit marquer comme équipe interne' },
        { status: 400 }
      )
    }

    // Vérifier si un PIN existe déjà pour ce sous-traitant/cette réception
    if (soustraitantId) {
      const existingPins = await prisma.$queryRaw`
        SELECT id FROM soustraitant_pin
        WHERE receptionId = ${receptionId} AND soustraitantId = ${soustraitantId}
        LIMIT 1
      `;

      if (Array.isArray(existingPins) && (existingPins as unknown[]).length > 0) {
        return NextResponse.json(
          { error: 'Un PIN existe déjà pour ce sous-traitant dans cette réception' },
          { status: 400 }
        )
      }
    }

    // Générer un nouveau PIN unique
    let newPIN = generatePIN()
    let pinExists = true
    
    // S'assurer que le PIN est unique
    while (pinExists) {
      const existingPINs = await prisma.$queryRaw`
        SELECT id FROM soustraitant_pin
        WHERE codePIN = ${newPIN}
        LIMIT 1
      `;
      
      if (!existingPINs || (existingPINs as unknown[]).length === 0) {
        pinExists = false;
      } else {
        newPIN = generatePIN();
      }
    }
    
    // Créer le nouveau PIN en utilisant une transaction
    const pin = await prisma.$transaction(async (tx) => {
      // Générer un UUID pour l'ID
      const uuid = await tx.$queryRaw`SELECT UUID() as id` as unknown as Array<{ id: string }>
      const id = uuid[0].id
      
      // Insérer le PIN
      await tx.$executeRaw`
        INSERT INTO soustraitant_pin (
          id, receptionId, soustraitantId, codePIN, estInterne, 
          createdAt, updatedAt
        ) VALUES (
          ${id}, 
          ${receptionId}, 
          ${estInterne ? null : soustraitantId}, 
          ${newPIN}, 
          ${estInterne}, 
          NOW(), 
          NOW()
        )
      `;
      
      // Récupérer le PIN créé avec les informations du sous-traitant
      const pins = await tx.$queryRaw`
        SELECT sp.*, s.id as soustraitantId, s.nom as soustraitantNom, s.email as soustraitantEmail
        FROM soustraitant_pin sp
        LEFT JOIN soustraitant s ON sp.soustraitantId = s.id
        WHERE sp.id = ${id}
      `;
      
      type PinRow = {
        id: string
        receptionId: string
        codePIN: string
        estInterne: number | boolean
        createdAt: string | Date
        updatedAt: string | Date
        soustraitantId?: string | null
        soustraitantNom?: string | null
        soustraitantEmail?: string | null
      }
      const createdPin = (pins as unknown[] as Array<PinRow>)[0]
      
      return {
        id: createdPin.id,
        receptionId: createdPin.receptionId,
        codePIN: createdPin.codePIN,
        estInterne: Boolean(createdPin.estInterne),
        createdAt: createdPin.createdAt,
        updatedAt: createdPin.updatedAt,
        soustraitant: createdPin.soustraitantId
          ? { id: createdPin.soustraitantId, nom: createdPin.soustraitantNom || '', email: createdPin.soustraitantEmail || '' }
          : null,
      }
    });
    
    return NextResponse.json(pin)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du PIN' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/reception/[id]/pins/[pinId]
// Supprimer un PIN spécifique
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ chantierId: string; id: string; pinId: string }> }
) {
  try {
    const resolvedParams = await params
    const { chantierId, id: receptionId, pinId } = resolvedParams

    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier que la réception existe et appartient au chantier
    const reception = await prisma.receptionChantier.findFirst({
      where: {
        id: receptionId,
        chantierId
      }
    })

    if (!reception) {
      return NextResponse.json(
        { error: 'Réception non trouvée ou n\'appartient pas à ce chantier' },
        { status: 404 }
      )
    }

    // Vérifier que le PIN existe et appartient à cette réception
    const existingPINs = await prisma.$queryRaw`
      SELECT id FROM soustraitant_pin
      WHERE id = ${pinId} AND receptionId = ${receptionId}
      LIMIT 1
    `;

    if (!existingPINs || (existingPINs as unknown[]).length === 0) {
      return NextResponse.json(
        { error: 'PIN non trouvé ou n\'appartient pas à cette réception' },
        { status: 404 }
      )
    }

    // Supprimer le PIN
    await prisma.$executeRaw`
      DELETE FROM soustraitant_pin
      WHERE id = ${pinId}
    `;

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du PIN' },
      { status: 500 }
    )
  }
} 
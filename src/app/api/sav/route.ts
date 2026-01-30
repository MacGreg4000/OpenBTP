import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { 
  CreateTicketSAVData, 
  TypeTicketSAV, 
  PrioriteSAV, 
  StatutSAV,
  FiltresSAV 
} from '@/types/sav'
import { generateTicketSAVNumber, validateTicketSAVData } from '@/lib/sav/utils'
import { notifier } from '@/lib/services/notificationService'

/**
 * GET /api/sav
 * Récupère la liste des tickets SAV avec filtres optionnels
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Extraction des paramètres de filtre
    const filtres: FiltresSAV = {
      chantierId: searchParams.get('chantierId') || undefined,
      statut: searchParams.get('statut')?.split(',') as StatutSAV[] || undefined,
      priorite: searchParams.get('priorite')?.split(',') as PrioriteSAV[] || undefined,
      type: searchParams.get('type')?.split(',') as TypeTicketSAV[] || undefined,
      technicienAssignId: searchParams.get('technicienAssignId') || undefined,
      soustraitantAssignId: searchParams.get('soustraitantAssignId') || undefined,
      dateDebutPeriode: searchParams.get('dateDebutPeriode') || undefined,
      dateFinPeriode: searchParams.get('dateFinPeriode') || undefined,
      recherche: searchParams.get('recherche') || undefined
    }

    // Construction de la clause WHERE
    const whereClause: Record<string, unknown> = {}

    if (filtres.chantierId) {
      whereClause.chantierId = filtres.chantierId
    }

    if (filtres.statut && filtres.statut.length > 0) {
      whereClause.statut = { in: filtres.statut }
    } else {
      // Par défaut : exclure Résolu, Clos, Annulé pour éviter des listes interminables
      whereClause.statut = {
        notIn: [StatutSAV.RESOLU, StatutSAV.CLOS, StatutSAV.ANNULE]
      }
    }

    if (filtres.priorite && filtres.priorite.length > 0) {
      whereClause.priorite = { in: filtres.priorite }
    }

    if (filtres.type && filtres.type.length > 0) {
      whereClause.type = { in: filtres.type }
    }

    if (filtres.technicienAssignId) {
      whereClause.technicienAssignId = filtres.technicienAssignId
    }

    if (filtres.soustraitantAssignId) {
      whereClause.soustraitantAssignId = filtres.soustraitantAssignId
    }

    if (filtres.dateDebutPeriode || filtres.dateFinPeriode) {
      ;(whereClause as { dateDemande?: { gte?: Date; lte?: Date } }).dateDemande = {}
      if (filtres.dateDebutPeriode) {
        ;((whereClause as { dateDemande?: { gte?: Date; lte?: Date } }).dateDemande as { gte?: Date }).gte = new Date(filtres.dateDebutPeriode)
      }
      if (filtres.dateFinPeriode) {
        ;((whereClause as { dateDemande?: { gte?: Date; lte?: Date } }).dateDemande as { lte?: Date }).lte = new Date(filtres.dateFinPeriode)
      }
    }

    if (filtres.recherche) {
      whereClause.OR = [
        { titre: { contains: filtres.recherche } },
        { description: { contains: filtres.recherche } },
        { numTicket: { contains: filtres.recherche } },
        { localisation: { contains: filtres.recherche } }
      ]
    }

    // Pagination
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '25')))

    // Récupération des tickets SAV depuis la base de données
    const [total, tickets] = await Promise.all([
      prisma.ticketSAV.count({ where: whereClause }),
      prisma.ticketSAV.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            id: true,
            chantierId: true,
            nomChantier: true,
            clientNom: true
          }
        },
        technicienAssign: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        soustraitantAssign: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            interventions: true,
            documents: true,
            photos: true,
            commentaires: true
          }
        }
      },
      orderBy: [
        { dateDemande: 'desc' }
      ],
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    ])

    return NextResponse.json({
      data: tickets,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })

  } catch (error) {
    console.error('Erreur lors de la récupération des tickets SAV:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    console.error('Détails de l\'erreur:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des tickets SAV', details: errorMessage },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sav
 * Crée un nouveau ticket SAV
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await request.json()
    const data: CreateTicketSAVData = body

    // Validation des données
    const validation = validateTicketSAVData(data)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors },
        { status: 400 }
      )
    }

    // Vérification chantier si fourni (sinon ticket libre)
    let chantier: { id: string } | null = null
    if (data.chantierId) {
      chantier = await prisma.chantier.findFirst({
        where: { chantierId: data.chantierId }
      })
      if (!chantier) {
        return NextResponse.json(
          { error: 'Chantier introuvable' },
          { status: 404 }
        )
      }
    }

    // Vérification du technicien assigné si spécifié
    if (data.technicienAssignId) {
      const technicien = await prisma.user.findUnique({
        where: { id: data.technicienAssignId }
      })

      if (!technicien) {
        return NextResponse.json(
          { error: 'Technicien introuvable' },
          { status: 404 }
        )
      }
    }

    // Vérification du sous-traitant assigné si spécifié
    if (data.soustraitantAssignId) {
      const soustraitant = await prisma.soustraitant.findUnique({
        where: { id: data.soustraitantAssignId }
      })

      if (!soustraitant) {
        return NextResponse.json(
          { error: 'Sous-traitant introuvable' },
          { status: 404 }
        )
      }
    }

    // Génération du numéro de ticket
    const numTicket = await generateTicketSAVNumber()

    // Création du ticket SAV dans la base de données
    const nouveauTicket = await prisma.ticketSAV.create({
      data: {
        numTicket,
        chantierId: data.chantierId || null,
        titre: data.titre.trim(),
        nomLibre: (data as { nomLibre?: string }).nomLibre?.trim() || null,
        description: data.description.trim(),
        type: data.type,
        priorite: data.priorite,
        statut: StatutSAV.NOUVEAU,
        localisation: data.localisation?.trim(),
        adresseIntervention: data.adresseIntervention?.trim(),
        dateInterventionSouhaitee: data.dateInterventionSouhaitee 
          ? new Date(data.dateInterventionSouhaitee) 
          : undefined,
        technicienAssignId: null,
        ouvrierInterneAssignId: data.ouvrierInterneAssignId || null,
        soustraitantAssignId: data.soustraitantAssignId || null,
        coutEstime: 0,
        contactNom: data.contactNom?.trim(),
        contactTelephone: data.contactTelephone?.trim(),
        contactEmail: data.contactEmail?.trim(),
        createdBy: session.user.id
      },
      include: {
        chantier: {
          select: {
            id: true,
            chantierId: true,
            nomChantier: true,
            clientNom: true
          }
        },
        technicienAssign: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        ouvrierInterneAssign: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            email: true
          }
        },
        soustraitantAssign: {
          select: {
            id: true,
            nom: true,
            email: true
          }
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 🔔 NOTIFICATION : Nouveau ticket SAV créé
    await notifier({
      code: 'SAV_TICKET_CREE',
      rolesDestinataires: ['ADMIN', 'MANAGER'],
      metadata: {
        num: nouveauTicket.numTicket,
        titre: nouveauTicket.titre,
        priorite: nouveauTicket.priorite,
        ticketSAVId: nouveauTicket.id,
        chantierNom: nouveauTicket.chantier?.nomChantier || nouveauTicket.nomLibre || 'Chantier libre',
      },
    })

    // Si assigné à un technicien, notifier le technicien
    if (nouveauTicket.technicienAssign?.id) {
      await notifier({
        code: 'SAV_TICKET_ASSIGNE',
        destinataires: [nouveauTicket.technicienAssign.id],
        metadata: {
          num: nouveauTicket.numTicket,
          titre: nouveauTicket.titre,
          ticketSAVId: nouveauTicket.id,
        },
      })
    }

    // Si assigné à un ouvrier interne, notifier l'ouvrier
    if (nouveauTicket.ouvrierInterneAssign?.id) {
      await notifier({
        code: 'SAV_TICKET_ASSIGNE',
        destinataires: [nouveauTicket.ouvrierInterneAssign.id],
        metadata: {
          num: nouveauTicket.numTicket,
          titre: nouveauTicket.titre,
          ticketSAVId: nouveauTicket.id,
        },
      })
    }

    return NextResponse.json(nouveauTicket, { status: 201 })

  } catch (error) {
    console.error('Erreur lors de la création du ticket SAV:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du ticket SAV' },
      { status: 500 }
    )
  }
} 
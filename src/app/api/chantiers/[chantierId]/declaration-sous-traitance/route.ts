import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmailWithAttachment } from '@/lib/email-sender'
import { readFile } from 'fs/promises'
import { join } from 'path'

interface DocumentSelection {
  ouvrierId: string
  documentIds: string[]
}

interface SoustraitantSelection {
  id: string
  documentsOuvriers: DocumentSelection[]
}

interface RequestBody {
  soustraitants: SoustraitantSelection[]
  destinataireEmail: string
  destinataireType: 'contact' | 'libre'
}

export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const params = await props.params
    const body: RequestBody = await request.json()

    // Vérifier que le chantier existe
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId: params.chantierId },
      include: {
        client: {
          include: {
            contacts: true
          }
        }
      }
    })

    if (!chantier) {
      return NextResponse.json(
        { error: 'Chantier non trouvé' },
        { status: 404 }
      )
    }

    if (!body.soustraitants || body.soustraitants.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un sous-traitant doit être sélectionné' },
        { status: 400 }
      )
    }

    if (!body.destinataireEmail || !body.destinataireEmail.trim()) {
      return NextResponse.json(
        { error: 'L\'adresse email du destinataire est requise' },
        { status: 400 }
      )
    }

    // Récupérer les informations complètes des sous-traitants
    const soustraitantsIds = body.soustraitants.map(st => st.id)
    const soustraitants = await prisma.soustraitant.findMany({
      where: {
        id: { in: soustraitantsIds }
      }
    })

    if (soustraitants.length !== soustraitantsIds.length) {
      return NextResponse.json(
        { error: 'Un ou plusieurs sous-traitants n\'ont pas été trouvés' },
        { status: 404 }
      )
    }

    // Adresse du chantier (pour la phrase d'intro)
    const adresseChantier = chantier.adresseChantier 
      ? `${chantier.adresseChantier}${chantier.villeChantier ? `, ${chantier.villeChantier}` : ''}`
      : 'Non spécifiée'

    const phraseDeclarer = soustraitants.length > 1
      ? 'Pourriez-vous déclarer nos sous-traitants suivants sur le chantier'
      : 'Pourriez-vous déclarer notre sous-traitant suivant sur le chantier'

    // Construire le contenu HTML de l'email : Bonjour → demande → liste (nom + n° entreprise/TVA)
    let emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
          Déclaration de sous-traitance
        </h2>
        
        <p>Bonjour,</p>
        
        <p style="margin-top: 20px;">
          ${phraseDeclarer} <strong>${chantier.nomChantier}</strong> situé à <strong>${adresseChantier}</strong> ?
        </p>
    `

    // Liste des sous-traitants (nom + numéro d'entreprise/TVA) en dessous de la phrase
    for (const soustraitant of soustraitants) {
      const tvaDisplay = (soustraitant.tva && soustraitant.tva.trim()) ? soustraitant.tva : 'Non communiqué'
      emailContent += `
        <div style="margin: 12px 0; padding: 15px; background-color: #f9fafb; border-left: 4px solid #4F46E5; border-radius: 4px;">
          <p style="color: #1f2937; margin: 0 0 6px 0;"><strong>${soustraitant.nom}</strong></p>
          <p style="margin: 0; color: #4b5563; font-size: 14px;"><strong>Numéro d'entreprise/TVA :</strong> ${tvaDisplay}</p>
        </div>
      `
    }

    emailContent += `
        <p style="margin-top: 30px;">Je vous remercie par avance.</p>
        
        <p style="margin-top: 30px;">
          Cordialement,<br>
          ${(await prisma.companysettings.findFirst())?.name || 'Secotech'}
        </p>
      </div>
    `

    // Récupérer les documents à joindre
    const attachments: Array<{ filename: string; content: Buffer; contentType?: string }> = []

    for (const selection of body.soustraitants) {
      for (const docSelection of selection.documentsOuvriers) {
        if (docSelection.documentIds && docSelection.documentIds.length > 0) {
          // Récupérer l'ouvrier
          const ouvrier = await prisma.ouvrier.findUnique({
            where: { id: docSelection.ouvrierId },
            select: {
              nom: true,
              prenom: true
            }
          })

          if (!ouvrier) continue

          // Récupérer les documents
          const documents = await prisma.documentOuvrier.findMany({
            where: {
              id: { in: docSelection.documentIds },
              ouvrierId: docSelection.ouvrierId
            }
          })

          for (const doc of documents) {
            try {
              // Le chemin du fichier est dans doc.url (ex: /documents/ouvriers/xxx/fichier.pdf)
              const filePath = join(process.cwd(), 'public', doc.url.replace(/^\//, ''))
              const fileContent = await readFile(filePath)
              
              // Nom du fichier : [Nom Ouvrier] - [Type Document] - [Nom Document]
              const typeDocument = doc.type || 'document'
              const nomFichier = `${ouvrier.prenom} ${ouvrier.nom} - ${typeDocument} - ${doc.nom}.${doc.url.split('.').pop() || 'pdf'}`
              
              attachments.push({
                filename: nomFichier,
                content: fileContent,
                contentType: doc.url.endsWith('.pdf') ? 'application/pdf' : undefined
              })
            } catch (error) {
              console.error(`Erreur lors de la lecture du document ${doc.id}:`, error)
              // Continuer avec les autres documents même si celui-ci échoue
            }
          }
        }
      }
    }

    // Envoyer l'email
    const subject = `Déclaration de sous-traitance - ${chantier.nomChantier}`
    const success = await sendEmailWithAttachment(
      body.destinataireEmail,
      subject,
      emailContent,
      attachments.length > 0 ? attachments : undefined
    )

    if (!success) {
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email envoyé avec succès',
      attachmentsCount: attachments.length
    })
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la déclaration:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de la déclaration' },
      { status: 500 }
    )
  }
}

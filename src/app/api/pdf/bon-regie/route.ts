import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { default as PDFDocument } from 'pdfkit'

// PAS BESOIN DE CHEMINS DE POLICE SI ON UTILISE LES POLICES INTÉGRÉES
// const ROBOTO_REGULAR_FONT_PATH = path.join(process.cwd(), 'src/assets/fonts/Roboto-Regular.ttf');
// const ROBOTO_BOLD_FONT_PATH = path.join(process.cwd(), 'src/assets/fonts/Roboto-Bold.ttf');

// Fonction auxiliaire pour formater les nombres
function formatNumber(num: number | null) {
  if (num === null) return '-'
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { bonRegieId } = body

    if (!bonRegieId) {
      return NextResponse.json(
        { error: 'ID du bon de régie manquant' },
        { status: 400 }
      )
    }

    // Récupérer les données du bon de régie
    const bonRegie = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `

    if (!Array.isArray(bonRegie) || bonRegie.length === 0) {
      return NextResponse.json(
        { error: 'Bon de régie non trouvé' },
        { status: 404 }
      )
    }

    const data = bonRegie[0]
    
    // Créer un nouveau document PDF
    // pdfkit devrait utiliser ses polices standard intégrées par défaut (ex: Helvetica)
    const doc = new PDFDocument({ margin: 50 });
    
    // PAS BESOIN DE registerFont si on utilise les polices intégrées
    // try {
    //   if (fs.existsSync(ROBOTO_REGULAR_FONT_PATH)) {
    //     doc.registerFont('Roboto', ROBOTO_REGULAR_FONT_PATH);
    //   } else {
    //     console.warn(`Police Roboto-Regular non trouvée à ${ROBOTO_REGULAR_FONT_PATH}. PDFKit utilisera sa police par défaut.`);
    //   }
    //   if (fs.existsSync(ROBOTO_BOLD_FONT_PATH)) {
    //     doc.registerFont('Roboto-Bold', ROBOTO_BOLD_FONT_PATH);
    //   } else {
    //     console.warn(`Police Roboto-Bold non trouvée à ${ROBOTO_BOLD_FONT_PATH}. PDFKit utilisera sa police par défaut pour le gras.`);
    //   }
    // } catch (fontError) {
    //   console.error("Erreur lors de l'enregistrement des polices Roboto:", fontError);
    // }
    
    // pdfkit devrait utiliser 'Helvetica' par défaut ou être capable de trouver 'Helvetica-Bold' comme police standard
    // doc.font('Helvetica'); // Peut être redondant si c'est déjà la police par défaut de pdfkit

    // Préparer le buffer pour stocker le PDF
    const chunks: Array<Buffer> = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    
    // Chemin vers le logo
    const logoPath = path.join(process.cwd(), 'public/images/logo.png')
    
    // En-tête avec logo et titre
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 150 })
    }
    
    doc.fontSize(24)
       .fillColor('#2563eb')
       // Utilisation explicite de la police standard que pdfkit devrait connaître
       .font('Helvetica-Bold').text('BON DE TRAVAUX EN RÉGIE', 250, 50, { align: 'right' })
    
    doc.moveTo(50, 115)
       .lineTo(550, 115)
       .strokeColor('#2563eb')
       .lineWidth(2)
       .stroke()
    
    // Informations client et chantier
    // doc.moveDown(2) // On gère l'espace en ajustant les Y absolus
    doc.font('Helvetica').fontSize(12).fillColor('#000') 
    
    const startYClientInfo = 135; // Anciennement 120, augmenté de 15 pour plus d'espace après la ligne (qui est à 115)
    
    doc.font('Helvetica-Bold').text('Date:', 50, startYClientInfo)
    doc.font('Helvetica').text(data.dates || '', 200, startYClientInfo)
    
    doc.font('Helvetica-Bold').text('Client:', 50, startYClientInfo + 20)
    doc.font('Helvetica').text(data.client || '', 200, startYClientInfo + 20)
    
    doc.font('Helvetica-Bold').text('Chantier:', 50, startYClientInfo + 40)
    doc.font('Helvetica').text(data.nomChantier || '', 200, startYClientInfo + 40)
    
    // Description du travail
    const yDescriptionRect = startYClientInfo + 70; // Ajusté par rapport à startYClientInfo
    doc.moveDown(2) // Petit moveDown avant la description pour espacement relatif
    doc.rect(50, yDescriptionRect, 500, 100).fillAndStroke('#f4f8ff', '#e6e6e6')
    doc.font('Helvetica-Bold').fillColor('#000').text('TRAVAIL RÉALISÉ:', 60, yDescriptionRect + 10)
    doc.font('Helvetica').text(data.description || '', 60, yDescriptionRect + 30, { width: 480 })
    
    // Informations sur le temps
    // const yPos = 310 // Ancienne valeur absolue
    const yTempsInfoStart = yDescriptionRect + 100 + 30; // Espace après le rectangle de description
    
    doc.font('Helvetica-Bold').text('Temps sur chantier:', 50, yTempsInfoStart)
    doc.font('Helvetica').text(`${formatNumber(data.tempsChantier || 0)} heures`, 200, yTempsInfoStart)
    
    doc.font('Helvetica-Bold').text('Nombre d\'ouvriers:', 50, yTempsInfoStart + 20)
    doc.font('Helvetica').text(`${data.nombreTechniciens || 1}`, 200, yTempsInfoStart + 20)
    
    const totalHeures = (data.tempsChantier || 0) * (data.nombreTechniciens || 1)
    doc.font('Helvetica-Bold').text('Total des heures:', 50, yTempsInfoStart + 40)
    doc.font('Helvetica').text(`${formatNumber(totalHeures)} heures`, 200, yTempsInfoStart + 40)
    
    // Matériaux utilisés
    const yMateriauxStart = yTempsInfoStart + 40 + 30; // Espace après les heures
    doc.font('Helvetica-Bold').text('MATÉRIAUX UTILISÉS:', 50, yMateriauxStart)
    doc.font('Helvetica').text(data.materiaux || 'Aucun matériau spécifié', 50, yMateriauxStart + 20, { width: 500 })
    
    // Signature
    if (data.signature) {
      const ySignatureSectionStart = yMateriauxStart + 20 + (data.materiaux ? 50 : 20); // Espace variable selon la présence de matériaux + espace pour le texte "Aucun..."
      doc.font('Helvetica-Bold').text('Signature du responsable:', 350, ySignatureSectionStart)
      
      try {
        // Vérifier si l'URL de signature est une URL de données (data URL)
        if (data.signature.startsWith('data:image')) {
          // Extraire les données base64 de la data URL
          const base64Data = data.signature.split(',')[1]
          const signatureBuffer = Buffer.from(base64Data, 'base64')
          doc.image(signatureBuffer, 350, ySignatureSectionStart + 20, { width: 200 })
        } else {
          doc.image(data.signature, 350, ySignatureSectionStart + 20, { width: 200 })
        }
      } catch (error) {
        console.error('Erreur lors de l\'affichage de la signature:', error)
      }
      
      doc.font('Helvetica').text(data.nomSignataire || '', 350, ySignatureSectionStart + 20 + (data.signature.startsWith('data:image') ? 70 : 90)) // Ajuster l'Y en fonction de la hauteur de l'image signature
      
      if (data.dateSignature) {
        const dateFormatee = new Date(data.dateSignature).toLocaleDateString('fr-FR')
        doc.font('Helvetica').text(`Le ${dateFormatee}`, 350, ySignatureSectionStart + 20 + (data.signature.startsWith('data:image') ? 90 : 110)) // Idem
      }
    }
    
    // Finaliser le document
    doc.end()
    
    // Convertir les chunks en buffer
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        resolve(buffer)
      })
    })
    
    // Si le bon de régie est associé à un chantier, sauvegarder le PDF comme document du chantier
    if (data.chantierId) {
      // Créer un blob pour l'enregistrer comme fichier
      const pdfFileName = `bon-regie-${data.id}-${new Date().getTime()}.pdf`
      
      try {
        // Sauvegarder le fichier PDF en tant que document du chantier
        await prisma.document.create({
          data: {
            nom: `Bon de régie - ${data.client} - ${data.dates}`,
            type: 'BON_REGIE',
            mimeType: 'application/pdf',
            url: `/uploads/${pdfFileName}`,
            taille: pdfBuffer.length,
            chantierId: data.chantierId,
            createdBy: session.user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        
        // Écrire le fichier PDF sur le disque
        const uploadsDir = path.join(process.cwd(), 'public/uploads')
        
        // Créer le répertoire s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        
        fs.writeFileSync(path.join(uploadsDir, pdfFileName), pdfBuffer)
        
        console.log(`PDF du bon de régie ${data.id} sauvegardé comme document du chantier ${data.chantierId}`)
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du PDF comme document:', error)
        // On continue même en cas d'erreur pour renvoyer le PDF à l'utilisateur
      }
    }
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bon-regie-${data.id}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
} 
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateBonRegieHTML, type BonRegieData } from '@/lib/pdf/templates/bon-regie-template'
import * as fs from 'fs'
import * as path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Fonction pour générer le PDF d'un bon de régie avec Puppeteer
async function generateBonRegiePDF(bonRegieData: BonRegieData): Promise<Buffer> {
  try {
    console.log('🎯 Génération PDF moderne - Bon de régie')
    
    // 1. Récupérer les paramètres de l'entreprise
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log(`✅ Paramètres entreprise récupérés`)

    // 2. Générer le HTML
    console.log('🎨 Génération du HTML...')
    const html = generateBonRegieHTML(bonRegieData, companySettings)

    // 3. Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '15mm',
        right: '15mm', 
        bottom: '15mm',
        left: '15mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)
    return pdfBuffer
  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF:', error)
    throw error
  }
}

// Associer un bon de régie à un chantier
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const bonRegieId = resolvedParams.id

    console.log(`🔗 Association bon de régie ${bonRegieId} à un chantier`)

    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('❌ Session non autorisée')
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer les données de la requête
    const data = await request.json()
    
    if (!data.chantierId) {
      console.error('❌ chantierId manquant')
      return NextResponse.json({ error: 'chantierId requis' }, { status: 400 })
    }

    console.log(`✅ Chantier cible: ${data.chantierId}`)

    // Récupérer les données du bon de régie
    const bonRegieResult = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `;

    if (!Array.isArray(bonRegieResult) || bonRegieResult.length === 0) {
      console.error(`❌ Bon de régie ${bonRegieId} non trouvé`)
      return NextResponse.json({ error: 'Bon de régie non trouvé' }, { status: 404 })
    }

    const bonRegie = bonRegieResult[0] as {
      id: string
      dates?: string | null
      client?: string | null
      nomChantier?: string | null
      description?: string | null
      tempsChantier?: number | null
      nombreTechniciens?: number | null
      materiaux?: string | null
      nomSignataire?: string | null
      signature?: string | null
      dateSignature?: string | null
    }
    console.log(`✅ Bon de régie trouvé: ${bonRegie.client || 'Sans client'}`)

    // Préparer les données pour le template
    const bonRegieData: BonRegieData = {
      id: bonRegie.id,
      dates: bonRegie.dates,
      client: bonRegie.client,
      nomChantier: bonRegie.nomChantier,
      description: bonRegie.description,
      tempsChantier: bonRegie.tempsChantier,
      nombreTechniciens: bonRegie.nombreTechniciens,
      materiaux: bonRegie.materiaux,
      nomSignataire: bonRegie.nomSignataire,
      signature: bonRegie.signature,
      dateSignature: bonRegie.dateSignature,
      chantierId: data.chantierId
    }

    // Générer le PDF du bon de régie AVANT l'association
    let pdfGenerated = false
    let pdfBuffer: Buffer | null = null
    
    try {
      console.log('📄 Génération du PDF avant association...')
      pdfBuffer = await generateBonRegiePDF(bonRegieData)
      pdfGenerated = true
      console.log('✅ PDF généré avec succès')
    } catch (pdfError) {
      console.error('⚠️ Erreur lors de la génération du PDF:', pdfError)
      // On continue quand même l'association même si le PDF échoue
    }

    // Mettre à jour le bon de régie avec l'ID du chantier
    await prisma.$executeRaw`
      UPDATE bonRegie 
      SET chantierId = ${data.chantierId} 
      WHERE id = ${bonRegieId}
    `;

    console.log(`✅ Bon de régie ${bonRegieId} associé au chantier ${data.chantierId}`)
    
    // Sauvegarder le PDF seulement s'il a été généré avec succès
    if (pdfGenerated && pdfBuffer) {
      try {
        // Créer le nom de fichier pour le PDF
        const pdfFileName = `bon-regie-${bonRegieId}-${new Date().getTime()}.pdf`
        
        // Sauvegarder le fichier PDF en tant que document du chantier
        await prisma.document.create({
          data: {
            nom: `Bon de régie - ${bonRegieData.client} - ${bonRegieData.dates}`,
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
        
        console.log(`✅ PDF du bon de régie ${bonRegieId} généré et ajouté aux documents du chantier ${data.chantierId}`)
      } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde du PDF comme document:', error)
        // On continue même en cas d'erreur pour ne pas bloquer l'association
        pdfGenerated = false
      }
    }

    // Récupérer le bon de régie mis à jour
    const result = await prisma.$queryRaw`
      SELECT * FROM bonRegie WHERE id = ${bonRegieId}
    `;
    
    // TypeScript ne connaît pas le type exact, donc on cast le résultat
    const updatedBonRegie = Array.isArray(result) && result.length > 0 
      ? result[0] 
      : { id: bonRegieId, chantierId: data.chantierId };
    
    return NextResponse.json({
      ...updatedBonRegie,
      pdfGenerated,
      message: pdfGenerated 
        ? 'Bon de régie associé au chantier et PDF généré avec succès'
        : 'Bon de régie associé au chantier (PDF non généré)'
    })

  } catch (error) {
    console.error('❌ Erreur lors de l\'association du bon de régie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'association du bon de régie' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateRapportHTML, type RapportData } from '@/lib/pdf/templates/rapport-template'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      chantierId, 
      date, 
      personnes, 
      notes, 
      photos, 
      tagFilter 
    } = body

    console.log(`🎯 Génération PDF moderne - Rapport pour chantier ${chantierId}`)

    // Récupérer les informations du chantier
    const chantier = await prisma.chantier.findUnique({
      where: { chantierId },
      select: {
        id: true,
        chantierId: true,
        nomChantier: true,
        clientNom: true,
        adresseChantier: true
      }
    })

    if (!chantier) {
      return NextResponse.json({ error: 'Chantier non trouvé' }, { status: 404 })
    }

    // Récupérer le logo de l'entreprise
    let logoBase64 = ''
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      const logoBuffer = await readFile(logoPath)
      logoBase64 = logoBuffer.toString('base64')
    } catch (error) {
      console.warn('Impossible de charger le logo:', error)
    }

    console.log(`📥 Réception de ${photos?.length || 0} photo(s) depuis le front-end`)
    if (photos && photos.length > 0) {
      console.log(`📋 URLs reçues:`, photos.map((p: { preview?: string }) => p.preview))
    }
    
    // Convertir les photos en base64
    const photosWithBase64 = await Promise.all(
      (photos || []).map(async (photo: { url: string; caption?: string; preview?: string }) => {
        try {
          console.log(`🔍 Traitement photo: ${photo.preview}`)
          // Si la photo a déjà une URL du serveur, la convertir en base64
          if (photo.preview && photo.preview.startsWith('/uploads/')) {
            const imagePath = join(process.cwd(), 'public', photo.preview)
            const imageBuffer = await readFile(imagePath)
            const extension = photo.preview.split('.').pop()?.toLowerCase() || 'jpg'
            const mimeType = extension === 'png' ? 'image/png' : 
                            extension === 'webp' ? 'image/webp' :
                            'image/jpeg'
            const base64 = `data:${mimeType};base64,${imageBuffer.toString('base64')}`
            console.log(`✅ Photo convertie en base64: ${photo.preview}`)
            return {
              ...photo,
              preview: base64
            }
          }
          // Si c'est déjà en base64, garder tel quel
          console.log(`⚠️ Photo non convertie (pas d'URL /uploads/): ${photo.preview?.substring(0, 50)}...`)
          return photo
        } catch (error) {
          console.error(`❌ Erreur conversion photo ${photo.preview}:`, error)
          return photo
        }
      })
    )

    console.log(`📸 ${photosWithBase64.length} photo(s) prête(s) pour le PDF`)

    // Préparer les données pour le template
    const rapportData: RapportData = {
      chantier: {
        id: chantier.id,
        chantierId: chantier.chantierId,
        nomChantier: chantier.nomChantier,
        clientNom: chantier.clientNom || 'Client non spécifié',
        adresseChantier: chantier.adresseChantier || ''
      },
      date,
      personnes: personnes || [],
      notes: Array.isArray(notes) ? notes : (notes ? [{ id: '1', contenu: notes, tags: [] }] : []),
      photos: photosWithBase64,
      tagFilter,
      logoBase64
    }

    // Générer le HTML
    const htmlContent = generateRapportHTML(rapportData)

    // Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
      top: '10mm',
      right: '10mm',
      bottom: '10mm',
      left: '10mm'
    }
  })

    console.log('✅ PDF généré avec succès')

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="rapport-${chantier.chantierId}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF de rapport:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

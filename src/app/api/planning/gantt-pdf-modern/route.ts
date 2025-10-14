import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { generateGanttPlanningHTML, type GanttPlanningData } from '@/lib/pdf/templates/gantt-planning-template'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Génération PDF moderne - Planning Gantt des chantiers')

    // 1. Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Récupérer les données du planning depuis le body de la requête
    const planningData: GanttPlanningData = await request.json()
    console.log(`✅ Données planning Gantt reçues: ${planningData.chantiers.length} chantiers, ${planningData.timeUnits.length} unités de temps`)

    // 3. Récupérer les paramètres de l'entreprise
    console.log('🔍 Recherche des paramètres entreprise...')
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log('✅ Paramètres entreprise récupérés')

    // 4. Générer le HTML
    console.log('🎨 Génération du HTML...')
    const html = generateGanttPlanningHTML(planningData, companySettings)

    // 5. Générer le PDF avec Puppeteer
    console.log('📄 Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A3',
      orientation: 'landscape',
      margins: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      }
    })

    console.log(`✅ PDF généré: ${pdfBuffer.length} bytes`)

    // 6. Retourner le PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planning_Gantt_${planningData.periodText.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la génération du PDF planning Gantt:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération du PDF' },
      { status: 500 }
    )
  }
}

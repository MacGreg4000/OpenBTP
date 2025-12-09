import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Capture d\'écran du planning des ressources')

    // 1. Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // 2. Récupérer les paramètres de capture
    const { planningHTML, fileName, periodText } = await request.json()
    console.log(`✅ Paramètres de capture reçus: fileName=${fileName}`)

    // 3. Récupérer les paramètres de l'entreprise
    console.log('🔍 Recherche des paramètres entreprise...')
    const companySettings = await PDFGenerator.getCompanySettings()
    console.log('✅ Paramètres entreprise récupérés')

    // 4. Générer le HTML de la page avec le planning
    console.log('🎨 Génération du HTML de la page...')
    const html = generatePlanningPageHTML(planningHTML, periodText, companySettings)

    // 5. Capturer la page avec Puppeteer
    console.log('📸 Capture de la page avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(html, {
      format: 'A4',
      orientation: 'landscape',
      margins: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      // Options spécifiques retirées: non supportées par PDFOptions
    })

    console.log(`✅ PDF capturé: ${pdfBuffer.length} bytes`)

    // 6. Retourner le PDF
    // Convertir le Buffer en Uint8Array pour compatibilité avec NextResponse
    const uint8Array = new Uint8Array(pdfBuffer)
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planning_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf"`
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la capture du planning:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la capture du planning' },
      { status: 500 }
    )
  }
}

function generatePlanningPageHTML(
  planningHTML: string,
  periodText: string,
  companySettings: { logoBase64?: string; nomEntreprise?: string; adresse?: string; siret?: string } | null
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planning des Ressources - ${periodText}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: white;
    }
    
    .planning-header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .company-info {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      margin-bottom: 15px;
    }
    
    .company-logo {
      height: 60px;
      width: auto;
      border-radius: 8px;
    }
    
    .company-details h1 {
      font-size: 28px;
      font-weight: bold;
      margin: 0 0 5px 0;
    }
    
    .company-details p {
      font-size: 16px;
      margin: 0;
      opacity: 0.9;
    }
    
    .period-info {
      font-size: 20px;
      font-weight: 600;
      opacity: 0.95;
    }
    
    .planning-container {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    /* Styles pour le planning */
    .resource-scheduler {
      width: 100%;
      border-collapse: collapse;
    }
    
    .resource-scheduler th,
    .resource-scheduler td {
      border: 1px solid #e5e7eb;
      padding: 8px;
      text-align: center;
      vertical-align: middle;
    }
    
    .resource-scheduler th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    
    .resource-cell {
      text-align: left !important;
      background: #f9fafb;
      font-weight: 600;
      color: #1f2937;
      min-width: 200px;
    }
    
    .day-header {
      background: #f3f4f6;
      font-weight: 600;
      color: #374151;
      min-width: 60px;
    }
    
    .task-indicator {
      background: #3b82f6;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      margin: 2px;
      display: inline-block;
    }
    
    .task-am {
      background: #f59e0b;
    }
    
    .task-pm {
      background: #10b981;
    }
    
    .month-indicator {
      background: rgba(59, 130, 246, 0.3);
      border: 1px solid #3b82f6;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .legend {
      margin-top: 30px;
      padding: 20px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
    }
    
    .legend h3 {
      margin: 0 0 15px 0;
      color: #1f2937;
      font-size: 18px;
      font-weight: 600;
    }
    
    .legend-items {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #4b5563;
    }
    
    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid #d1d5db;
    }
    
    @media print {
      body {
        padding: 10px;
      }
      
      .planning-header {
        background: #f3f4f6 !important;
        color: #1f2937 !important;
        box-shadow: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- En-tête avec informations de l'entreprise -->
  <div class="planning-header">
    <div class="company-info">
      ${companySettings?.logoBase64 ? `
        <img src="${companySettings.logoBase64}" alt="Logo" class="company-logo">
      ` : ''}
      <div class="company-details">
        <h1>${companySettings?.nomEntreprise || 'Nom Entreprise'}</h1>
        <p>${companySettings?.adresse || 'Adresse entreprise'}</p>
        ${companySettings?.siret ? `<p>SIRET: ${companySettings.siret}</p>` : ''}
      </div>
    </div>
    <div class="period-info">
      Planning des Ressources - ${periodText}
    </div>
  </div>

  <!-- Conteneur du planning -->
  <div class="planning-container">
    ${planningHTML}
  </div>

  <!-- Légende -->
  <div class="legend">
    <h3>Légende</h3>
    <div class="legend-items">
      <div class="legend-item">
        <div class="legend-color" style="background: #3b82f6;"></div>
        <span>Journée complète</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #f59e0b;"></div>
        <span>Matin (7h30-12h)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #10b981;"></div>
        <span>Après-midi (13h-16h30)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: rgba(59, 130, 246, 0.3); border-color: #3b82f6;"></div>
        <span>Vue mois - Tâches planifiées</span>
      </div>
      <div class="legend-item">
        <span><strong>Dimanche</strong> = Fond grisé</span>
      </div>
      <div class="legend-item">
        <span><strong>Férié</strong> = Fond rouge clair</span>
      </div>
    </div>
  </div>

</body>
</html>
  `
}

export interface DevisData {
  devis: {
    numeroDevis: string
    reference?: string | null
    dateCreation: string
    dateValidite: string
    clientNom: string
    clientEmail?: string
    clientTelephone?: string
    clientAdresse?: string
    observations?: string
    tauxTVA: number
    remiseGlobale: number
    montantHT: number
    montantTVA: number
    montantTTC: number
    lignes: Array<{
      id: string
      ordre: number
      type: string
      article: string | null
      description: string | null
      unite: string | null
      quantite: number | null
      prixUnitaire: number | null
      remise: number
      total: number | null
    }>
  }
  entreprise: {
    name: string
    address: string
    zipCode: string
    city: string
    phone: string
    email: string
    siret?: string
    tva?: string
    logo?: string
  }
  logoBase64?: string
  cgvHtml?: string
}

/**
 * Extrait le contenu du body d'un HTML complet et nettoie les styles qui pourraient interférer
 */
function extractBodyContent(html: string): string {
  // Si le HTML ne contient pas de balises html/head/body, le retourner tel quel
  if (!html.includes('<html') && !html.includes('<head') && !html.includes('<body')) {
    return html
  }

  // Extraire le contenu entre <body> et </body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    let bodyContent = bodyMatch[1]
    
    // Supprimer les balises <style> qui pourraient contenir des styles @page ou globaux
    bodyContent = bodyContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    
    // Supprimer les balises <script>
    bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    
    return bodyContent.trim()
  }

  // Si on ne trouve pas de body, essayer d'extraire juste le contenu sans les balises html/head
  let cleaned = html
  cleaned = cleaned.replace(/<!doctype[^>]*>/gi, '')
  cleaned = cleaned.replace(/<html[^>]*>/gi, '')
  cleaned = cleaned.replace(/<\/html>/gi, '')
  cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
  cleaned = cleaned.replace(/<body[^>]*>/gi, '')
  cleaned = cleaned.replace(/<\/body>/gi, '')
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  
  return cleaned.trim()
}

export function generateDevisHTML(data: DevisData): string {
  const { devis, entreprise, logoBase64, cgvHtml } = data
  
  // Nettoyer le HTML des CGV pour extraire uniquement le contenu du body
  const cleanedCgvHtml = cgvHtml ? extractBodyContent(cgvHtml) : null
  
  // Calculer les totaux
  const lignesCalculables = devis.lignes.filter(ligne => ligne.type === 'QP')
  const totalHTBrut = lignesCalculables.reduce((sum, ligne) => sum + (Number(ligne.total) || 0), 0)
  const montantRemiseGlobale = totalHTBrut * (devis.remiseGlobale / 100)
  
  // Vérifier si au moins une ligne a une remise > 0
  const hasRemise = devis.lignes.some(ligne => ligne.remise > 0)
  
  // Nombre de colonnes selon la présence de remises
  const colCount = hasRemise ? 8 : 7
  
  let ligneCompteur = 0
  const lignesHTML = devis.lignes.map((ligne) => {
    const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

    if (isSection) {
      const sectionClass = ligne.type === 'TITRE' ? 'section-row section-title' : 'section-row section-subtitle'
      return `
                        <tr class="${sectionClass}">
                            <td colspan="${colCount}" class="section-cell">
                                ${ligne.description || ligne.article}
                            </td>
                        </tr>
      `
    }

    ligneCompteur += 1

    const remiseCell = hasRemise ? `<td class="text-right">${ligne.remise > 0 ? `${ligne.remise}%` : '-'}</td>` : ''

    return `
                        <tr>
                            <td class="text-center">${ligneCompteur}</td>
                            <td><strong>${ligne.article || ''}</strong></td>
                            <td>${ligne.description || ''}</td>
                            <td class="text-center">${ligne.unite || ''}</td>
                            <td class="text-right">${ligne.quantite || 0}</td>
                            <td class="text-right montant">${(ligne.prixUnitaire || 0).toFixed(2)} €</td>
                            ${remiseCell}
                            <td class="text-right montant"><strong>${(ligne.total || 0).toFixed(2)} €</strong></td>
                        </tr>
    `
  }).join('')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Devis - ${devis.numeroDevis}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #2d3748;
            background: white;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        /* En-tête */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 120px;
            max-height: 60px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 8px;
            font-size: 8px;
            color: #64748b;
            line-height: 1.3;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 20px;
        }
        
        .document-title h1 {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .document-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .devis-number {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
        }
        
        .client-info-header {
            flex: 1;
            text-align: right;
            font-size: 9px;
        }
        
        .client-box {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            display: inline-block;
            text-align: left;
            min-width: 200px;
        }
        
        .client-box-title {
            font-size: 9px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .client-box-content {
            font-size: 9px;
            color: #374151;
            line-height: 1.5;
        }
        
        .client-box-content strong {
            display: block;
            font-size: 10px;
            margin-bottom: 4px;
            color: #1e293b;
        }
        
        /* Informations devis */
        .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-section h3 {
            font-size: 10px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .info-section p {
            margin-bottom: 3px;
            font-size: 8px;
            line-height: 1.4;
        }
        
        .info-section .label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            min-width: 80px;
        }
        
        .info-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 2px;
        }
        
        .info-item .label {
            font-weight: 600;
            color: #64748b;
            font-size: 8px;
            min-width: 70px;
            flex-shrink: 0;
        }
        
        .info-item .value {
            font-size: 8px;
            color: #1f2937;
            flex: 1;
        }
        
        /* Observations */
        .observations {
            background: white;
            border-left: 3px solid #3b82f6;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .observations-title {
            font-size: 10px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .observations-content {
            font-size: 9px;
            color: #374151;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        /* Tableaux */
        .table-container {
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: none;
            background: white;
        }
        
        .table-title {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
            padding: 10px 15px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        thead {
            background: white;
        }
        
        tbody {
            background: white;
        }
        
        th {
            background: white;
            padding: 8px 6px;
            text-align: left;
            font-size: 8px;
            font-weight: bold;
            color: #374151;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th.text-center, td.text-center { text-align: center; }
        th.text-right, td.text-right { text-align: right; }
        
        td {
            padding: 6px;
            font-size: 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            background: white;
        }
        
        tr:nth-child(even) {
            background: white;
        }
        
        .montant {
            font-weight: 600;
            color: #1e40af;
        }
        
        /* Sections (Titres et Sous-titres) - Style discret */
        .section-row.section-title td {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            color: #1e3a8a;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }

        .section-row.section-subtitle td {
            background: white;
            color: #1f2937;
            font-size: 9px;
            font-weight: 600;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
        }

        .section-cell {
            padding: 8px 6px;
        }
        
        /* Totaux */
        .financial-summary {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
            background: transparent;
        }
        
        .summary-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            box-shadow: none;
            position: relative;
            border-left: 3px solid #1e40af;
        }
        
        .summary-card h4 {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
            padding: 2px 0;
        }
        
        .summary-row.remise {
            color: #dc2626;
            font-weight: 500;
        }
        
        .summary-row.total {
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 6px;
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
        }
        
        .summary-card:nth-child(1) {
            border-left-color: #3b82f6;
        }
        
        .summary-card:nth-child(2) {
            border-left-color: #64748b;
        }
        
        .summary-card:nth-child(3) {
            border-left-color: #1e40af;
        }
        
        /* Conditions générales - Optimisé pour tenir sur une seule page */
        .cgv-section {
            margin-top: 8px;
            page-break-before: always;
            padding-top: 4px;
            /* Forcer le contenu à tenir sur une page */
            max-height: calc(100vh - 40mm);
            overflow: hidden;
        }

        .cgv-section h2 {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
            margin-top: 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding-bottom: 2px;
        }

        .cgv-content {
            font-size: 7px;
            line-height: 1.2;
            color: #1f2937;
            /* Neutraliser les styles qui pourraient affecter la page */
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            box-sizing: border-box !important;
            /* Optimisation pour tenir sur une page */
            column-count: 2;
            column-gap: 12px;
            column-fill: auto;
        }

        .cgv-content * {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: inherit !important;
            padding: 0 !important;
            margin: 0 0 3px 0 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            /* Neutraliser les styles de page et de taille */
            width: auto !important;
            max-width: 100% !important;
            height: auto !important;
            box-sizing: border-box !important;
            /* Empêcher les sauts de page dans les éléments */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Neutraliser spécifiquement les styles @page, html, body qui pourraient être dans le HTML des CGV */
        .cgv-content html,
        .cgv-content body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
        }

        .cgv-content strong {
            font-weight: 600 !important;
            font-size: 7px !important;
        }

        .cgv-content em {
            font-style: italic !important;
        }

        .cgv-content ul,
        .cgv-content ol {
            margin-left: 12px !important;
            margin-top: 2px !important;
            margin-bottom: 2px !important;
            padding-left: 0 !important;
        }

        .cgv-content li {
            margin-bottom: 2px !important;
            margin-top: 0 !important;
            padding: 0 !important;
        }

        .cgv-content p {
            margin-bottom: 3px !important;
            margin-top: 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
        }

        .cgv-content h1,
        .cgv-content h2,
        .cgv-content h3,
        .cgv-content h4,
        .cgv-content h5,
        .cgv-content h6 {
            font-size: 8px !important;
            font-weight: 600 !important;
            margin-top: 4px !important;
            margin-bottom: 2px !important;
            padding: 0 !important;
            page-break-after: avoid;
            break-after: avoid;
        }

        .cgv-content section {
            margin-bottom: 4px !important;
            margin-top: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .cgv-content header {
            margin-bottom: 4px !important;
            padding: 0 !important;
        }

        .cgv-content footer {
            margin-top: 4px !important;
            padding: 0 !important;
            font-size: 6px !important;
        }

        .cgv-content .cols {
            column-count: 2 !important;
            column-gap: 12px !important;
        }

        .cgv-content .doc {
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Pied de page */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: #64748b;
        }
        
        .footer-left {
            flex: 1;
        }
        
        .footer-right {
            text-align: right;
        }
        
        .footer-highlight {
            background: white;
            border-left: 3px solid #3b82f6;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 15px 0;
            font-weight: 500;
            color: #1e40af;
            font-size: 9px;
        }
        
        /* Impression */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .cgv-section {
                page-break-before: always;
            }
        }
        
        /* Sauts de page intelligents */
        .table-title {
            page-break-after: avoid;
            break-after: avoid;
        }
        
        .summary-card {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        thead {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="${entreprise.name}" class="logo">` : `
                    <div style="width: 120px; height: 60px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                        ${entreprise.name.substring(0, 3).toUpperCase()}
                    </div>
                `}
                <div class="company-info">
                    <div><strong>${entreprise.name}</strong></div>
                    <div>${entreprise.address}</div>
                    <div>${entreprise.zipCode} ${entreprise.city}</div>
                    <div>Tél: ${entreprise.phone} | Email: ${entreprise.email}</div>
                    ${entreprise.siret ? `<div>SIRET: ${entreprise.siret}</div>` : ''}
                    ${entreprise.tva ? `<div>TVA: ${entreprise.tva}</div>` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>DEVIS</h1>
                <div class="document-subtitle">Document commercial</div>
                <div class="devis-number">${devis.numeroDevis}</div>
            </div>
            
            <div class="client-info-header">
                <div class="client-box">
                    <div class="client-box-title">Client</div>
                    <div class="client-box-content">
                        <strong>${devis.clientNom}</strong>
                        ${devis.clientEmail && devis.clientEmail !== 'null' ? `${devis.clientEmail}<br>` : ''}
                        ${devis.clientTelephone ? `Tél: ${devis.clientTelephone}<br>` : ''}
                        ${devis.clientAdresse && devis.clientAdresse !== 'null' ? `${devis.clientAdresse}` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Informations du devis -->
        <div class="info-grid">
            <div class="info-section">
                <h3>Détails du Devis</h3>
                <div class="info-item">
                    <span class="label">Numéro:</span>
                    <span class="value">${devis.numeroDevis}</span>
                </div>
                ${devis.reference ? `
                <div class="info-item">
                    <span class="label">Référence:</span>
                    <span class="value">${devis.reference}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="label">Date d'émission:</span>
                    <span class="value">${formatDate(devis.dateCreation)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Date de validité:</span>
                    <span class="value">${formatDate(devis.dateValidite)}</span>
                </div>
            </div>
            
            <div class="info-section">
                <h3>Informations Client</h3>
                <div class="info-item">
                    <span class="label">Client:</span>
                    <span class="value">${devis.clientNom}</span>
                </div>
                ${devis.clientEmail ? `
                <div class="info-item">
                    <span class="label">Email:</span>
                    <span class="value">${devis.clientEmail}</span>
                </div>
                ` : ''}
                ${devis.clientTelephone ? `
                <div class="info-item">
                    <span class="label">Téléphone:</span>
                    <span class="value">${devis.clientTelephone}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <h3>Conditions</h3>
                <div class="info-item">
                    <span class="label">Taux TVA:</span>
                    <span class="value">${devis.tauxTVA}%</span>
                </div>
                ${devis.remiseGlobale > 0 ? `
                <div class="info-item">
                    <span class="label">Remise globale:</span>
                    <span class="value">${devis.remiseGlobale}%</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- Observations -->
        ${devis.observations ? `
        <div class="observations">
            <div class="observations-title">Observations</div>
            <div class="observations-content">${devis.observations}</div>
        </div>
        ` : ''}
        
        <!-- Tableau des lignes -->
        <div class="table-container">
            <div class="table-title">Articles du Devis</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 15%;">Article</th>
                        <th style="width: 30%;">Description</th>
                        <th style="width: 8%;">Unité</th>
                        <th style="width: 8%;" class="text-right">Qté</th>
                        <th style="width: 12%;" class="text-right">Prix U.</th>
                        ${hasRemise ? '<th style="width: 8%;" class="text-right">Remise</th>' : ''}
                        <th style="width: 12%;" class="text-right">Total HT</th>
                    </tr>
                </thead>
                <tbody>
                    ${lignesHTML}
                </tbody>
            </table>
        </div>
        
        <!-- Résumé financier -->
        <div class="financial-summary">
            <div class="summary-card">
                <h4>Total HT</h4>
                <div class="summary-row">
                    <span>Total HT (brut)</span>
                    <span class="montant">${totalHTBrut.toFixed(2)} €</span>
                </div>
                ${devis.remiseGlobale > 0 ? `
                <div class="summary-row remise">
                    <span>Remise (${devis.remiseGlobale}%)</span>
                    <span>-${montantRemiseGlobale.toFixed(2)} €</span>
                </div>
                ` : ''}
                <div class="summary-row total">
                    <span>Total HT (net)</span>
                    <span class="montant">${devis.montantHT.toFixed(2)} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>TVA</h4>
                <div class="summary-row total">
                    <span>TVA (${devis.tauxTVA}%)</span>
                    <span class="montant">${devis.montantTVA.toFixed(2)} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>Total TTC</h4>
                <div class="summary-row total">
                    <span>Montant TTC</span>
                    <span class="montant">${devis.montantTTC.toFixed(2)} €</span>
                </div>
            </div>
        </div>
        
        ${cleanedCgvHtml ? `
        <div class="cgv-section">
            <h2>Conditions générales de vente</h2>
            <div class="cgv-content">
                ${cleanedCgvHtml}
            </div>
        </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
            <div class="footer-left">
                <div class="footer-highlight">
                    Ce devis est valable jusqu'au ${formatDate(devis.dateValidite)}.<br>
                    Merci de nous retourner ce devis signé avec la mention "Bon pour accord".
                </div>
                <p>© ${entreprise.name} - Document généré automatiquement</p>
            </div>
            <div class="footer-right">
                <p>Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

export function generateDevisHTMLWithoutPrices(data: DevisData): string {
  const { devis, entreprise, logoBase64, cgvHtml } = data
  
  // Nettoyer le HTML des CGV pour extraire uniquement le contenu du body
  const cleanedCgvHtml = cgvHtml ? extractBodyContent(cgvHtml) : null
  
  let ligneCompteur = 0
  const lignesHTML = devis.lignes.map((ligne) => {
    const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

    if (isSection) {
      const sectionClass = ligne.type === 'TITRE' ? 'section-row section-title' : 'section-row section-subtitle'
      return `
                        <tr class="${sectionClass}">
                            <td colspan="5" class="section-cell">
                                ${ligne.description || ligne.article}
                            </td>
                        </tr>
      `
    }

    ligneCompteur += 1

    return `
                        <tr>
                            <td class="text-center">${ligneCompteur}</td>
                            <td><strong>${ligne.article || ''}</strong></td>
                            <td>${ligne.description || ''}</td>
                            <td class="text-center">${ligne.unite || ''}</td>
                            <td class="text-right">${ligne.quantite || 0}</td>
                        </tr>
    `
  }).join('')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Devis - ${devis.numeroDevis} (Sans prix)</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10px;
            line-height: 1.4;
            color: #2d3748;
            background: white;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }
        
        /* En-tête */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 120px;
            max-height: 60px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 8px;
            font-size: 8px;
            color: #64748b;
            line-height: 1.3;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 20px;
        }
        
        .document-title h1 {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .document-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .devis-number {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
        }
        
        .client-info-header {
            flex: 1;
            text-align: right;
            font-size: 9px;
        }
        
        .client-box {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            display: inline-block;
            text-align: left;
            min-width: 200px;
        }
        
        .client-box-title {
            font-size: 9px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .client-box-content {
            font-size: 9px;
            color: #374151;
            line-height: 1.5;
        }
        
        .client-box-content strong {
            display: block;
            font-size: 10px;
            margin-bottom: 4px;
            color: #1e293b;
        }
        
        /* Informations devis */
        .info-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 20px;
            padding: 12px 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-section h3 {
            font-size: 10px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .info-section p {
            margin-bottom: 3px;
            font-size: 8px;
            line-height: 1.4;
        }
        
        .info-section .label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            min-width: 80px;
        }
        
        .info-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 2px;
        }
        
        .info-item .label {
            font-weight: 600;
            color: #64748b;
            font-size: 8px;
            min-width: 70px;
            flex-shrink: 0;
        }
        
        .info-item .value {
            font-size: 8px;
            color: #1f2937;
            flex: 1;
        }
        
        /* Observations */
        .observations {
            background: white;
            border-left: 3px solid #3b82f6;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .observations-title {
            font-size: 10px;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .observations-content {
            font-size: 9px;
            color: #374151;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        /* Tableaux */
        .table-container {
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: none;
            background: white;
        }
        
        .table-title {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
            padding: 10px 15px;
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        thead {
            background: white;
        }
        
        tbody {
            background: white;
        }
        
        th {
            background: white;
            padding: 8px 6px;
            text-align: left;
            font-size: 8px;
            font-weight: bold;
            color: #374151;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th.text-center, td.text-center { text-align: center; }
        th.text-right, td.text-right { text-align: right; }
        
        td {
            padding: 6px;
            font-size: 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            background: white;
        }
        
        tr:nth-child(even) {
            background: white;
        }
        
        /* Sections (Titres et Sous-titres) - Style discret */
        .section-row.section-title td {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            color: #1e3a8a;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
        }

        .section-row.section-subtitle td {
            background: white;
            color: #1f2937;
            font-size: 9px;
            font-weight: 600;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
        }

        .section-cell {
            padding: 8px 6px;
        }
        
        /* Conditions générales - Optimisé pour tenir sur une seule page */
        .cgv-section {
            margin-top: 8px;
            page-break-before: always;
            padding-top: 4px;
            /* Forcer le contenu à tenir sur une page */
            max-height: calc(100vh - 40mm);
            overflow: hidden;
        }

        .cgv-section h2 {
            font-size: 10px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 4px;
            margin-top: 0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            padding-bottom: 2px;
        }

        .cgv-content {
            font-size: 7px;
            line-height: 1.2;
            color: #1f2937;
            /* Neutraliser les styles qui pourraient affecter la page */
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            box-sizing: border-box !important;
            /* Optimisation pour tenir sur une page */
            column-count: 2;
            column-gap: 12px;
            column-fill: auto;
        }

        .cgv-content * {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: inherit !important;
            padding: 0 !important;
            margin: 0 0 3px 0 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            /* Neutraliser les styles de page et de taille */
            width: auto !important;
            max-width: 100% !important;
            height: auto !important;
            box-sizing: border-box !important;
            /* Empêcher les sauts de page dans les éléments */
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        /* Neutraliser spécifiquement les styles @page, html, body qui pourraient être dans le HTML des CGV */
        .cgv-content html,
        .cgv-content body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
        }

        .cgv-content strong {
            font-weight: 600 !important;
            font-size: 7px !important;
        }

        .cgv-content em {
            font-style: italic !important;
        }

        .cgv-content ul,
        .cgv-content ol {
            margin-left: 12px !important;
            margin-top: 2px !important;
            margin-bottom: 2px !important;
            padding-left: 0 !important;
        }

        .cgv-content li {
            margin-bottom: 2px !important;
            margin-top: 0 !important;
            padding: 0 !important;
        }

        .cgv-content p {
            margin-bottom: 3px !important;
            margin-top: 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
        }

        .cgv-content h1,
        .cgv-content h2,
        .cgv-content h3,
        .cgv-content h4,
        .cgv-content h5,
        .cgv-content h6 {
            font-size: 8px !important;
            font-weight: 600 !important;
            margin-top: 4px !important;
            margin-bottom: 2px !important;
            padding: 0 !important;
            page-break-after: avoid;
            break-after: avoid;
        }

        .cgv-content section {
            margin-bottom: 4px !important;
            margin-top: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .cgv-content header {
            margin-bottom: 4px !important;
            padding: 0 !important;
        }

        .cgv-content footer {
            margin-top: 4px !important;
            padding: 0 !important;
            font-size: 6px !important;
        }

        .cgv-content .cols {
            column-count: 2 !important;
            column-gap: 12px !important;
        }

        .cgv-content .doc {
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Pied de page */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8px;
            color: #64748b;
        }
        
        .footer-left {
            flex: 1;
        }
        
        .footer-right {
            text-align: right;
        }
        
        .footer-highlight {
            background: white;
            border-left: 3px solid #3b82f6;
            padding: 10px 15px;
            border-radius: 4px;
            margin: 15px 0;
            font-weight: 500;
            color: #1e40af;
            font-size: 9px;
        }
        
        /* Impression */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .cgv-section {
                page-break-before: always;
            }
        }
        
        /* Sauts de page intelligents */
        .table-title {
            page-break-after: avoid;
            break-after: avoid;
        }
        
        thead {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        tr {
            page-break-inside: avoid;
            break-inside: avoid;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="${entreprise.name}" class="logo">` : `
                    <div style="width: 120px; height: 60px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                        ${entreprise.name.substring(0, 3).toUpperCase()}
                    </div>
                `}
                <div class="company-info">
                    <div><strong>${entreprise.name}</strong></div>
                    <div>${entreprise.address}</div>
                    <div>${entreprise.zipCode} ${entreprise.city}</div>
                    <div>Tél: ${entreprise.phone} | Email: ${entreprise.email}</div>
                    ${entreprise.siret ? `<div>SIRET: ${entreprise.siret}</div>` : ''}
                    ${entreprise.tva ? `<div>TVA: ${entreprise.tva}</div>` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>DEVIS</h1>
                <div class="document-subtitle">Document commercial (Sans prix)</div>
                <div class="devis-number">${devis.numeroDevis}</div>
            </div>
            
            <div class="client-info-header">
                <div class="client-box">
                    <div class="client-box-title">Client</div>
                    <div class="client-box-content">
                        <strong>${devis.clientNom}</strong>
                        ${devis.clientEmail && devis.clientEmail !== 'null' ? `${devis.clientEmail}<br>` : ''}
                        ${devis.clientTelephone ? `Tél: ${devis.clientTelephone}<br>` : ''}
                        ${devis.clientAdresse && devis.clientAdresse !== 'null' ? `${devis.clientAdresse}` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Informations du devis -->
        <div class="info-grid">
            <div class="info-section">
                <h3>Détails du Devis</h3>
                <div class="info-item">
                    <span class="label">Numéro:</span>
                    <span class="value">${devis.numeroDevis}</span>
                </div>
                ${devis.reference ? `
                <div class="info-item">
                    <span class="label">Référence:</span>
                    <span class="value">${devis.reference}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="label">Date d'émission:</span>
                    <span class="value">${formatDate(devis.dateCreation)}</span>
                </div>
                <div class="info-item">
                    <span class="label">Date de validité:</span>
                    <span class="value">${formatDate(devis.dateValidite)}</span>
                </div>
            </div>
            
            <div class="info-section">
                <h3>Informations Client</h3>
                <div class="info-item">
                    <span class="label">Client:</span>
                    <span class="value">${devis.clientNom}</span>
                </div>
                ${devis.clientEmail ? `
                <div class="info-item">
                    <span class="label">Email:</span>
                    <span class="value">${devis.clientEmail}</span>
                </div>
                ` : ''}
                ${devis.clientTelephone ? `
                <div class="info-item">
                    <span class="label">Téléphone:</span>
                    <span class="value">${devis.clientTelephone}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="info-section">
                <h3>Note</h3>
                <div class="info-item">
                    <span class="value" style="font-style: italic; color: #64748b;">Ce document ne contient pas les prix. Les prix seront communiqués séparément.</span>
                </div>
            </div>
        </div>
        
        <!-- Observations -->
        ${devis.observations ? `
        <div class="observations">
            <div class="observations-title">Observations</div>
            <div class="observations-content">${devis.observations}</div>
        </div>
        ` : ''}
        
        <!-- Tableau des lignes -->
        <div class="table-container">
            <div class="table-title">Articles du Devis</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 8%;">#</th>
                        <th style="width: 20%;">Article</th>
                        <th style="width: 50%;">Description</th>
                        <th style="width: 10%;">Unité</th>
                        <th style="width: 12%;" class="text-right">Qté</th>
                    </tr>
                </thead>
                <tbody>
                    ${lignesHTML}
                </tbody>
            </table>
        </div>
        
        ${cleanedCgvHtml ? `
        <div class="cgv-section">
            <h2>Conditions générales de vente</h2>
            <div class="cgv-content">
                ${cleanedCgvHtml}
            </div>
        </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
            <div class="footer-left">
                <div class="footer-highlight">
                    Ce devis est valable jusqu'au ${formatDate(devis.dateValidite)}.<br>
                    Merci de nous retourner ce devis signé avec la mention "Bon pour accord".<br>
                    <strong>Note :</strong> Les prix seront communiqués séparément.
                </div>
                <p>© ${entreprise.name} - Document généré automatiquement</p>
            </div>
            <div class="footer-right">
                <p>Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    </div>
</body>
</html>
  `
}

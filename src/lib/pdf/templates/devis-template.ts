export interface DevisData {
  devis: {
    numeroDevis: string
    dateCreation: string
    dateValidite: string
    clientNom: string
    clientEmail: string
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
}

export function generateDevisHTML(data: DevisData): string {
  const { devis, entreprise, logoBase64 } = data
  
  // Calculer les totaux
  const lignesCalculables = devis.lignes.filter(ligne => ligne.type === 'QP')
  const totalHTBrut = lignesCalculables.reduce((sum, ligne) => sum + (Number(ligne.total) || 0), 0)
  const montantRemiseGlobale = totalHTBrut * (devis.remiseGlobale / 100)
  
  let ligneCompteur = 0
  const lignesHTML = devis.lignes.map((ligne) => {
    const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

    if (isSection) {
      const sectionClass = ligne.type === 'TITRE' ? 'section-row section-title' : 'section-row section-subtitle'
      return `
                        <tr class="${sectionClass}">
                            <td colspan="8" class="section-cell">
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
                            <td class="text-right montant">${(ligne.prixUnitaire || 0).toFixed(2)} €</td>
                            <td class="text-right">${ligne.remise > 0 ? `${ligne.remise}%` : '-'}</td>
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
            font-size: 11px;
            line-height: 1.5;
            color: #2d3748;
            background: white;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* En-tête */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #f97316;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 150px;
            max-height: 80px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 10px;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
        }
        
        .document-title {
            flex: 1.5;
            text-align: center;
            padding: 0 20px;
        }
        
        .document-title h1 {
            font-size: 28px;
            font-weight: bold;
            color: #f97316;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        
        .document-title .devis-number {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }
        
        .client-info-header {
            flex: 1;
            text-align: right;
        }
        
        .client-box {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 12px;
            display: inline-block;
            text-align: left;
            min-width: 200px;
        }
        
        .client-box-title {
            font-size: 10px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .client-box-content {
            font-size: 10px;
            color: #78350f;
            line-height: 1.6;
        }
        
        .client-box-content strong {
            display: block;
            font-size: 11px;
            margin-bottom: 4px;
            color: #451a03;
        }
        
        /* Informations devis */}
        .devis-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #f97316;
        }
        
        .devis-meta-item {
            flex: 1;
        }
        
        .devis-meta-label {
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }
        
        .devis-meta-value {
            font-size: 11px;
            font-weight: 600;
            color: #1e293b;
        }
        
        .devis-meta-value.important {
            color: #dc2626;
            font-size: 12px;
        }
        
        /* Observations */
        .observations {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 15px;
            margin-bottom: 20px;
            border-radius: 4px;
        }
        
        .observations-title {
            font-size: 10px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        
        .observations-content {
            font-size: 10px;
            color: #78350f;
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        /* Tableau */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 10px;
        }
        
        thead {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
        }
        
        thead th {
            padding: 10px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        tbody tr {
            border-bottom: 1px solid #e2e8f0;
        }
        
        tbody tr:hover {
            background: #fef3c7;
        }
        
        tbody td {
            padding: 10px 8px;
            vertical-align: middle;
        }
        
        .text-center {
            text-align: center;
        }
        
        .text-right {
            text-align: right;
        }
        
        .montant {
            font-weight: 500;
            color: #1e293b;
        }
        
        /* Sections (Titres et Sous-titres) */
        .section-row {
            background: #fef3c7 !important;
        }
        
        .section-title .section-cell {
            padding: 12px 15px !important;
            font-size: 13px;
            font-weight: bold;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-left: 4px solid #f59e0b;
        }
        
        .section-subtitle .section-cell {
            padding: 10px 15px 10px 25px !important;
            font-size: 11px;
            font-weight: 600;
            color: #78350f;
            border-left: 4px solid #fbbf24;
        }
        
        /* Totaux */
        .totaux {
            width: 350px;
            margin-left: auto;
            background: #f8fafc;
            border-radius: 8px;
            padding: 15px;
            border: 2px solid #e2e8f0;
        }
        
        .totaux-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 11px;
        }
        
        .totaux-row.remise {
            color: #dc2626;
            font-weight: 500;
        }
        
        .totaux-row.total {
            border-top: 2px solid #cbd5e1;
            margin-top: 8px;
            padding-top: 12px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .totaux-row.total .label {
            color: #1e293b;
        }
        
        .totaux-row.total .value {
            color: #f97316;
            font-size: 16px;
        }
        
        /* Conditions générales */
        .conditions {
            margin-top: 30px;
            page-break-before: always;
        }
        
        .conditions-title {
            font-size: 14px;
            font-weight: bold;
            color: #1e293b;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #f97316;
        }
        
        .conditions-content {
            font-size: 9px;
            line-height: 1.6;
            color: #475569;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
        }
        
        /* Pied de page */
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            font-size: 9px;
            color: #64748b;
            text-align: center;
            line-height: 1.5;
        }
        
        .footer-highlight {
            background: #fef3c7;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
            font-weight: 500;
            color: #92400e;
        }
        
        /* Impression */
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .conditions {
                page-break-before: always;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="${entreprise.name}" class="logo">` : `<h2 style="color: #f97316; font-size: 16px;">${entreprise.name}</h2>`}
                <div class="company-info">
                    ${entreprise.address}<br>
                    ${entreprise.zipCode} ${entreprise.city}<br>
                    Tél: ${entreprise.phone}<br>
                    Email: ${entreprise.email}
                    ${entreprise.siret ? `<br>SIRET: ${entreprise.siret}` : ''}
                    ${entreprise.tva ? `<br>TVA: ${entreprise.tva}` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>DEVIS</h1>
                <div class="devis-number">${devis.numeroDevis}</div>
            </div>
            
            <div class="client-info-header">
                <div class="client-box">
                    <div class="client-box-title">Client</div>
                    <div class="client-box-content">
                        <strong>${devis.clientNom}</strong>
                        ${devis.clientEmail}<br>
                        ${devis.clientTelephone ? `Tél: ${devis.clientTelephone}<br>` : ''}
                        ${devis.clientAdresse ? `${devis.clientAdresse}` : ''}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Informations du devis -->
        <div class="devis-meta">
            <div class="devis-meta-item">
                <div class="devis-meta-label">Date d'émission</div>
                <div class="devis-meta-value">${formatDate(devis.dateCreation)}</div>
            </div>
            <div class="devis-meta-item">
                <div class="devis-meta-label">Date de validité</div>
                <div class="devis-meta-value important">${formatDate(devis.dateValidite)}</div>
            </div>
            ${devis.remiseGlobale > 0 ? `
            <div class="devis-meta-item">
                <div class="devis-meta-label">Remise globale</div>
                <div class="devis-meta-value" style="color: #dc2626;">${devis.remiseGlobale}%</div>
            </div>
            ` : ''}
        </div>
        
        <!-- Observations -->
        ${devis.observations ? `
        <div class="observations">
            <div class="observations-title">Observations</div>
            <div class="observations-content">${devis.observations}</div>
        </div>
        ` : ''}
        
        <!-- Tableau des lignes -->
        <table>
            <thead>
                <tr>
                    <th style="width: 30px;">#</th>
                    <th style="width: 80px;">Article</th>
                    <th>Description</th>
                    <th style="width: 50px;">Unité</th>
                    <th style="width: 60px; text-align: right;">Qté</th>
                    <th style="width: 80px; text-align: right;">Prix U.</th>
                    <th style="width: 60px; text-align: right;">Remise</th>
                    <th style="width: 90px; text-align: right;">Total HT</th>
                </tr>
            </thead>
            <tbody>
                ${lignesHTML}
            </tbody>
        </table>
        
        <!-- Totaux -->
        <div class="totaux">
            <div class="totaux-row">
                <span class="label">Total HT (brut)</span>
                <span class="value">${totalHTBrut.toFixed(2)} €</span>
            </div>
            ${devis.remiseGlobale > 0 ? `
            <div class="totaux-row remise">
                <span class="label">Remise globale (${devis.remiseGlobale}%)</span>
                <span class="value">-${montantRemiseGlobale.toFixed(2)} €</span>
            </div>
            ` : ''}
            <div class="totaux-row">
                <span class="label">Total HT (net)</span>
                <span class="value">${devis.montantHT.toFixed(2)} €</span>
            </div>
            <div class="totaux-row">
                <span class="label">TVA (${devis.tauxTVA}%)</span>
                <span class="value">${devis.montantTVA.toFixed(2)} €</span>
            </div>
            <div class="totaux-row total">
                <span class="label">TOTAL TTC</span>
                <span class="value">${devis.montantTTC.toFixed(2)} €</span>
            </div>
        </div>
        
        <!-- Pied de page première page -->
        <div class="footer">
            <div class="footer-highlight">
                Ce devis est valable jusqu'au ${formatDate(devis.dateValidite)}.<br>
                Merci de nous retourner ce devis signé avec la mention "Bon pour accord".
            </div>
            ${entreprise.name} - ${entreprise.address}, ${entreprise.zipCode} ${entreprise.city}<br>
            Tél: ${entreprise.phone} - Email: ${entreprise.email}
            ${entreprise.siret ? ` - SIRET: ${entreprise.siret}` : ''}
            ${entreprise.tva ? ` - TVA: ${entreprise.tva}` : ''}
        </div>
        
        <!-- Note : Les conditions générales doivent être ajoutées via le système de templates de contrats -->
        <!-- TODO: Intégrer le template CGV depuis /admin/templates-contrats -->
    </div>
</body>
</html>
  `
}


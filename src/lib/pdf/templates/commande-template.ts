export interface CommandeData {
  commande: {
    id: number
    reference: string
    dateCommande: string
    clientNom: string
    tauxTVA: number
    lignes: Array<{
      id: number
      ordre: number
      article: string
      description: string
      type: string
      unite: string
      prixUnitaire: number
      quantite: number
      total: number
      estOption: boolean
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
  chantierId: string
  logoBase64?: string
  cgvHtml?: string
}

export function generateCommandeHTML(data: CommandeData): string {
  const { commande, entreprise, chantierId, logoBase64, cgvHtml } = data
  
  // Calculer les totaux
  const lignesCalculables = commande.lignes.filter(ligne => ligne.type !== 'TITRE' && ligne.type !== 'SOUS_TITRE')
  const totalHT = lignesCalculables.reduce((sum, ligne) => sum + ligne.total, 0)
  const totalTVA = totalHT * (commande.tauxTVA / 100)
  const totalTTC = totalHT + totalTVA

  let ligneCompteur = 0
  const lignesHTML = commande.lignes.map((ligne) => {
    const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

    if (isSection) {
      const sectionClass = ligne.type === 'TITRE' ? 'section-row section-title' : 'section-row section-subtitle'
      return `
                        <tr class="${sectionClass}">
                            <td colspan="9" class="section-cell">
                                ${ligne.description || ligne.article}
                            </td>
                        </tr>
      `
    }

    ligneCompteur += 1

    return `
                        <tr>
                            <td class="text-center">${ligneCompteur}</td>
                            <td><strong>${ligne.article}</strong></td>
                            <td>${ligne.description}</td>
                            <td class="text-center">${ligne.type}</td>
                            <td class="text-center">${ligne.unite}</td>
                            <td class="text-right montant">${ligne.prixUnitaire.toFixed(2)} €</td>
                            <td class="text-center">${ligne.quantite}</td>
                            <td class="text-right montant">${ligne.total.toFixed(2)} €</td>
                            <td class="text-center">
                                <span class="option-badge ${ligne.estOption ? 'option-yes' : 'option-no'}">
                                    ${ligne.estOption ? 'Oui' : 'Non'}
                                </span>
                            </td>
                        </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bon de Commande - ${commande.reference}</title>
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
            /* Optimisé pour paysage */
            width: 100%;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 12px;
            background: white;
            /* Mode paysage - plus d'espace horizontal */
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
        
        .reference-badge {
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
        
        .project-info {
            flex: 1;
            text-align: right;
            font-size: 9px;
        }
        
        .project-info .label {
            font-weight: bold;
            color: #374151;
        }
        
        .project-info .value {
            color: #64748b;
            margin-bottom: 3px;
        }
        
        /* Informations du projet */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
            padding: 15px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-section h3 {
            font-size: 11px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .info-section p {
            margin-bottom: 4px;
            font-size: 9px;
        }
        
        .info-section .label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            min-width: 80px;
        }
        
        /* Tableaux */
        .table-container {
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: none;
            /* Permettre les sauts de page dans les grands tableaux */
            page-break-inside: auto;
            break-inside: auto;
        }
        
        .table-container.small-table {
            /* Tables de moins de 5 lignes évitent les sauts */
            page-break-inside: avoid;
            break-inside: avoid;
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
        
        tr:hover {
            background: white;
        }
        
        .montant {
            font-weight: 600;
            color: #1e40af;
        }
        
        .quantite-actuelle {
            background: white;
            border: 1px solid #3b82f6;
            font-weight: bold;
            color: #1e40af;
        }
        
        .option-badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 7px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .option-yes {
            background: #dcfce7;
            color: #166534;
        }
        
        .option-no {
            background: #e2e8f0;
            color: #64748b;
        }

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
        
        /* Résumé financier */
        .financial-summary {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
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
        
        .summary-row.total {
            border-top: 1px solid #e2e8f0;
            padding-top: 6px;
            margin-top: 6px;
            font-weight: bold;
            color: #1e40af;
            font-size: 12px;
        }
        
        /* Styles spécifiques pour chaque carte */
        .summary-card:nth-child(1) {
            border-left-color: #3b82f6;
        }
        
        .summary-card:nth-child(2) {
            border-left-color: #f59e0b;
        }
        
        .summary-card:nth-child(3) {
            border-left-color: #10b981;
        }
        
        .cgv-section {
            margin-top: 12px;
            page-break-before: always;
            padding-top: 6px;
        }

        .cgv-section h2 {
            font-size: 12px;
            font-weight: 700;
            color: #111827;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .cgv-content {
            font-size: 10px;
            line-height: 1.5;
            color: #1f2937;
        }

        .cgv-content * {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            color: inherit !important;
            padding: 0 !important;
            margin: 0 0 8px 0 !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }

        .cgv-content strong {
            font-weight: 600 !important;
        }

        .cgv-content em {
            font-style: italic !important;
        }

        .cgv-content ul,
        .cgv-content ol {
            margin-left: 16px !important;
        }

        .cgv-content li {
            margin-bottom: 4px !important;
        }

        .cgv-content h1,
        .cgv-content h2,
        .cgv-content h3,
        .cgv-content h4,
        .cgv-content h5,
        .cgv-content h6 {
            font-size: 11px !important;
            font-weight: 600 !important;
            margin-top: 12px !important;
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
        
        /* Utilitaires */
        .text-blue { color: #1e40af; }
        .text-green { color: #059669; }
        .text-orange { color: #d97706; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        
        /* Responsive pour impression */
        @media print {
            body { font-size: 9px; }
            .container { padding: 10px; }
            .table-container { break-inside: avoid; }
        }
        
        /* Pagination */
        .page-break {
            page-break-after: always;
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
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : `
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
                <h1>BON DE COMMANDE</h1>
                <div class="document-subtitle">Document de commande professionnel</div>
            </div>
            
            <div class="project-info">
                <div class="label">Date de commande</div>
                <div class="value">${new Date(commande.dateCommande).toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
                <div class="label">Client</div>
                <div class="value">${commande.clientNom || 'Non spécifié'}</div>
                <div class="label">Chantier</div>
                <div class="value">${chantierId}</div>
            </div>
        </div>
        
        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-section">
                <h3>Informations Entreprise</h3>
                <p><span class="label">Raison sociale:</span> ${entreprise.name}</p>
                <p><span class="label">Adresse:</span> ${entreprise.address}</p>
                <p><span class="label">Ville:</span> ${entreprise.zipCode} ${entreprise.city}</p>
                <p><span class="label">Téléphone:</span> ${entreprise.phone}</p>
                <p><span class="label">Email:</span> ${entreprise.email}</p>
                ${entreprise.siret ? `<p><span class="label">SIRET:</span> ${entreprise.siret}</p>` : ''}
                ${entreprise.tva ? `<p><span class="label">TVA:</span> ${entreprise.tva}</p>` : ''}
            </div>
            
            <div class="info-section">
                <h3>Détails de la Commande</h3>
                <p><span class="label">Référence:</span> ${commande.reference || `CMD-${commande.id}`}</p>
                <p><span class="label">Date:</span> ${new Date(commande.dateCommande).toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</p>
                <p><span class="label">Client:</span> ${commande.clientNom || 'Non spécifié'}</p>
                <p><span class="label">Chantier:</span> ${chantierId}</p>
                <p><span class="label">Taux TVA:</span> ${commande.tauxTVA}%</p>
            </div>
        </div>
        
        <!-- Tableau des articles -->
        <div class="table-container">
            <div class="table-title">Articles Commandés</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 15%;">Article</th>
                        <th style="width: 30%;">Description</th>
                        <th style="width: 8%;">Type</th>
                        <th style="width: 8%;">Unité</th>
                        <th style="width: 12%;" class="text-right">Prix Unitaire</th>
                        <th style="width: 8%;" class="text-center">Quantité</th>
                        <th style="width: 12%;" class="text-right">Total</th>
                        <th style="width: 8%;" class="text-center">Option</th>
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
                <div class="summary-row total">
                    <span>Montant HT</span>
                    <span class="montant">${totalHT.toFixed(2)} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>TVA</h4>
                <div class="summary-row total">
                    <span>TVA (${commande.tauxTVA}%)</span>
                    <span class="montant">${totalTVA.toFixed(2)} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>Total TTC</h4>
                <div class="summary-row total">
                    <span>Montant TTC</span>
                    <span class="montant">${totalTTC.toFixed(2)} €</span>
                </div>
            </div>
        </div>
        
        ${cgvHtml ? `
        <div class="cgv-section">
            <h2>Conditions générales de vente</h2>
            <div class="cgv-content">
                ${cgvHtml}
            </div>
        </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
            <div class="footer-left">
                <p>© ${entreprise.name} - Document généré automatiquement</p>
            </div>
            <div class="footer-right">
                <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
        </div>
    </div>
</body>
</html>
  `
}
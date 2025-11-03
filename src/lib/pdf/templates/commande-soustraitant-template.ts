import { CompanySettings } from '../pdf-generator'

export interface CommandeSoustraitantData {
  // Informations de base
  reference: string
  dateCommande: Date
  estVerrouillee: boolean

  // Chantier
  chantier: {
    nomChantier: string
    adresseChantier: string
    chantierId: string
  }
  
  // Sous-traitant
  soustraitant: {
    nom: string
    contact?: string
    email?: string
    adresse?: string
    telephone?: string
    tva?: string
  }

  // Lignes de commande
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
  }>

  // Totaux
  sousTotal: number
  tauxTVA: number
  tva: number
  totalTTC: number
}

export function generateCommandeSoustraitantHTML(
  data: CommandeSoustraitantData,
  companySettings: CompanySettings | null,
  logoBase64?: string
): string {
  // Couleurs pour les sous-traitants (orange)
  const colors = {
    primary: '#ea580c', // Orange-600 
    primaryLight: '#fed7aa', // Orange-200
    primaryDark: '#c2410c', // Orange-700
    accent: '#fb923c', // Orange-400
    accentLight: '#ffedd5', // Orange-100
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bon de Commande - ${data.reference}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        :root {
            --color-primary: ${colors.primary};
            --color-primary-light: ${colors.primaryLight};
            --color-primary-dark: ${colors.primaryDark};
            --color-accent: ${colors.accent};
            --color-accent-light: ${colors.accentLight};
        }
        
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
            width: 100%;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 12px;
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
            color: var(--color-primary);
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
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
            color: white;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-verrouillee {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        
        .status-brouillon {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
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
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-section h3 {
            font-size: 11px;
            font-weight: bold;
            color: var(--color-primary);
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
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            page-break-inside: auto;
            break-inside: auto;
        }
        
        .table-container.small-table {
            page-break-inside: avoid;
            break-inside: avoid;
        }
        
        .table-title {
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
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
        
        th {
            background: var(--color-accent-light);
            padding: 8px 6px;
            text-align: left;
            font-size: 8px;
            font-weight: bold;
            color: #374151;
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th.text-center, td.text-center { text-align: center; }
        th.text-right, td.text-right { text-align: right; }
        
        td {
            padding: 6px;
            font-size: 8px;
            border-bottom: 1px solid #f1f5f9;
            vertical-align: top;
        }
        
        tr:nth-child(even) {
            background: #fafbfc;
        }
        
        .montant {
            font-weight: 600;
            color: var(--color-primary);
        }
        
        /* Résumé financier */
        .financial-summary {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        
        .summary-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            position: relative;
            border-left: 3px solid var(--color-primary);
        }
        
        .summary-card h4 {
            font-size: 12px;
            font-weight: bold;
            color: var(--color-primary);
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
            color: var(--color-primary);
            font-size: 12px;
        }
        
        /* Styles spécifiques pour chaque carte */
        .summary-card:nth-child(1) {
            border-left-color: var(--color-accent);
        }
        
        .summary-card:nth-child(2) {
            border-left-color: #f59e0b;
        }
        
        .summary-card:nth-child(3) {
            border-left-color: var(--color-primary);
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
        .text-orange { color: var(--color-primary); }
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
                ${logoBase64 && logoBase64.trim() !== '' ? `<img src="${logoBase64}" alt="Logo" class="logo">` : `
                    <div style="width: 120px; height: 60px; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                        ${companySettings?.nomEntreprise?.substring(0, 3).toUpperCase() || 'SEC'}
                    </div>
                `}
                <div class="company-info">
                    ${companySettings?.nomEntreprise || 'Nom Entreprise'}<br>
                    ${companySettings?.adresse || 'Adresse entreprise'}<br>
                    ${companySettings?.telephone ? `Tél: ${companySettings.telephone}<br>` : ''}
                    ${companySettings?.email || ''}
                    ${companySettings?.siret ? `<br>SIRET: ${companySettings.siret}` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>BON DE COMMANDE</h1>
                <div class="document-subtitle">Document de commande professionnel</div>
                <div style="margin-top: 8px;">
                    <span class="reference-badge">${data.reference}</span>
                </div>
            </div>
            
            <div class="project-info">
                <div><span class="label">Date:</span> ${new Date(data.dateCommande).toLocaleDateString('fr-FR')}</div>
                <div><span class="label">Chantier:</span> ${data.chantier.chantierId}</div>
                <div><span class="label">Statut:</span> <span class="status-badge ${data.estVerrouillee ? 'status-verrouillee' : 'status-brouillon'}">${data.estVerrouillee ? '✓ Verrouillée' : '⚠ Brouillon'}</span></div>
            </div>
        </div>
        
        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-section">
                <h3>🏗️ Informations du chantier</h3>
                <p><span class="label">Nom:</span> ${data.chantier.nomChantier}</p>
                <p><span class="label">Adresse:</span> ${data.chantier.adresseChantier || 'Non spécifiée'}</p>
                <p><span class="label">Référence:</span> ${data.chantier.chantierId}</p>
            </div>
            
            <div class="info-section">
                <h3>🔧 Informations sous-traitant</h3>
                <p><span class="label">Entreprise:</span> ${data.soustraitant.nom}</p>
                ${data.soustraitant.contact ? `<p><span class="label">Contact:</span> ${data.soustraitant.contact}</p>` : ''}
                ${data.soustraitant.adresse ? `<p><span class="label">Adresse:</span> ${data.soustraitant.adresse}</p>` : ''}
                ${data.soustraitant.telephone ? `<p><span class="label">Téléphone:</span> ${data.soustraitant.telephone}</p>` : ''}
                ${data.soustraitant.email ? `<p><span class="label">Email:</span> ${data.soustraitant.email}</p>` : ''}
                ${data.soustraitant.tva ? `<p><span class="label">TVA:</span> ${data.soustraitant.tva}</p>` : ''}
            </div>
        </div>
        
        <!-- Tableau des articles -->
        <div class="table-container${data.lignes.length <= 5 ? ' small-table' : ''}">
            <div class="table-title">📋 Articles Commandés</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 6%">Article</th>
                        <th style="width: 30%">Description</th>
                        <th style="width: 5%" class="text-center">Type</th>
                        <th style="width: 5%" class="text-center">Unité</th>
                        <th style="width: 10%" class="text-right">P.U. (€)</th>
                        <th style="width: 8%" class="text-center">Quantité</th>
                        <th style="width: 12%" class="text-right">Total (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.lignes.map((ligne, index) => `
                        <tr>
                            <td class="text-center font-bold">${ligne.article}</td>
                            <td>${ligne.description}</td>
                            <td class="text-center">${ligne.type}</td>
                            <td class="text-center">${ligne.unite}</td>
                            <td class="text-right">${ligne.prixUnitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-center">${ligne.quantite.toLocaleString('fr-FR')}</td>
                            <td class="text-right montant font-bold">${ligne.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- Résumé financier -->
        <div class="financial-summary">
            <div class="summary-card">
                <h4>Total HT</h4>
                <div class="summary-row">
                    <span>Montant HT</span>
                    <span class="montant">${data.sousTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>TVA</h4>
                <div class="summary-row">
                    <span>TVA (${data.tauxTVA}%)</span>
                    <span class="montant">${data.tva.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>Total TTC</h4>
                <div class="summary-row total">
                    <span>Montant TTC</span>
                    <span class="text-orange">${data.totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
        </div>
        
        <!-- Pied de page -->
        <div class="footer">
            <div class="footer-left">
                Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </div>
            <div class="footer-right">
                ${companySettings?.nomEntreprise || 'Nom Entreprise'}
            </div>
        </div>
    </div>
</body>
</html>
  `
}

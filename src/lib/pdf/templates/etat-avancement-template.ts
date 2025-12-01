import { CompanySettings } from '../pdf-generator'

export interface EtatAvancementData {
  // Informations de base
  numero: number
  date: Date
  estFinalise: boolean
  mois?: string
  commentaires?: string

  // Chantier et client
  chantier: {
    nomChantier: string
    adresseChantier: string
    chantierId: string
  }
  
  client: {
    nom: string
    adresse?: string
  }

  // Sous-traitant (pour les états sous-traitants)
  soustraitant?: {
    nom: string
    contact?: string
  }

  // Lignes et avenants
  lignes: Array<{
    article: string
    description: string
    type: string
    unite: string
    prixUnitaire: number
    quantite: number
    quantitePrecedente: number
    quantiteActuelle: number
    quantiteTotale: number
    montantPrecedent: number
    montantActuel: number
    montantTotal: number
  }>

  avenants: Array<{
    article: string
    description: string
    type: string
    unite: string
    prixUnitaire: number
    quantite: number
    quantitePrecedente: number
    quantiteActuelle: number
    quantiteTotale: number
    montantPrecedent: number
    montantActuel: number
    montantTotal: number
  }>

  // Totaux
  totalCommandeInitiale: {
    precedent: number
    actuel: number
    total: number
  }
  
  totalAvenants: {
    precedent: number
    actuel: number
    total: number
  }
  
  totalGeneral: {
    precedent: number
    actuel: number
    total: number
  }
}

export function generateEtatAvancementHTML(
  data: EtatAvancementData,
  companySettings: CompanySettings | null,
  type: 'client' | 'soustraitant' = 'client'
): string {
  // Logo en base64 fourni par le générateur PDF
  const logoBase64 = companySettings?.logo || ''

  // Couleurs selon le type
  const colors = type === 'soustraitant' ? {
    primary: '#ea580c', // Orange-600 
    primaryLight: '#fed7aa', // Orange-200
    primaryDark: '#c2410c', // Orange-700
    accent: '#fb923c', // Orange-400
    accentLight: '#ffedd5', // Orange-100
  } : {
    primary: '#1e40af', // Blue-800
    primaryLight: '#dbeafe', // Blue-100
    primaryDark: '#1e3a8a', // Blue-900
    accent: '#3b82f6', // Blue-500
    accentLight: '#eff6ff', // Blue-50
  }

  const lignesPrincipalesHTML = data.lignes.map(ligne => {
    const isSection = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

    if (isSection) {
      const sectionClass = ligne.type === 'TITRE' ? 'section-row section-title' : 'section-row section-subtitle'
      return `
                        <tr class="${sectionClass}">
                            <td colspan="12" class="section-cell">
                                ${ligne.description || ligne.article}
                            </td>
                        </tr>
      `
    }

    return `
                        <tr>
                            <td class="text-center font-bold">${ligne.article}</td>
                            <td>${ligne.description}</td>
                            <td class="text-center">${ligne.type}</td>
                            <td class="text-center">${ligne.unite}</td>
                            <td class="text-right">${ligne.prixUnitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right">${ligne.quantite.toLocaleString('fr-FR')}</td>
                            <td class="text-right">${ligne.quantitePrecedente.toLocaleString('fr-FR')}</td>
                            <td class="text-right quantite-actuelle">${ligne.quantiteActuelle.toLocaleString('fr-FR')}</td>
                            <td class="text-right font-bold">${ligne.quantiteTotale.toLocaleString('fr-FR')}</td>
                            <td class="text-right">${ligne.montantPrecedent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right montant">${ligne.montantActuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right font-bold montant">${ligne.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                        </tr>
    `
  }).join('')

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>État d'avancement ${type === 'client' ? 'Client' : 'Sous-traitant'} N°${data.numero}</title>
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
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .status-finalise {
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
            background: #eff6ff;
            font-weight: bold;
            color: #1e40af;
        }

        .section-row.section-title td {
            background: linear-gradient(135deg, var(--color-accent-light) 0%, rgba(59,130,246,0.15) 100%);
            color: var(--color-primary-dark);
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .section-row.section-subtitle td {
            background: white;
            color: #475569;
            font-weight: 600;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
        }

        .section-cell {
            padding: 8px 6px;
            font-size: 9px;
        }
        
        /* Résumé financier */
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
        
        /* Commentaires */
        .comments-section {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .comments-section h3 {
            font-size: 11px;
            font-weight: bold;
            color: var(--color-primary);
            margin-bottom: 8px;
            text-transform: uppercase;
        }
        
        .comments-content {
            font-size: 9px;
            line-height: 1.5;
            color: #374151;
            white-space: pre-wrap;
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
        
        .comments-section {
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
                    <div style="width: 120px; height: 60px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                        ${companySettings?.nomEntreprise?.substring(0, 3).toUpperCase() || 'SEC'}
                    </div>
                `}
                <div class="company-info">
                    ${companySettings?.nomEntreprise || 'Nom Entreprise'}<br>
                    ${companySettings?.adresse || 'Adresse entreprise'}<br>
                    ${companySettings?.telephone ? `Tél: ${companySettings.telephone}<br>` : ''}
                    ${companySettings?.email || ''}
                    ${companySettings?.siret ? `<br>TVA: ${companySettings.siret}` : ''}
                </div>
            </div>
            
            <div class="document-title">
                <h1>État d'avancement ${type === 'client' ? 'Client' : 'Sous-traitant'}</h1>
                <div class="document-subtitle">Situation N°${data.numero}</div>
            </div>
            
            <div class="project-info">
                <div><span class="label">Date:</span> ${data.date.toLocaleDateString('fr-FR')}</div>
                ${data.mois ? `<div><span class="label">Période:</span> ${data.mois}</div>` : ''}
                <div><span class="label">Chantier:</span> ${data.chantier.chantierId}</div>
                <div><span class="label">Statut:</span> <span class="status-badge ${data.estFinalise ? 'status-finalise' : 'status-brouillon'}">${data.estFinalise ? '✓ Finalisé' : '⚠ Brouillon'}</span></div>
            </div>
        </div>
        
        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-section">
                <h3>🏗️ Informations du chantier</h3>
                <p><span class="label">Nom:</span> ${data.chantier.nomChantier}</p>
                <p><span class="label">Adresse:</span> ${data.chantier.adresseChantier}</p>
                ${type === 'client' ? `
                    <p><span class="label">Client:</span> ${data.client.nom}</p>
                    ${data.client.adresse ? `<p><span class="label">Adresse client:</span> ${data.client.adresse}</p>` : ''}
                ` : ''}
            </div>
            
            <div class="info-section">
                <h3>${type === 'client' ? '👤' : '🔧'} ${type === 'client' ? 'Informations client' : 'Informations sous-traitant'}</h3>
                ${type === 'soustraitant' && data.soustraitant ? `
                    <p><span class="label">Entreprise:</span> ${data.soustraitant.nom}</p>
                    ${data.soustraitant.contact ? `<p><span class="label">Contact:</span> ${data.soustraitant.contact}</p>` : ''}
                ` : `
                    <p><span class="label">Société:</span> ${data.client.nom}</p>
                    ${data.client.adresse ? `<p><span class="label">Adresse:</span> ${data.client.adresse}</p>` : ''}
                `}
            </div>
        </div>
        
        <!-- Tableau des lignes principales -->
        ${data.lignes.length > 0 ? `
        <div class="table-container${data.lignes.length <= 5 ? ' small-table' : ''}">
            <div class="table-title">📋 Lignes de commande${type === 'client' ? ' initiale' : ''}</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 6%">Article</th>
                        <th style="width: 26%">Description</th>
                        <th style="width: 5%" class="text-center">Type</th>
                        <th style="width: 5%" class="text-center">Unité</th>
                        <th style="width: 9%" class="text-right">P.U. (€)</th>
                        <th style="width: 5%" class="text-right">Qté totale</th>
                        <th style="width: 5%" class="text-right">Qté précéd.</th>
                        <th style="width: 5%" class="text-right">Qté actuelle</th>
                        <th style="width: 5%" class="text-right">Total qté</th>
                        <th style="width: 9%" class="text-right">Mt précéd. (€)</th>
                        <th style="width: 10%" class="text-right">Mt actuel (€)</th>
                        <th style="width: 10%" class="text-right">Mt total (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${lignesPrincipalesHTML}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Tableau des avenants -->
        ${data.avenants.length > 0 ? `
        <div class="table-container${data.avenants.length <= 5 ? ' small-table' : ''}">
            <div class="table-title">📝 Avenants</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 6%">Article</th>
                        <th style="width: 26%">Description</th>
                        <th style="width: 5%" class="text-center">Type</th>
                        <th style="width: 5%" class="text-center">Unité</th>
                        <th style="width: 9%" class="text-right">P.U. (€)</th>
                        <th style="width: 5%" class="text-right">Qté totale</th>
                        <th style="width: 5%" class="text-right">Qté précéd.</th>
                        <th style="width: 5%" class="text-right">Qté actuelle</th>
                        <th style="width: 5%" class="text-right">Total qté</th>
                        <th style="width: 9%" class="text-right">Mt précéd. (€)</th>
                        <th style="width: 10%" class="text-right">Mt actuel (€)</th>
                        <th style="width: 10%" class="text-right">Mt total (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.avenants.map(avenant => `
                        <tr>
                            <td class="text-center font-bold">${avenant.article}</td>
                            <td>${avenant.description}</td>
                            <td class="text-center">${avenant.type}</td>
                            <td class="text-center">${avenant.unite}</td>
                            <td class="text-right">${avenant.prixUnitaire.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right">${avenant.quantite.toLocaleString('fr-FR')}</td>
                            <td class="text-right">${avenant.quantitePrecedente.toLocaleString('fr-FR')}</td>
                            <td class="text-right quantite-actuelle">${avenant.quantiteActuelle.toLocaleString('fr-FR')}</td>
                            <td class="text-right font-bold">${avenant.quantiteTotale.toLocaleString('fr-FR')}</td>
                            <td class="text-right">${avenant.montantPrecedent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right montant">${avenant.montantActuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                            <td class="text-right font-bold montant">${avenant.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
        
        <!-- Résumé financier -->
        <div class="financial-summary">
            <div class="summary-card">
                <h4>💰 Commande initiale</h4>
                <div class="summary-row">
                    <span>Précédent:</span>
                    <span class="montant">${data.totalCommandeInitiale.precedent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row">
                    <span>Actuel:</span>
                    <span class="montant">${data.totalCommandeInitiale.actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>${data.totalCommandeInitiale.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>📝 Avenants</h4>
                <div class="summary-row">
                    <span>Précédent:</span>
                    <span class="montant">${data.totalAvenants.precedent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row">
                    <span>Actuel:</span>
                    <span class="montant">${data.totalAvenants.actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span>${data.totalAvenants.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
            
            <div class="summary-card">
                <h4>🎯 Total général</h4>
                <div class="summary-row">
                    <span>Précédent:</span>
                    <span class="montant">${data.totalGeneral.precedent.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row">
                    <span>Actuel:</span>
                    <span class="montant">${data.totalGeneral.actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span class="text-blue">${data.totalGeneral.total.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
            </div>
        </div>
        
        <!-- Commentaires -->
        ${data.commentaires ? `
        <div class="comments-section">
            <h3>💬 Commentaires</h3>
            <div class="comments-content">${data.commentaires}</div>
        </div>
        ` : ''}
        
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

import { CompanySettings } from '../pdf-generator'

export interface MetreSoustraitantData {
  // Informations de base
  id: string
  statut: string
  commentaire?: string | null
  createdAt: Date

  // Chantier
  chantier: {
    nomChantier: string
    chantierId: string
    clientNom?: string | null
  }
  
  // Sous-traitant
  soustraitant: {
    nom: string
    email?: string | null
  }

  // Commande associée (optionnelle)
  commande?: {
    id: number
    reference?: string | null
  } | null

  // Lignes du métré
  lignes: Array<{
    id: string
    article: string
    description: string
    type: string
    unite: string
    prixUnitaire: number
    quantite: number
    estSupplement: boolean
  }>

  logoBase64?: string
}

export function generateMetreSoustraitantHTML(
  data: MetreSoustraitantData,
  companySettings: CompanySettings | null,
  logoBase64?: string
): string {
  // Couleurs pour les métrés soustraitants (violet/indigo)
  const colors = {
    primary: '#7c3aed', // Violet-600 
    primaryLight: '#ddd6fe', // Violet-200
    primaryDark: '#5b21b6', // Violet-700
    accent: '#a78bfa', // Violet-400
    accentLight: '#ede9fe', // Violet-100
  }

  const total = data.lignes.reduce((sum, ligne) => sum + (ligne.prixUnitaire * ligne.quantite), 0)

  // Formater la date
  const dateFormatee = new Date(data.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  // Badge de statut
  const getStatutBadge = (statut: string) => {
    const badges: Record<string, { bg: string; color: string; border: string; label: string }> = {
      'SOUMIS': { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Soumis' },
      'VALIDE': { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', label: 'Validé' },
      'PARTIELLEMENT_VALIDE': { bg: '#fed7aa', color: '#9a3412', border: '#fdba74', label: 'Partiellement validé' },
      'REJETE': { bg: '#fee2e2', color: '#991b1b', border: '#fecaca', label: 'Rejeté' },
      'BROUILLON': { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', label: 'Brouillon' },
    }
    return badges[statut] || badges['BROUILLON']
  }

  const statutBadge = getStatutBadge(data.statut)

  // Générer les lignes du tableau
  const lignesHTML = data.lignes.map((ligne, index) => {
    const totalLigne = ligne.prixUnitaire * ligne.quantite
    return `
      <tr>
        <td style="text-align: center; font-weight: 500;">${index + 1}</td>
        <td>${ligne.article || '-'}</td>
        <td>${ligne.description || '-'}</td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; background: ${colors.accentLight}; color: ${colors.primaryDark}; border-radius: 4px; font-size: 8px; font-weight: 600;">
            ${ligne.type}
          </span>
        </td>
        <td style="text-align: center;">${ligne.unite}</td>
        <td style="text-align: right; font-weight: 500;">${ligne.prixUnitaire.toFixed(2)} €</td>
        <td style="text-align: right; font-weight: 500;">${ligne.quantite.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="text-align: right; font-weight: 600; color: ${colors.primaryDark};">
          ${totalLigne.toFixed(2)} €
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
    <title>Métré - ${data.chantier.nomChantier}</title>
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
        
        @page {
            size: A4 portrait;
            margin: 15mm;
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
            padding: 0;
            background: white;
        }
        
        /* En-tête */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px solid var(--color-primary);
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
            font-size: 11px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .statut-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: ${statutBadge.bg};
            color: ${statutBadge.color};
            border: 1px solid ${statutBadge.border};
        }
        
        .date-info {
            flex: 1;
            text-align: right;
            font-size: 9px;
        }
        
        .date-info .label {
            font-weight: bold;
            color: #374151;
        }
        
        .date-info .value {
            color: #64748b;
            margin-bottom: 3px;
        }
        
        /* Informations du projet */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .info-card {
            background: white;
            padding: 12px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            border-left: 4px solid var(--color-primary);
        }
        
        .info-card h3 {
            font-size: 10px;
            font-weight: bold;
            color: var(--color-primary);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-item {
            margin-bottom: 5px;
            font-size: 9px;
        }
        
        .info-label {
            font-weight: 600;
            color: #64748b;
            display: inline-block;
            min-width: 80px;
        }
        
        .info-value {
            color: #1f2937;
            font-weight: 500;
        }
        
        /* Tableau */
        .table-container {
            margin-bottom: 20px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }
        
        thead {
            background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%);
            color: white;
        }
        
        th {
            padding: 10px 8px;
            text-align: left;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th.text-center { text-align: center; }
        th.text-right { text-align: right; }
        
        tbody tr {
            border-bottom: 1px solid #e2e8f0;
        }
        
        tbody tr:nth-child(even) {
            background: #f9fafb;
        }
        
        td {
            padding: 8px;
            font-size: 9px;
            vertical-align: top;
        }
        
        tfoot {
            background: var(--color-accent-light);
            border-top: 2px solid var(--color-primary);
        }
        
        tfoot td {
            padding: 12px 8px;
            font-weight: 700;
            color: var(--color-primary-dark);
        }
        
        tfoot td.text-right {
            text-align: right;
        }
        
        /* Commentaire */
        .commentaire-section {
            background: #fefce8;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        
        .commentaire-section h3 {
            font-size: 10px;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 6px;
            text-transform: uppercase;
        }
        
        .commentaire-section p {
            font-size: 9px;
            color: #78350f;
            white-space: pre-wrap;
        }
        
        /* Pied de page */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 8px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ''}
                <div class="company-info">
                    ${companySettings?.name || 'Entreprise'}<br>
                    ${companySettings?.address || ''}<br>
                    ${companySettings?.zipCode || ''} ${companySettings?.city || ''}<br>
                    ${companySettings?.phone ? `Tél: ${companySettings.phone}` : ''}<br>
                    ${companySettings?.email ? `Email: ${companySettings.email}` : ''}
                </div>
            </div>
            <div class="document-title">
                <h1>Métré Soumis</h1>
                <div class="document-subtitle">Par sous-traitant</div>
                <div style="margin-top: 8px;">
                    <span class="statut-badge">${statutBadge.label}</span>
                </div>
            </div>
            <div class="date-info">
                <div class="label">Date de soumission</div>
                <div class="value">${dateFormatee}</div>
            </div>
        </div>

        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-card">
                <h3>Chantier</h3>
                <div class="info-item">
                    <span class="info-label">Nom:</span>
                    <span class="info-value">${data.chantier.nomChantier}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Référence:</span>
                    <span class="info-value">${data.chantier.chantierId}</span>
                </div>
                ${data.chantier.clientNom ? `
                <div class="info-item">
                    <span class="info-label">Client:</span>
                    <span class="info-value">${data.chantier.clientNom}</span>
                </div>
                ` : ''}
            </div>
            <div class="info-card">
                <h3>Sous-traitant</h3>
                <div class="info-item">
                    <span class="info-label">Nom:</span>
                    <span class="info-value">${data.soustraitant.nom}</span>
                </div>
                ${data.soustraitant.email ? `
                <div class="info-item">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.soustraitant.email}</span>
                </div>
                ` : ''}
                ${data.commande ? `
                <div class="info-item">
                    <span class="info-label">Commande:</span>
                    <span class="info-value">${data.commande.reference || `#${data.commande.id}`}</span>
                </div>
                ` : ''}
            </div>
        </div>

        ${data.commentaire ? `
        <!-- Commentaire -->
        <div class="commentaire-section">
            <h3>Commentaire</h3>
            <p>${data.commentaire}</p>
        </div>
        ` : ''}

        <!-- Tableau des lignes -->
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 12%;">Article</th>
                        <th style="width: 30%;">Description</th>
                        <th style="width: 8%;" class="text-center">Type</th>
                        <th style="width: 8%;" class="text-center">Unité</th>
                        <th style="width: 12%;" class="text-right">Prix Unitaire</th>
                        <th style="width: 10%;" class="text-right">Quantité</th>
                        <th style="width: 15%;" class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${lignesHTML}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="7" class="text-right" style="font-size: 11px;">Total HT:</td>
                        <td class="text-right" style="font-size: 14px;">${total.toFixed(2)} €</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p>Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            <p>Métré ID: ${data.id}</p>
        </div>
    </div>
</body>
</html>
  `
}

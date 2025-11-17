export interface MetreData {
  metre: {
    id: string
    date: string
    commentaire: string | null
    createdAt: string
    categories: Array<{
      id: string
      nom: string
      unite: string
      lignes: Array<{
        id: string
        description: string
        unite: string
        longueur: number | null
        largeur: number | null
        hauteur: number | null
        quantite: number
        notes: string | null
      }>
    }>
    createdByUser: {
      id: string
      name: string | null
      email: string
    }
  }
  chantier: {
    chantierId: string
    nomChantier: string
    clientNom: string | null
    adresseChantier: string | null
  }
  companySettings: {
    nom: string
    adresse: string | null
    codePostal: string | null
    ville: string | null
    telephone: string | null
    email: string | null
    siret: string | null
    tva: string | null
    logo?: string
  }
  logoBase64?: string
}

export function generateMetreHTML(data: MetreData): string {
  const { metre, chantier, companySettings, logoBase64 } = data

  // Calculer les totaux par catégorie
  const calculateTotalCategorie = (categorie: typeof metre.categories[0]): number => {
    return categorie.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
  }

  // Formater la date
  const dateFormatee = new Date(metre.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Métré - ${chantier.nomChantier}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
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
            font-size: 10pt;
            line-height: 1.5;
            color: #2d3748;
            background: white;
        }
        
        .container {
            width: 100%;
            max-width: 210mm;
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
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        
        .company-info {
            flex: 1;
        }
        
        .company-name {
            font-size: 20pt;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 8px;
        }
        
        .company-details {
            font-size: 9pt;
            color: #6b7280;
            line-height: 1.6;
        }
        
        .logo {
            max-width: 120px;
            max-height: 80px;
            object-fit: contain;
        }
        
        /* Titre du document */
        .document-title {
            text-align: center;
            margin-bottom: 25px;
        }
        
        .document-title h1 {
            font-size: 18pt;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 5px;
        }
        
        .document-title .subtitle {
            font-size: 11pt;
            color: #6b7280;
        }
        
        .date-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 10pt;
            font-weight: 600;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            margin-top: 10px;
        }
        
        /* Informations chantier */
        .chantier-info {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #2563eb;
            border: 1px solid #e2e8f0;
        }
        
        .chantier-info h2 {
            font-size: 13pt;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 12px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .info-item {
            display: flex;
            flex-direction: column;
        }
        
        .info-label {
            font-size: 8pt;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 3px;
        }
        
        .info-value {
            font-size: 10pt;
            color: #1f2937;
            font-weight: 500;
        }
        
        /* Catégories */
        .categorie-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .categorie-header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 12px 15px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
        }
        
        .categorie-title {
            font-size: 13pt;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }
        
        .categorie-unite {
            font-size: 10pt;
            opacity: 0.9;
            margin-left: 8px;
        }
        
        .categorie-content {
            background: white;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 8px 8px;
            padding: 15px;
        }
        
        /* Tableaux */
        .table-container {
            margin-bottom: 15px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
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
            padding: 10px 8px;
            text-align: left;
            font-size: 9pt;
            font-weight: 700;
            color: #374151;
            border-bottom: 2px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        th.text-center { text-align: center; }
        th.text-right { text-align: right; }
        
        td {
            padding: 8px;
            font-size: 9pt;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
            background: white;
        }
        
        tr:nth-child(even) {
            background: white;
        }
        
        tfoot {
            background: white;
        }
        
        tfoot td {
            font-weight: 700;
            color: #1e40af;
            border-top: 2px solid #e2e8f0;
            border-bottom: none;
        }
        
        .quantite {
            font-weight: 600;
            color: #1e40af;
            text-align: right;
        }
        
        /* Commentaire */
        .commentaire-section {
            background-color: #fefce8;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        
        .commentaire-section h3 {
            font-size: 10pt;
            font-weight: 600;
            color: #92400e;
            margin-bottom: 6px;
        }
        
        .commentaire-section p {
            font-size: 9pt;
            color: #78350f;
            white-space: pre-wrap;
        }
        
        /* Informations de création */
        .creation-info {
            margin-top: 25px;
            padding-top: 15px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
        }
        
        /* Pied de page */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
        }
        
        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="company-info">
                <div class="company-name">${companySettings.nom}</div>
                <div class="company-details">
                    ${companySettings.adresse ? `${companySettings.adresse}<br>` : ''}
                    ${companySettings.codePostal && companySettings.ville ? `${companySettings.codePostal} ${companySettings.ville}<br>` : ''}
                    ${companySettings.telephone ? `Tél: ${companySettings.telephone}<br>` : ''}
                    ${companySettings.email ? `Email: ${companySettings.email}` : ''}
                </div>
            </div>
            ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : ''}
        </div>

        <!-- Titre du document -->
        <div class="document-title">
            <h1>MÉTRÉ DE CHANTIER</h1>
            <div class="subtitle">Document de quantification des travaux</div>
            <div class="date-badge">${dateFormatee}</div>
        </div>

        <!-- Informations chantier -->
        <div class="chantier-info">
            <h2>Informations du chantier</h2>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Chantier</span>
                    <span class="info-value">${chantier.nomChantier}</span>
                </div>
                ${chantier.clientNom ? `
                <div class="info-item">
                    <span class="info-label">Client</span>
                    <span class="info-value">${chantier.clientNom}</span>
                </div>
                ` : ''}
                ${chantier.adresseChantier ? `
                <div class="info-item">
                    <span class="info-label">Adresse</span>
                    <span class="info-value">${chantier.adresseChantier}</span>
                </div>
                ` : ''}
                <div class="info-item">
                    <span class="info-label">Référence</span>
                    <span class="info-value">${chantier.chantierId}</span>
                </div>
            </div>
        </div>

        <!-- Catégories et lignes -->
        ${metre.categories.map((categorie) => {
          const totalCategorie = calculateTotalCategorie(categorie)
          return `
        <div class="categorie-section">
            <div class="categorie-header">
                <h3 class="categorie-title">
                    ${categorie.nom}
                    <span class="categorie-unite">(${categorie.unite})</span>
                </h3>
            </div>
            <div class="categorie-content">
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th class="text-center">Longueur (m)</th>
                                <th class="text-center">Largeur (m)</th>
                                <th class="text-center">Hauteur (m)</th>
                                <th class="text-right">Quantité</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${categorie.lignes.map((ligne) => `
                            <tr>
                                <td>${ligne.description}</td>
                                <td class="text-center">${ligne.longueur !== null ? ligne.longueur.toFixed(2) : '-'}</td>
                                <td class="text-center">${ligne.largeur !== null ? ligne.largeur.toFixed(2) : '-'}</td>
                                <td class="text-center">${ligne.hauteur !== null ? ligne.hauteur.toFixed(2) : '-'}</td>
                                <td class="quantite">${ligne.quantite.toFixed(2)} ${ligne.unite}</td>
                                <td>${ligne.notes || '-'}</td>
                            </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" class="text-right">Total catégorie :</td>
                                <td class="quantite">${totalCategorie.toFixed(2)} ${categorie.unite}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
          `
        }).join('')}

        <!-- Commentaire global -->
        ${metre.commentaire ? `
        <div class="commentaire-section">
            <h3>Commentaire</h3>
            <p>${metre.commentaire}</p>
        </div>
        ` : ''}

        <!-- Informations de création -->
        <div class="creation-info">
            Créé le ${new Date(metre.createdAt).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })} par ${metre.createdByUser.name || metre.createdByUser.email}
        </div>

        <!-- Pied de page -->
        <div class="footer">
            <p>Document généré le ${new Date().toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            })}</p>
            <p>${companySettings.nom}${companySettings.siret ? ` - SIRET: ${companySettings.siret}` : ''}</p>
        </div>
    </div>
</body>
</html>
  `
}


export interface DepensesData {
  chantier: {
    id: number
    chantierId: string
    nomChantier: string
    clientNom: string
    adresseChantier: string
  }
  depenses: Array<{
    id: number
    date: string
    description: string
    categorie: string
    fournisseur: string
    reference: string
    montant: number
  }>
  logoBase64?: string
}

export function generateDepensesHTML(data: DepensesData): string {
  const { chantier, depenses, logoBase64 } = data
  
  // Calculer le total
  const total = depenses.reduce((sum, depense) => sum + depense.montant, 0)

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport des Dépenses - ${chantier.nomChantier}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 15mm;
            background: white;
            position: relative;
        }
        
        .header {
            background: linear-gradient(135deg, #0066cc 0%, #3498db 100%);
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        
        .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .logo {
            position: absolute;
            top: 15px;
            right: 15px;
            max-height: 40px;
            max-width: 80px;
        }
        
        .info-section {
            background: #f8f9fa;
            border: 2px solid #0066cc;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
        }
        
        .info-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        
        .info-row {
            font-size: 10px;
        }
        
        .info-label {
            font-weight: bold;
            color: #7f8c8d;
        }
        
        .table-container {
            margin: 20px 0;
        }
        
        .table-title {
            font-size: 14px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th {
            background: #0066cc;
            color: white;
            padding: 8px 6px;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
        }
        
        td {
            padding: 6px;
            border: 1px solid #ddd;
            font-size: 8px;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #e3f2fd;
        }
        
        .total-section {
            background: #e8f5e8;
            border: 2px solid #27ae60;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
            text-align: right;
        }
        
        .total-amount {
            font-size: 16px;
            font-weight: bold;
            color: #27ae60;
        }
        
        .footer {
            position: absolute;
            bottom: 15px;
            left: 15px;
            right: 15px;
            text-align: center;
            font-size: 8px;
            color: #7f8c8d;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #7f8c8d;
            font-style: italic;
        }
        
        @media print {
            .page {
                margin: 0;
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : ''}
            <h1>RAPPORT DES DÉPENSES</h1>
        </div>
        
        <div class="info-section">
            <h3>INFORMATIONS DU CHANTIER</h3>
            <div class="info-grid">
                <div>
                    <div class="info-row">
                        <span class="info-label">Chantier:</span> ${chantier.nomChantier}
                    </div>
                    <div class="info-row">
                        <span class="info-label">Client:</span> ${chantier.clientNom || 'Non spécifié'}
                    </div>
                </div>
                <div>
                    <div class="info-row">
                        <span class="info-label">Adresse:</span> ${chantier.adresseChantier || 'Non spécifiée'}
                    </div>
                    <div class="info-row">
                        <span class="info-label">Référence:</span> ${chantier.chantierId}
                    </div>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-title">DÉTAIL DES DÉPENSES</div>
            ${depenses.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Catégorie</th>
                        <th>Fournisseur</th>
                        <th>Référence</th>
                        <th>Montant (€)</th>
                    </tr>
                </thead>
                <tbody>
                    ${depenses.map(depense => `
                        <tr>
                            <td style="text-align: center;">${new Date(depense.date).toLocaleDateString('fr-FR')}</td>
                            <td>${depense.description || ''}</td>
                            <td style="text-align: center;">${depense.categorie || ''}</td>
                            <td>${depense.fournisseur || ''}</td>
                            <td style="text-align: center;">${depense.reference || ''}</td>
                            <td style="text-align: right;">${depense.montant.toFixed(2)} €</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : `
            <div class="no-data">
                Aucune dépense enregistrée pour ce chantier
            </div>
            `}
        </div>
        
        ${depenses.length > 0 ? `
        <div class="total-section">
            <div class="total-amount">
                TOTAL: ${total.toFixed(2)} €
            </div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Rapport généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p>© ${new Date().getFullYear()} - Document généré automatiquement</p>
        </div>
    </div>
</body>
</html>
  `
}


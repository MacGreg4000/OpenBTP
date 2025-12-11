export interface ReceptionData {
  reception: {
    id: number
    dateReception: string
    statut: string
    notes?: string
  }
  chantier: {
    id: number
    chantierId: string
    nomChantier: string
    clientNom: string
    adresseChantier: string
  }
  remarques: Array<{
    id: number
    description: string
    localisation: string
    statut: string
    dateResolution?: string
    assigneA?: string
  }>
  companySettings: {
    name: string
    address: string
    zipCode: string
    city: string
    phone: string
    email: string
    logo?: string
  }
  userName: string
  logoBase64?: string
}

export function generateReceptionHTML(data: ReceptionData): string {
  const { reception, chantier, remarques, companySettings, userName, logoBase64 } = data
  
  // Calculer les statistiques
  const totalRemarques = remarques.length
  const remarquesResolues = remarques.filter(r => r.statut === 'Résolu').length
  const remarquesEnCours = remarques.filter(r => r.statut === 'En cours').length
  const remarquesEnAttente = remarques.filter(r => r.statut === 'En attente').length

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Réception - ${chantier.nomChantier}</title>
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
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 20px;
            text-align: center;
            margin-bottom: 20px;
            border-radius: 8px;
        }
        
        .header h1 {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .logo {
            position: absolute;
            top: 15px;
            right: 15px;
            max-height: 50px;
            max-width: 100px;
        }
        
        .info-sections {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-section {
            background: #f8f9fa;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 15px;
        }
        
        .info-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        
        .info-row {
            margin-bottom: 5px;
            font-size: 10px;
        }
        
        .info-label {
            font-weight: bold;
            color: #7f8c8d;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-card {
            background: #e3f2fd;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
        }
        
        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 10px;
            color: #7f8c8d;
        }
        
        .table-container {
            margin: 20px 0;
        }
        
        .table-title {
            font-size: 14px;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 10px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        
        th {
            background: #3b82f6;
            color: white;
            padding: 10px 8px;
            text-align: center;
            font-weight: bold;
            font-size: 9px;
        }
        
        td {
            padding: 8px;
            border: 1px solid #ddd;
            font-size: 8px;
        }
        
        tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        tr:hover {
            background: #e3f2fd;
        }
        
        .status-resolu {
            color: #27ae60;
            font-weight: bold;
        }
        
        .status-en-cours {
            color: #f39c12;
            font-weight: bold;
        }
        
        .status-en-attente {
            color: #e74c3c;
            font-weight: bold;
        }
        
        .notes-section {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 8px;
            padding: 15px;
            margin-top: 20px;
        }
        
        .notes-title {
            font-size: 12px;
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
        }
        
        .notes-content {
            font-size: 10px;
            color: #856404;
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
            <h1>RÉCEPTION DE CHANTIER</h1>
            <div class="subtitle">Document de réception et contrôle qualité</div>
        </div>
        
        <div class="info-sections">
            <div class="info-section">
                <h3>INFORMATIONS CHANTIER</h3>
                <div class="info-row">
                    <span class="info-label">Chantier:</span> ${chantier.nomChantier}
                </div>
                <div class="info-row">
                    <span class="info-label">Client:</span> ${chantier.clientNom || 'Non spécifié'}
                </div>
                <div class="info-row">
                    <span class="info-label">Adresse:</span> ${chantier.adresseChantier || 'Non spécifiée'}
                </div>
                <div class="info-row">
                    <span class="info-label">Référence:</span> ${chantier.chantierId}
                </div>
            </div>
            
            <div class="info-section">
                <h3>INFORMATIONS RÉCEPTION</h3>
                <div class="info-row">
                    <span class="info-label">Date:</span> ${new Date(reception.dateReception).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </div>
                <div class="info-row">
                    <span class="info-label">Statut:</span> ${reception.statut}
                </div>
                <div class="info-row">
                    <span class="info-label">Contrôleur:</span> ${userName}
                </div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${totalRemarques}</div>
                <div class="stat-label">Total Remarques</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${remarquesResolues}</div>
                <div class="stat-label">Résolues</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${remarquesEnCours}</div>
                <div class="stat-label">En Cours</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${remarquesEnAttente}</div>
                <div class="stat-label">En Attente</div>
            </div>
        </div>
        
        <div class="table-container">
            <div class="table-title">DÉTAIL DES REMARQUES</div>
            ${remarques.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Description</th>
                        <th>Localisation</th>
                        <th>Assigné à</th>
                        <th>Statut</th>
                        <th>Date de résolution</th>
                    </tr>
                </thead>
                <tbody>
                    ${remarques.map((remarque, index) => `
                        <tr>
                            <td style="text-align: center;">${index + 1}</td>
                            <td>${remarque.description}</td>
                            <td>${remarque.localisation}</td>
                            <td>${remarque.assigneA || '-'}</td>
                            <td style="text-align: center;" class="status-${remarque.statut.toLowerCase().replace(' ', '-')}">
                                ${remarque.statut}
                            </td>
                            <td style="text-align: center;">
                                ${remarque.dateResolution ? new Date(remarque.dateResolution).toLocaleDateString('fr-FR') : '-'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : `
            <div class="no-data">
                Aucune remarque enregistrée pour cette réception
            </div>
            `}
        </div>
        
        ${reception.notes ? `
        <div class="notes-section">
            <div class="notes-title">NOTES GÉNÉRALES</div>
            <div class="notes-content">${reception.notes}</div>
        </div>
        ` : ''}
        
        <div class="footer">
            <p>Réception générée le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p>© ${companySettings.name} - Document généré automatiquement</p>
        </div>
    </div>
</body>
</html>
  `
}


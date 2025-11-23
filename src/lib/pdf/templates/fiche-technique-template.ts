export interface FicheTechniqueCoverData {
  settings: {
    name: string
    address: string
    zipCode: string
    city: string
    phone: string
    email: string
    logo?: string
  }
  chantier: {
    chantierId: string
    nomChantier: string
    client?: {
      nom: string
    }
    maitreOuvrageNom?: string | null
    maitreOuvrageAdresse?: string | null
    maitreOuvrageLocalite?: string | null
    bureauArchitectureNom?: string | null
    bureauArchitectureAdresse?: string | null
    bureauArchitectureLocalite?: string | null
  }
  fiche: {
    id: string
    name: string
    reference: string | null
    statut: string
    version: number
  }
  soustraitant?: {
    nom: string
    logo?: string | null
  } | null
  remarques?: string | null
  logoBase64?: string
  soustraitantLogoBase64?: string
}

export function generateFicheTechniqueCoverHTML(data: FicheTechniqueCoverData): string {
  const { settings, chantier, fiche, soustraitant, remarques, logoBase64, soustraitantLogoBase64 } = data
  
  // Debug: log les données du sous-traitant
  console.log('[Template] Données sous-traitant:', {
    soustraitant,
    soustraitantLogoBase64: soustraitantLogoBase64 ? 'présent' : 'absent',
    ficheId: fiche.id
  })
  
  const ficheNumero = fiche.id.split('/').pop()?.replace('.pdf', '') || '1'
  const ficheNumeroDisplay = ficheNumero.match(/\d+/)?.[0] || '1'
  
  // Badge de statut
  let badgeHTML = ''
  let badgeClass = ''
  if (fiche.statut === 'VALIDEE') {
    badgeHTML = 'VALIDEE'
    badgeClass = 'status-validee'
  } else if (fiche.statut === 'NOUVELLE_PROPOSITION') {
    badgeHTML = `V${fiche.version}`
    badgeClass = 'status-nouvelle'
  } else if (fiche.statut === 'A_REMPLACER') {
    badgeHTML = 'A REMPLACER'
    badgeClass = 'status-remplacer'
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fiche Technique - ${fiche.name}</title>
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
            width: 100%;
            min-height: 100vh;
        }
        
        .container {
            max-width: 100%;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        /* En-tête */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 140px;
            max-height: 70px;
            object-fit: contain;
        }
        
        .company-info {
            margin-top: 10px;
            font-size: 9px;
            color: #64748b;
            line-height: 1.4;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 30px;
        }
        
        .document-title h1 {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .document-subtitle {
            font-size: 14px;
            color: #64748b;
            margin-bottom: 8px;
        }
        
        .project-info {
            flex: 1;
            text-align: right;
            font-size: 10px;
            position: relative;
        }
        
        .project-info .label {
            font-weight: bold;
            color: #374151;
        }
        
        .project-info .value {
            color: #64748b;
            margin-bottom: 3px;
        }
        
        .status-badge {
            position: absolute;
            top: 0;
            right: 0;
            display: inline-block;
            padding: 5px 12px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .status-validee {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
        }
        
        .status-nouvelle {
            background: #fef3c7;
            color: #92400e;
            border: 1px solid #fde68a;
        }
        
        .status-remplacer {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        
        /* Informations du projet */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
            padding: 20px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .info-section h3 {
            font-size: 13px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .info-section p {
            margin-bottom: 6px;
            font-size: 10px;
        }
        
        .info-section .label {
            font-weight: 600;
            color: #374151;
            display: inline-block;
            min-width: 100px;
        }
        
        /* Section Maître d'ouvrage et Bureau d'architecture */
        .stakeholders-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 25px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .stakeholder-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .stakeholder-section p {
            margin-bottom: 5px;
            font-size: 9px;
            color: #64748b;
        }
        
        /* Section Remarques */
        .remarques-section {
            margin-bottom: 15px;
            padding: 12px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        
        .remarques-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .remarques-box {
            min-height: 50px;
            max-height: 50px;
            padding: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            background: white;
            font-size: 9px;
            line-height: 1.4;
            white-space: pre-wrap;
            overflow: hidden;
        }
        
        .remarques-lines {
            border-top: 1px solid #e2e8f0;
            margin-top: 2px;
            padding-top: 2px;
        }
        
        .remarques-lines .line {
            height: 8px;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 1px;
        }
        
        /* Section Approbations */
        .approbations-section {
            margin-bottom: 15px;
        }
        
        .approbations-section h3 {
            font-size: 12px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        
        .approbations-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
        }
        
        .approbation-box {
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 8px;
            background: white;
            min-height: 70px;
        }
        
        .approbation-label {
            font-size: 7px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 6px;
            text-align: center;
        }
        
        .approbation-signature {
            height: 35px;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 4px;
        }
        
        .approbation-date {
            font-size: 6px;
            color: #64748b;
            margin-top: 3px;
        }
        
        .approbation-date-line {
            border-top: 1px solid #e2e8f0;
            margin-top: 2px;
            padding-top: 2px;
        }
        
        /* Section Sous-traitant */
        .soustraitant-section {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 10px;
            padding: 10px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .soustraitant-logo {
            max-width: 80px;
            max-height: 50px;
            object-fit: contain;
            flex-shrink: 0;
        }
        
        .soustraitant-info {
            flex: 1;
        }
        
        .soustraitant-label {
            font-size: 8px;
            font-weight: bold;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
        }
        
        .soustraitant-name {
            font-size: 11px;
            font-weight: 600;
            color: #1e40af;
        }
        
        /* Responsive pour impression */
        @media print {
            body { font-size: 9px; }
            .container { padding: 10px; }
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
                        ${settings.name.substring(0, 3).toUpperCase()}
                    </div>
                `}
                <div class="company-info">
                    <div><strong>${settings.name}</strong></div>
                    <div>${settings.address}</div>
                    <div>${settings.zipCode} ${settings.city}</div>
                    <div>Tél: ${settings.phone} | Email: ${settings.email}</div>
                </div>
            </div>
            
            <div class="document-title">
                <h1>FICHE TECHNIQUE</h1>
                <div class="document-subtitle">N°${ficheNumeroDisplay}</div>
            </div>
            
            <div class="project-info">
                ${badgeHTML ? `<span class="status-badge ${badgeClass}">${badgeHTML}</span>` : ''}
                <div style="margin-top: ${badgeHTML ? '25px' : '0'};">
                    <div class="label">Date</div>
                    <div class="value">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                    <div class="label">Chantier</div>
                    <div class="value">${chantier.chantierId}</div>
                </div>
            </div>
        </div>
        
        ${(soustraitant && soustraitant.nom) ? `
        <!-- Section Sous-traitant -->
        <div class="soustraitant-section" style="margin-bottom: 25px;">
            ${soustraitantLogoBase64 ? `<img src="data:image/png;base64,${soustraitantLogoBase64}" alt="Logo sous-traitant" class="soustraitant-logo">` : ''}
            <div class="soustraitant-info">
                <div class="soustraitant-label">Sous-traitant</div>
                <div class="soustraitant-name">${soustraitant.nom}</div>
            </div>
        </div>
        ` : ''}
        
        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-section">
                <h3>Informations du chantier</h3>
                <p><span class="label">Nom:</span> ${chantier.nomChantier}</p>
                ${chantier.client?.nom ? `<p><span class="label">Client:</span> ${chantier.client.nom}</p>` : ''}
            </div>
            
            <div class="info-section">
                <h3>Détails de la fiche</h3>
                ${fiche.reference ? `<p><span class="label">CSC:</span> ${fiche.reference}</p>` : ''}
                ${soustraitant ? `<p><span class="label">Sous-traitant:</span> ${soustraitant.nom}</p>` : ''}
                <p><span class="label">Matériel:</span> ${fiche.name}</p>
            </div>
        </div>
        
        ${(chantier.maitreOuvrageNom || chantier.bureauArchitectureNom) ? `
        <!-- Maître d'ouvrage et Bureau d'architecture -->
        <div class="stakeholders-grid">
            ${chantier.maitreOuvrageNom ? `
            <div class="stakeholder-section">
                <h3>Maître d'ouvrage</h3>
                <p>${chantier.maitreOuvrageNom}</p>
                ${chantier.maitreOuvrageAdresse ? `<p>${chantier.maitreOuvrageAdresse}</p>` : ''}
                ${chantier.maitreOuvrageLocalite ? `<p>${chantier.maitreOuvrageLocalite}</p>` : ''}
            </div>
            ` : '<div></div>'}
            
            ${chantier.bureauArchitectureNom ? `
            <div class="stakeholder-section">
                <h3>Bureau d'architecture</h3>
                <p>${chantier.bureauArchitectureNom}</p>
                ${chantier.bureauArchitectureAdresse ? `<p>${chantier.bureauArchitectureAdresse}</p>` : ''}
                ${chantier.bureauArchitectureLocalite ? `<p>${chantier.bureauArchitectureLocalite}</p>` : ''}
            </div>
            ` : '<div></div>'}
        </div>
        ` : ''}
        
        ${remarques ? `
        <!-- Section Remarques -->
        <div class="remarques-section">
            <h3>Remarques</h3>
            <div class="remarques-box">${remarques}</div>
        </div>
        ` : `
        <!-- Section Remarques -->
        <div class="remarques-section">
            <h3>Remarques</h3>
            <div class="remarques-box">
                <div class="remarques-lines">
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                    <div class="line"></div>
                </div>
            </div>
        </div>
        `}
        
        <!-- Section Approbations -->
        <div class="approbations-section">
            <h3>Approuvé par</h3>
            <div class="approbations-grid">
                <div class="approbation-box">
                    <div class="approbation-label">L'Architecte</div>
                    <div class="approbation-signature"></div>
                    <div class="approbation-date">
                        <div>Date:</div>
                        <div class="approbation-date-line"></div>
                    </div>
                </div>
                <div class="approbation-box">
                    <div class="approbation-label">Le M.O.</div>
                    <div class="approbation-signature"></div>
                    <div class="approbation-date">
                        <div>Date:</div>
                        <div class="approbation-date-line"></div>
                    </div>
                </div>
                <div class="approbation-box">
                    <div class="approbation-label">Représentant du M.O.</div>
                    <div class="approbation-signature"></div>
                    <div class="approbation-date">
                        <div>Date:</div>
                        <div class="approbation-date-line"></div>
                    </div>
                </div>
                <div class="approbation-box">
                    <div class="approbation-label">L'Entrepreneur</div>
                    <div class="approbation-signature"></div>
                    <div class="approbation-date">
                        <div>Date:</div>
                        <div class="approbation-date-line"></div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Pied de page -->
        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center;">
            <p>© ${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}</p>
        </div>
    </div>
</body>
</html>
  `
}


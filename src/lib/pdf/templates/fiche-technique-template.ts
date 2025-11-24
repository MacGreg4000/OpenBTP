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
  const formattedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hasSoustraitant = Boolean(soustraitant?.nom)

  const badgeClass =
    fiche.statut === 'VALIDEE'
      ? 'status-validee'
      : fiche.statut === 'NOUVELLE_PROPOSITION'
        ? 'status-nouvelle'
        : ''
  const badgeHTML =
    fiche.statut === 'VALIDEE'
      ? 'VALIDÉE'
      : fiche.statut === 'NOUVELLE_PROPOSITION'
        ? `NOUVELLE PROPOSITION — V${fiche.version}`
        : ''

  const cscRow = fiche.reference
    ? `
        <tr>
            <td class="info-label">Article CSC</td>
            <td class="info-value">${fiche.reference}</td>
        </tr>
      `
    : ''

  const soustraitantBlock = hasSoustraitant
    ? `
        <div class="section">
            <div class="section-title">Sous-traitant assigné</div>
            <div class="soustraitant-wrapper">
                <div class="soustraitant-details">
                    <p class="soustraitant-name">${soustraitant!.nom}</p>
                    <p class="soustraitant-meta">Entité chargée de l\'exécution</p>
                </div>
                ${soustraitantLogoBase64
                  ? `<img src="data:image/png;base64,${soustraitantLogoBase64}" alt="Logo sous-traitant" class="soustraitant-logo" />`
                  : `<div class="soustraitant-logo placeholder">${soustraitant!.nom.substring(0, 2).toUpperCase()}</div>`}
            </div>
        </div>
      `
    : ''
  
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
            outline: none !important;
            border: none;
        }
        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            border: none;
            outline: none;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #fff;
            color: #1f2937;
            font-size: 11px;
            line-height: 1.5;
            border: none;
            outline: none;
        }
        table {
            border-collapse: collapse;
            border-spacing: 0;
        }
        table, tr, td, th {
            border: none;
            outline: none;
        }
        .container {
            max-width: 780px;
            margin: 0 auto;
            padding: 22px;
            background: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            border: none;
            outline: none;
        }
        .header-grid {
            display: grid;
            grid-template-columns: 1fr 1.1fr 0.9fr;
            gap: 16px;
            margin-bottom: 20px;
            border: none;
            outline: none;
        }
        .header-grid > * {
            border: none;
            outline: none;
        }
        .header-card {
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px;
            height: 100%;
        }
        .company-logo {
            width: 150px;
            height: 70px;
            object-fit: contain;
            display: block;
        }
        .company-info {
            margin-top: 8px;
            font-size: 9px;
            color: #4b5563;
            line-height: 1.4;
        }
        .title-card {
            text-align: center;
            background: #f1f5f9;
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 16px;
            position: relative;
            outline: none;
            box-shadow: none;
        }
        .title-card h1 {
            font-size: 24px;
            letter-spacing: 0.2em;
            margin-bottom: 6px;
            color: #111827;
        }
        .title-card p {
            font-size: 13px;
            color: #4b5563;
            letter-spacing: 0.08em;
        }
        .meta-card {
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 12px;
            font-size: 10px;
            position: relative;
        }
        .meta-card .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .meta-label { font-weight: 600; color: #111827; }
        .meta-value { color: #4b5563; }
        .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border: 1px solid #d1d5db;
            margin-bottom: 12px;
        }
        .status-validee { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
        .status-nouvelle { background: #fffbeb; color: #92400e; border-color: #fcd34d; }
        .section {
            border: 1px solid #d1d5db;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
            outline: none;
            box-shadow: none;
            background: #fff;
        }
        .section-title {
            font-size: 12px;
            letter-spacing: 0.2em;
            color: #111827;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border: none;
            outline: none;
        }
        .info-table tr {
            border: none;
            outline: none;
        }
        .info-table tr:last-child td { border-bottom: none; }
        .info-table td {
            border: none;
            outline: none;
        }
        .info-label {
            width: 32%;
            font-weight: 600;
            color: #111827;
            padding: 8px 0;
        }
        .info-value {
            color: #4b5563;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .details-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            border: none;
            outline: none;
        }
        .details-grid > * {
            border: none;
            outline: none;
        }
        .card-muted {
            background: #f8fafc;
            border: 1px dashed #cbd5f5;
            border-radius: 10px;
            padding: 12px;
        }
        .card-muted h4 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            margin-bottom: 8px;
            color: #1d4ed8;
        }
        .card-muted p {
            font-size: 10px;
            color: #475569;
            margin-bottom: 2px;
        }
        .soustraitant-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .soustraitant-details {
            flex: 1;
        }
        .soustraitant-logo {
            width: 80px;
            height: 60px;
            object-fit: contain;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            background: #fff;
            flex-shrink: 0;
        }
        .soustraitant-logo.placeholder {
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            color: #1d4ed8;
            background: #eff6ff;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            flex-shrink: 0;
            width: 80px;
            height: 60px;
        }
        .soustraitant-name { font-size: 13px; font-weight: 600; color: #1d4ed8; }
        .soustraitant-meta { font-size: 9px; color: #475569; text-transform: uppercase; letter-spacing: 0.15em; }
        .remarques-box {
            min-height: 75px;
            padding: 10px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #fff;
            font-size: 9px;
            color: #1f2937;
            white-space: pre-wrap;
        }
        .approbations-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
            border: none;
            outline: none;
        }
        .approbations-grid > * {
            border: none;
            outline: none;
        }
        .approbation-box {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 12px;
            min-height: 120px;
            background: #fff;
        }
        .approbation-label {
            font-size: 9px;
            color: #111827;
            text-align: center;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .signature-line {
            height: 60px;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        .date-line {
            border-top: 1px solid #e5e7eb;
            height: 14px;
            margin-top: 6px;
        }
        footer {
            margin-top: auto;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
        }
        @media print {
            body { background: #fff; }
            .container { border: none; box-shadow: none; padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header-grid">
            <div class="header-card">
                ${logoBase64
                  ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo entreprise" class="company-logo" />`
                  : `<div class="company-logo" style="background:#e0e7ff; border:1px solid #c7d2fe; border-radius:10px; display:flex; align-items:center; justify-content:center; font-weight:700; color:#312e81;">
                        ${settings.name.substring(0, 3).toUpperCase()}
                     </div>`}
                <div class="company-info">
                    <strong>${settings.name}</strong><br/>
                    ${settings.address}<br/>
                    ${settings.zipCode} ${settings.city}<br/>
                    Tél : ${settings.phone}<br/>
                    ${settings.email}
                </div>
            </div>

            <div class="title-card">
                ${badgeHTML ? `<span class="status-badge ${badgeClass}">${badgeHTML}</span>` : ''}
                <h1>FICHE TECHNIQUE</h1>
                <p>DOCUMENT N°${ficheNumeroDisplay}</p>
            </div>

            <div class="meta-card">
                <div class="row">
                    <span class="meta-label">Date</span>
                    <span class="meta-value">${formattedDate}</span>
                </div>
                <div class="row">
                    <span class="meta-label">Chantier</span>
                    <span class="meta-value">${chantier.chantierId}</span>
                </div>
                <div class="row">
                    <span class="meta-label">Version</span>
                    <span class="meta-value">${fiche.version}</span>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Informations essentielles</div>
            <div class="details-grid">
                <div>
                    <table class="info-table">
                        <tr>
                            <td class="info-label">Nom du chantier</td>
                            <td class="info-value">${chantier.nomChantier}</td>
                        </tr>
                        ${chantier.client?.nom
                          ? `<tr><td class="info-label">Client</td><td class="info-value">${chantier.client.nom}</td></tr>`
                          : ''}
                        ${cscRow}
                        <tr>
                            <td class="info-label">Objet / Matériel</td>
                            <td class="info-value">${fiche.name}</td>
                        </tr>
                    </table>
                </div>
                <div class="card-muted">
                    <h4>Références</h4>
                    ${chantier.maitreOuvrageNom
                      ? `<p><strong>Maître d'ouvrage :</strong> ${chantier.maitreOuvrageNom}</p>`
                      : ''}
                    ${chantier.maitreOuvrageAdresse ? `<p>${chantier.maitreOuvrageAdresse}</p>` : ''}
                    ${chantier.maitreOuvrageLocalite ? `<p>${chantier.maitreOuvrageLocalite}</p>` : ''}
                    ${chantier.bureauArchitectureNom
                      ? `<p style="margin-top:8px;"><strong>Bureau d'architecture :</strong> ${chantier.bureauArchitectureNom}</p>`
                      : ''}
                    ${chantier.bureauArchitectureAdresse ? `<p>${chantier.bureauArchitectureAdresse}</p>` : ''}
                    ${chantier.bureauArchitectureLocalite ? `<p>${chantier.bureauArchitectureLocalite}</p>` : ''}
                </div>
            </div>
        </div>

        ${soustraitantBlock}

        <div class="section">
            <div class="section-title">Remarques</div>
            <div class="remarques-box">
                ${remarques ? remarques : '..............................................................................................................................'}
            </div>
        </div>

        <div class="section">
            <div class="section-title">Approbations</div>
            <div class="approbations-grid">
                ${['L\'Architecte', 'Le M.O.', 'Représentant du M.O.', 'L\'Entrepreneur'].map(label => `
                    <div class="approbation-box">
                        <div class="approbation-label">${label}</div>
                        <div class="signature-line"></div>
                        <div class="date-line"></div>
                    </div>
                `).join('')}
            </div>
        </div>

        <footer>
            © ${settings.name} — ${settings.address}, ${settings.zipCode} ${settings.city}
        </footer>
    </div>
</body>
</html>
  `
}

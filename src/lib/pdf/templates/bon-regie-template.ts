import type { CompanySettings } from '@/lib/pdf/pdf-generator'

export interface BonRegieData {
  id: string
  dates?: string | null
  client?: string | null
  nomChantier?: string | null
  description?: string | null
  tempsChantier?: number | null
  nombreTechniciens?: number | null
  materiaux?: string | null
  nomSignataire?: string | null
  signature?: string | null
  dateSignature?: string | null
  chantierId?: string | null
}

export function generateBonRegieHTML(data: BonRegieData, companySettings: CompanySettings | null): string {
  const logoBase64 = companySettings?.logo || null

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bon de Travaux en Régie</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2563eb;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .logo {
            max-width: 150px;
            max-height: 80px;
            object-fit: contain;
        }
        
        .company-info {
            font-size: 12px;
            color: #666;
            line-height: 1.4;
        }
        
        .document-title {
            text-align: right;
            color: #2563eb;
        }
        
        .document-title h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .document-title .subtitle {
            font-size: 14px;
            color: #666;
        }
        
        .info-section {
            margin-bottom: 30px;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .info-item {
            display: flex;
            margin-bottom: 10px;
        }
        
        .info-label {
            font-weight: bold;
            min-width: 120px;
            color: #374151;
        }
        
        .info-value {
            color: #111827;
            flex: 1;
        }
        
        .work-section {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .work-title {
            font-size: 16px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .work-description {
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 15px;
            min-height: 100px;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .time-section {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
        }
        
        .time-item {
            text-align: center;
        }
        
        .time-label {
            font-size: 12px;
            font-weight: bold;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        
        .time-value {
            font-size: 18px;
            font-weight: bold;
            color: #1f2937;
        }
        
        .materials-section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: #374151;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .materials-content {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            padding: 15px;
            min-height: 60px;
            font-size: 14px;
        }
        
        .signature-section {
            margin-top: 40px;
            text-align: right;
        }
        
        .signature-container {
            display: inline-block;
            text-align: center;
            margin-left: auto;
        }
        
        .signature-label {
            font-size: 12px;
            font-weight: bold;
            color: #6b7280;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .signature-image {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            max-width: 200px;
            max-height: 100px;
            margin-bottom: 10px;
        }
        
        .signature-name {
            font-size: 14px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 5px;
        }
        
        .signature-date {
            font-size: 12px;
            color: #6b7280;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #9ca3af;
            text-align: center;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .container {
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 && logoBase64.trim() !== '' ? `<img src="${logoBase64}" alt="Logo" class="logo">` : `
                    <div style="width: 150px; height: 80px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
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
                <h1>BON DE TRAVAUX EN RÉGIE</h1>
                <div class="subtitle">Document de suivi des travaux</div>
            </div>
        </div>
        
        <!-- Informations générales -->
        <div class="info-section">
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${data.dates || 'Non spécifiée'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Client:</span>
                    <span class="info-value">${data.client || 'Non spécifié'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Chantier:</span>
                    <span class="info-value">${data.nomChantier || 'Non spécifié'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">ID Chantier:</span>
                    <span class="info-value">${data.chantierId || 'N/A'}</span>
                </div>
            </div>
        </div>
        
        <!-- Travail réalisé -->
        <div class="work-section">
            <div class="work-title">Travail Réalisé</div>
            <div class="work-description">
                ${data.description || 'Aucune description fournie'}
            </div>
        </div>
        
        <!-- Informations temporelles -->
        <div class="time-section">
            <div class="time-item">
                <div class="time-label">Temps sur chantier</div>
                <div class="time-value">${data.tempsChantier || 0}h</div>
            </div>
            <div class="time-item">
                <div class="time-label">Nombre d'ouvriers</div>
                <div class="time-value">${data.nombreTechniciens || 1}</div>
            </div>
            <div class="time-item">
                <div class="time-label">Total des heures</div>
                <div class="time-value">${(data.tempsChantier || 0) * (data.nombreTechniciens || 1)}h</div>
            </div>
        </div>
        
        <!-- Matériaux utilisés -->
        <div class="materials-section">
            <div class="section-title">Matériaux Utilisés</div>
            <div class="materials-content">
                ${data.materiaux || 'Aucun matériau spécifié'}
            </div>
        </div>
        
        <!-- Signature -->
        ${data.signature ? `
        <div class="signature-section">
            <div class="signature-container">
                <div class="signature-label">Signature du responsable</div>
                <img src="${data.signature}" alt="Signature" class="signature-image">
                <div class="signature-name">${data.nomSignataire || ''}</div>
                ${data.dateSignature ? `<div class="signature-date">Le ${new Date(data.dateSignature).toLocaleDateString('fr-FR')}</div>` : ''}
            </div>
        </div>
        ` : ''}
        
        <!-- Pied de page -->
        <div class="footer">
            <div>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</div>
            <div>${companySettings?.nomEntreprise || 'Nom Entreprise'} - Bon de régie N°${data.id}</div>
        </div>
    </div>
</body>
</html>
  `
}

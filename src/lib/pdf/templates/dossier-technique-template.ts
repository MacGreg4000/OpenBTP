export interface DossierTechniqueCoverData {
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
    adresseChantier?: string | null
    villeChantier?: string | null
    client?: {
      nom: string
    }
    dateDebut?: string | Date | null
    maitreOuvrageNom?: string | null
    maitreOuvrageAdresse?: string | null
    maitreOuvrageLocalite?: string | null
    bureauArchitectureNom?: string | null
    bureauArchitectureAdresse?: string | null
    bureauArchitectureLocalite?: string | null
  }
  dossier: {
    version: number
    dateGeneration: Date
    datePremiereGeneration?: Date | null
    nombreFiches: number
    fichesValidees: number
    fichesNouvelles: number
  }
  logoBase64?: string
}

export function generateDossierTechniqueCoverHTML(data: DossierTechniqueCoverData): string {
  const { settings, chantier, dossier, logoBase64 } = data
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dossier Technique</title>
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
        
        .version-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
            color: white;
            margin-left: 10px;
        }
        
        .project-info {
            flex: 1;
            text-align: right;
            font-size: 10px;
        }
        
        .project-info .label {
            font-weight: bold;
            color: #374151;
        }
        
        .project-info .value {
            color: #64748b;
            margin-bottom: 4px;
        }
        
        /* Informations du projet */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            flex: 1;
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
            min-width: 140px;
        }
        
        /* Section Maître d'ouvrage et Bureau d'architecture */
        .stakeholders-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-bottom: 30px;
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
                <h1>DOSSIER TECHNIQUE${dossier.version > 1 ? `<span class="version-badge">V${dossier.version}</span>` : ''}</h1>
                <div class="document-subtitle">Document technique professionnel</div>
            </div>
            
            <div class="project-info">
                <div class="label">Date de génération</div>
                <div class="value">${new Date(dossier.dateGeneration).toLocaleDateString('fr-FR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                })}</div>
                <div class="label">Chantier</div>
                <div class="value">${chantier.chantierId}</div>
            </div>
        </div>
        
        <!-- Informations du projet -->
        <div class="info-grid">
            <div class="info-section">
                <h3>Informations du chantier</h3>
                <p><span class="label">Nom du chantier:</span> ${chantier.nomChantier}</p>
                <p><span class="label">Client:</span> ${chantier.client?.nom || 'Non spécifié'}</p>
                ${chantier.adresseChantier ? `<p><span class="label">Adresse:</span> ${chantier.adresseChantier}</p>` : ''}
                ${chantier.villeChantier ? `<p><span class="label">Ville:</span> ${chantier.villeChantier}</p>` : ''}
                ${chantier.dateDebut ? `<p><span class="label">Date de début:</span> ${new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}</p>` : ''}
            </div>
            
            <div class="info-section">
                <h3>Détails du dossier</h3>
                <p><span class="label">Nombre de fiches:</span> ${dossier.nombreFiches}</p>
                ${dossier.version > 1 ? `<p><span class="label">Version du dossier:</span> V${dossier.version}</p>` : ''}
                ${dossier.datePremiereGeneration ? `<p><span class="label">Date de première génération:</span> ${new Date(dossier.datePremiereGeneration).toLocaleDateString('fr-FR')}</p>` : ''}
                <p><span class="label">Date de génération:</span> ${new Date(dossier.dateGeneration).toLocaleDateString('fr-FR')}</p>
                ${dossier.fichesValidees > 0 ? `<p><span class="label">Fiches validées:</span> ${dossier.fichesValidees}</p>` : ''}
                ${dossier.fichesNouvelles > 0 ? `<p><span class="label">Nouvelles propositions:</span> ${dossier.fichesNouvelles}</p>` : ''}
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
        
        <!-- Pied de page -->
        <div style="margin-top: auto; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #64748b; text-align: center;">
            <p>© ${settings.name} - ${settings.address}, ${settings.zipCode} ${settings.city}</p>
        </div>
    </div>
</body>
</html>
  `
}


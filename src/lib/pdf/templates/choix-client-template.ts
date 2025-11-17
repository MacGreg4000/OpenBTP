import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DetailChoix {
  numeroChoix: number
  couleurPlan: string
  localisations: string[]
  type: string
  marque: string
  collection?: string
  modele: string
  reference?: string
  couleur?: string
  formatLongueur?: number
  formatLargeur?: number
  epaisseur?: number
  finition?: string
  surfaceEstimee?: number
  couleurJoint?: string
  largeurJoint?: number
  typeJoint?: string
  typePose?: string
  sensPose?: string
  particularitesPose?: string
  notes?: string
}

interface ChoixClientData {
  nomClient: string
  telephoneClient?: string
  emailClient?: string
  dateVisite: string
  statut: string
  notesGenerales?: string
  chantier?: {
    nomChantier: string
    adresseChantier?: string
  }
  detailsChoix: DetailChoix[]
  companySettings: {
    nom: string
    adresse: string
    telephone: string
    email: string
    siret: string
    tva: string
    logo?: string
  }
}

const STATUTS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  PRE_CHOIX: 'Pré-choix',
  CHOIX_DEFINITIF: 'Choix définitif'
}

const FINITIONS_LABELS: Record<string, string> = {
  BRILLANT: 'Brillant',
  MAT: 'Mat',
  SATINE: 'Satiné',
  STRUCTURE: 'Structuré',
  POLI: 'Poli',
  ANTIDERAPANT: 'Anti-dérapant'
}

const TYPES_JOINT_LABELS: Record<string, string> = {
  EPOXY: 'Époxy',
  CIMENT: 'Ciment',
  SILICONE: 'Silicone',
  POLYURETHANE: 'Polyuréthane'
}

export function generateChoixClientHTML(data: ChoixClientData): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Récapitulatif Choix Client - ${data.nomClient}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1f2937;
      width: 100%;
      max-width: 210mm;
    }

    .container {
      width: 100%;
      max-width: 210mm;
      padding: 0;
      background: white;
    }

    /* En-tête */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      margin-bottom: 20px;
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

    /* Informations client */
    .client-info {
      background: white;
      border: 1px solid #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #2563eb;
    }

    .client-info h2 {
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

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 9pt;
      font-weight: 600;
    }

    .status-brouillon { background-color: #f3f4f6; color: #374151; }
    .status-pre-choix { background-color: #dbeafe; color: #1e40af; }
    .status-definitif { background-color: #d1fae5; color: #065f46; }

    /* Notes générales */
    .notes-generales {
      background-color: #fefce8;
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
      border-left: 4px solid #f59e0b;
    }

    .notes-generales h3 {
      font-size: 10pt;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 6px;
    }

    .notes-generales p {
      font-size: 9pt;
      color: #78350f;
      white-space: pre-wrap;
    }

    /* Choix */
    .choix-section {
      margin-bottom: 25px;
    }

    .choix-header {
      font-size: 14pt;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #e5e7eb;
    }

    .choix-card {
      background-color: #ffffff;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }

    .choix-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .color-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: none;
      flex-shrink: 0;
    }

    .choix-title h3 {
      font-size: 12pt;
      font-weight: 700;
      color: #1f2937;
    }

    /* Localisation tags */
    .localisation-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .tag {
      display: inline-block;
      padding: 3px 10px;
      background-color: #dbeafe;
      color: #1e40af;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }

    /* Grille d'informations produit */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    .product-item {
      font-size: 9pt;
    }

    .product-label {
      color: #6b7280;
      font-weight: 600;
    }

    .product-value {
      color: #1f2937;
      font-weight: 500;
    }

    .notes-choix {
      background-color: #f9fafb;
      padding: 10px;
      border-radius: 6px;
      margin-top: 10px;
      border-left: 3px solid #9ca3af;
    }

    .notes-choix-label {
      font-size: 8pt;
      color: #6b7280;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .notes-choix-text {
      font-size: 9pt;
      color: #374151;
      white-space: pre-wrap;
    }

    /* Pied de page */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
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
        <div class="company-name">${data.companySettings.nom}</div>
        <div class="company-details">
          ${data.companySettings.adresse}<br/>
          Tél: ${data.companySettings.telephone}<br/>
          Email: ${data.companySettings.email}<br/>
          SIRET: ${data.companySettings.siret} - TVA: ${data.companySettings.tva}
        </div>
      </div>
      ${data.companySettings.logo ? `<img src="${data.companySettings.logo}" alt="Logo" class="logo" />` : ''}
    </div>

    <!-- Titre -->
    <div class="document-title">
      <h1>Récapitulatif des Choix Client</h1>
      <div class="subtitle">Document généré le ${format(new Date(), 'dd MMMM yyyy', { locale: fr })}</div>
    </div>

    <!-- Informations client -->
    <div class="client-info">
      <h2>Informations Client</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">Nom du client</div>
          <div class="info-value">${data.nomClient}</div>
        </div>
        ${data.telephoneClient ? `
        <div class="info-item">
          <div class="info-label">Téléphone</div>
          <div class="info-value">${data.telephoneClient}</div>
        </div>
        ` : ''}
        ${data.emailClient ? `
        <div class="info-item">
          <div class="info-label">Email</div>
          <div class="info-value">${data.emailClient}</div>
        </div>
        ` : ''}
        <div class="info-item">
          <div class="info-label">Date de visite</div>
          <div class="info-value">${format(new Date(data.dateVisite), 'dd MMMM yyyy', { locale: fr })}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Statut</div>
          <div class="info-value">
            <span class="status-badge status-${data.statut.toLowerCase().replace('_', '-')}">
              ${STATUTS_LABELS[data.statut] || data.statut}
            </span>
          </div>
        </div>
        ${data.chantier ? `
        <div class="info-item">
          <div class="info-label">Chantier</div>
          <div class="info-value">${data.chantier.nomChantier}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <!-- Notes générales -->
    ${data.notesGenerales ? `
    <div class="notes-generales">
      <h3>Notes Générales</h3>
      <p>${data.notesGenerales}</p>
    </div>
    ` : ''}

    <!-- Choix -->
    <div class="choix-section">
      <div class="choix-header">
        Choix des Revêtements (${data.detailsChoix.length})
      </div>

      ${data.detailsChoix.map(detail => `
        <div class="choix-card">
          <div class="choix-title">
            <div class="color-circle" style="background-color: ${detail.couleurPlan};"></div>
            <h3>Choix #${detail.numeroChoix} - ${detail.type}</h3>
          </div>

          ${detail.localisations && detail.localisations.length > 0 ? `
          <div class="localisation-tags">
            ${detail.localisations.map(loc => `<span class="tag">${loc}</span>`).join('')}
          </div>
          ` : ''}

          <div class="product-grid">
            <div class="product-item">
              <span class="product-label">Marque:</span>
              <span class="product-value">${detail.marque}</span>
            </div>
            ${detail.collection ? `
            <div class="product-item">
              <span class="product-label">Collection:</span>
              <span class="product-value">${detail.collection}</span>
            </div>
            ` : ''}
            <div class="product-item">
              <span class="product-label">Modèle:</span>
              <span class="product-value">${detail.modele}</span>
            </div>
            ${detail.reference ? `
            <div class="product-item">
              <span class="product-label">Référence:</span>
              <span class="product-value">${detail.reference}</span>
            </div>
            ` : ''}
            ${detail.couleur ? `
            <div class="product-item">
              <span class="product-label">Couleur:</span>
              <span class="product-value">${detail.couleur}</span>
            </div>
            ` : ''}
            ${detail.finition ? `
            <div class="product-item">
              <span class="product-label">Finition:</span>
              <span class="product-value">${FINITIONS_LABELS[detail.finition] || detail.finition}</span>
            </div>
            ` : ''}
            ${detail.formatLongueur || detail.formatLargeur ? `
            <div class="product-item">
              <span class="product-label">Format:</span>
              <span class="product-value">
                ${detail.formatLongueur && detail.formatLargeur ? `${detail.formatLongueur} × ${detail.formatLargeur} cm` : detail.formatLongueur ? `${detail.formatLongueur} cm` : `${detail.formatLargeur} cm`}
              </span>
            </div>
            ` : ''}
            ${detail.epaisseur ? `
            <div class="product-item">
              <span class="product-label">Épaisseur:</span>
              <span class="product-value">${detail.epaisseur} mm</span>
            </div>
            ` : ''}
            ${detail.surfaceEstimee ? `
            <div class="product-item">
              <span class="product-label">Surface estimée:</span>
              <span class="product-value">${detail.surfaceEstimee} m²</span>
            </div>
            ` : ''}
            ${detail.couleurJoint ? `
            <div class="product-item">
              <span class="product-label">Couleur joint:</span>
              <span class="product-value">${detail.couleurJoint}</span>
            </div>
            ` : ''}
            ${detail.largeurJoint ? `
            <div class="product-item">
              <span class="product-label">Largeur joint:</span>
              <span class="product-value">${detail.largeurJoint} mm</span>
            </div>
            ` : ''}
            ${detail.typeJoint ? `
            <div class="product-item">
              <span class="product-label">Type de joint:</span>
              <span class="product-value">${TYPES_JOINT_LABELS[detail.typeJoint] || detail.typeJoint}</span>
            </div>
            ` : ''}
            ${detail.typePose ? `
            <div class="product-item">
              <span class="product-label">Type de pose:</span>
              <span class="product-value">${detail.typePose}</span>
            </div>
            ` : ''}
            ${detail.sensPose ? `
            <div class="product-item">
              <span class="product-label">Sens de pose:</span>
              <span class="product-value">${detail.sensPose}</span>
            </div>
            ` : ''}
          </div>

          ${detail.particularitesPose ? `
          <div class="notes-choix">
            <div class="notes-choix-label">Particularités de pose</div>
            <div class="notes-choix-text">${detail.particularitesPose}</div>
          </div>
          ` : ''}

          ${detail.notes ? `
          <div class="notes-choix">
            <div class="notes-choix-label">Notes</div>
            <div class="notes-choix-text">${detail.notes}</div>
          </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <!-- Pied de page -->
    <div class="footer">
      Ce document a été généré automatiquement par ${data.companySettings.nom}.<br/>
      Pour toute question, contactez-nous au ${data.companySettings.telephone} ou ${data.companySettings.email}
    </div>
  </div>
</body>
</html>
  `.trim()
}


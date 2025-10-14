export interface RapportData {
  chantier: {
    id: number
    chantierId: string
    nomChantier: string
    clientNom: string
    adresseChantier: string
  }
  date: string
  personnes: Array<{
    id: string
    nom: string
    fonction: string
  }>
  notes: Array<{
    id: string
    contenu: string
    tags: string[]
  }>
  photos: Array<{
    id: string
    file: File | null
    preview: string
    annotation: string
    tags: string[]
  }>
  tagFilter?: string
  logoBase64?: string
}

export function generateRapportHTML(data: RapportData): string {
  const { chantier, date, personnes, notes, photos, tagFilter, logoBase64 } = data
  
  // Filtrer les notes et photos selon le tagFilter
  const notesToInclude = tagFilter && tagFilter !== 'Tous'
    ? notes.filter(note => note.tags.includes(tagFilter))
    : notes
    
  const photosToInclude = tagFilter && tagFilter !== 'Tous'
    ? photos.filter(photo => photo.tags && photo.tags.includes(tagFilter))
    : photos

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport de Visite - ${chantier.nomChantier}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        @page {
            size: A4 portrait;
            margin: 0;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 10px;
            line-height: 1.5;
            color: #2d3748;
            background: white;
            width: 210mm;
            margin: 0 auto;
        }
        
        .container {
            width: 210mm;
            max-width: 210mm;
            margin: 0 auto;
            padding: 10mm;
        }
        
        /* En-tête moderne */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #3b82f6;
        }
        
        .logo-section {
            flex: 1;
        }
        
        .logo {
            max-width: 140px;
            max-height: 70px;
            object-fit: contain;
        }
        
        .document-title {
            flex: 2;
            text-align: center;
            padding: 0 20px;
        }
        
        .document-title h1 {
            font-size: 22px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .document-subtitle {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 10px;
            font-weight: 500;
        }
        
        .date-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            margin-top: 5px;
        }
        
        .filter-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
            background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
            color: white;
            margin: 10px 0;
        }
        
        .project-info {
            flex: 1;
            text-align: right;
            font-size: 9px;
        }
        
        .project-info .label {
            font-weight: 600;
            color: #374151;
        }
        
        .project-info .value {
            color: #64748b;
            margin-bottom: 4px;
        }
        
        /* Cartes d'information */
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .info-card {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #3b82f6;
        }
        
        .info-card h3 {
            font-size: 11px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .info-row {
            margin-bottom: 6px;
            font-size: 9px;
            display: flex;
            align-items: baseline;
        }
        
        .info-label {
            font-weight: 600;
            color: #475569;
            min-width: 80px;
        }
        
        .info-value {
            color: #1e293b;
            flex: 1;
        }
        
        /* Sections */
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        
        .section-header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 10px 15px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
        }
        
        .section-title {
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0;
        }
        
        .section-count {
            font-size: 10px;
            opacity: 0.9;
            margin-left: 8px;
        }
        
        .section-content {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 8px 8px;
            padding: 15px;
        }
        
        /* Personnes présentes */
        .personnes-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
        
        .personne-card {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
            border-left: 3px solid #10b981;
        }
        
        .personne-nom {
            font-weight: 600;
            color: #1e293b;
            font-size: 10px;
            margin-bottom: 3px;
        }
        
        .personne-fonction {
            color: #64748b;
            font-size: 9px;
        }
        
        /* Notes */
        .notes-list {
            list-style: none;
        }
        
        .note-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            border-left: 3px solid #f59e0b;
        }
        
        .note-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .note-number {
            font-weight: 700;
            color: #f59e0b;
            font-size: 11px;
        }
        
        .note-tags {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        
        .tag {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 8px;
            font-weight: 600;
            background: #fef3c7;
            color: #92400e;
        }
        
        .note-content {
            font-size: 10px;
            line-height: 1.6;
            color: #334155;
            white-space: pre-wrap;
        }
        
        /* Photos */
        .photos-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 20px;
        }
        
        .photo-item {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            page-break-inside: avoid;
        }
        
        .photo-image-container {
            width: 100%;
            text-align: center;
            background: #f8fafc;
            padding: 10px;
        }
        
        .photo-image {
            max-width: 100%;
            width: 100%;
            height: auto;
            max-height: 450px;
            object-fit: contain;
            border-radius: 6px;
            display: block;
            margin: 0 auto;
        }
        
        .photo-info {
            padding: 12px;
        }
        
        .photo-annotation {
            font-size: 10px;
            color: #1e293b;
            margin-bottom: 6px;
            font-weight: 500;
            line-height: 1.5;
        }
        
        .photo-tags {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        
        /* Footer */
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
        }
        
        .footer p {
            margin: 3px 0;
        }
        
        /* Page breaks */
        .page-break {
            page-break-before: always;
        }
        
        /* Print optimizations */
        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .container {
                padding: 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- En-tête -->
        <div class="header">
            <div class="logo-section">
                ${logoBase64 ? `<img src="data:image/png;base64,${logoBase64}" alt="Logo" class="logo">` : ''}
            </div>
            <div class="document-title">
                <h1>Rapport de Visite de Chantier</h1>
                <div class="document-subtitle">${chantier.nomChantier}</div>
                <div class="date-badge">${new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                ${tagFilter && tagFilter !== 'Tous' ? `<div class="filter-badge">Filtré: ${tagFilter}</div>` : ''}
            </div>
            <div class="project-info">
                <div class="info-row">
                    <span class="label">Chantier:</span> 
                    <span class="value">${chantier.chantierId}</span>
                </div>
                <div class="info-row">
                    <span class="label">Généré le:</span> 
                    <span class="value">${new Date().toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="info-row">
                    <span class="label">Heure:</span> 
                    <span class="value">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </div>
        
        <!-- Informations du chantier -->
        <div class="info-grid">
            <div class="info-card">
                <h3>Informations Chantier</h3>
                <div class="info-row">
                    <span class="info-label">Nom:</span>
                    <span class="info-value">${chantier.nomChantier}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Client:</span>
                    <span class="info-value">${chantier.clientNom || 'Non spécifié'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Adresse:</span>
                    <span class="info-value">${chantier.adresseChantier || 'Non spécifiée'}</span>
                </div>
            </div>
            
            <div class="info-card">
                <h3>Détails de la Visite</h3>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${new Date(date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Personnes:</span>
                    <span class="info-value">${personnes.length} présente(s)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Notes:</span>
                    <span class="info-value">${notesToInclude.length} enregistrée(s)</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Photos:</span>
                    <span class="info-value">${photosToInclude.length} ajoutée(s)</span>
                </div>
            </div>
        </div>
        
        <!-- Personnes présentes -->
        ${personnes.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    Personnes Présentes
                    <span class="section-count">(${personnes.length})</span>
                </div>
            </div>
            <div class="section-content">
                <div class="personnes-grid">
                    ${personnes.map(personne => `
                        <div class="personne-card">
                            <div class="personne-nom">${personne.nom}</div>
                            <div class="personne-fonction">${personne.fonction || 'Non spécifié'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Notes et observations -->
        ${notesToInclude.length > 0 ? `
        <div class="section">
            <div class="section-header">
                <div class="section-title">
                    Notes et Observations
                    <span class="section-count">(${notesToInclude.length})</span>
                </div>
            </div>
            <div class="section-content">
                <ul class="notes-list">
                    ${notesToInclude.map((note, index) => `
                        <li class="note-item">
                            <div class="note-header">
                                <span class="note-number">Note ${index + 1}</span>
                                ${note.tags && note.tags.length > 0 ? `
                                    <div class="note-tags">
                                        ${note.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            <div class="note-content">${note.contenu || ''}</div>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
        ` : ''}
        
        <!-- Photos -->
        ${photosToInclude.length > 0 ? `
        <div class="section page-break">
            <div class="section-header">
                <div class="section-title">
                    Photos du Chantier
                    <span class="section-count">(${photosToInclude.length})</span>
                </div>
            </div>
            <div class="section-content">
                <div class="photos-grid">
                    ${photosToInclude.map((photo, index) => {
                        // Vérifier si l'image est en base64 ou blob
                        const isBase64 = photo.preview.startsWith('data:image')
                        return `
                        <div class="photo-item">
                            <div class="photo-image-container">
                                ${isBase64 ? `<img src="${photo.preview}" alt="Photo ${index + 1}" class="photo-image" onerror="this.style.display='none'" />` : `<div style="padding: 60px; text-align: center; color: #94a3b8; background: #f1f5f9; border-radius: 6px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 60px; height: 60px; margin: 0 auto 10px;">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                    </svg>
                                    <p style="font-size: 11px;">Photo ${index + 1}</p>
                                </div>`}
                            </div>
                            ${photo.annotation || (photo.tags && photo.tags.length > 0) ? `
                                <div class="photo-info">
                                    ${photo.annotation ? `<div class="photo-annotation">📝 ${photo.annotation}</div>` : ''}
                                    ${photo.tags && photo.tags.length > 0 ? `
                                        <div class="photo-tags">
                                            ${photo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                        </div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        `
                    }).join('')}
                </div>
            </div>
        </div>
        ` : ''}
        
        <!-- Footer -->
        <div class="footer">
            <p>Document généré automatiquement le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
            <p>© ${new Date().getFullYear()} - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
  `
}


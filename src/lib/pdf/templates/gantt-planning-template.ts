export interface GanttPlanningData {
  periodText: string
  scale: string
  timeUnits: Array<{
    start: string
    end: string
    label: string
    subLabel: string
    isWeekend: boolean
  }>
  chantiers: Array<{
    id: string
    title: string
    start: string
    end: string
    client: string
    etat: string
    adresse: string
  }>
}

export interface CompanySettings {
  nomEntreprise?: string
  adresse?: string
  siret?: string
  logoBase64?: string
}

export function generateGanttPlanningHTML(
  data: GanttPlanningData,
  companySettings: CompanySettings | null
): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planning Gantt - ${data.periodText}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 9px;
      color: #333;
      background: white;
      padding: 12mm;
    }

    /* En-tête */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2563eb;
    }

    .company-info {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .company-logo {
      max-height: 50px;
      max-width: 100px;
      object-fit: contain;
    }

    .company-details {
      font-size: 10px;
      line-height: 1.3;
    }

    .company-name {
      font-size: 14px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 3px;
    }

    .document-info {
      text-align: right;
      font-size: 10px;
    }

    .document-title {
      font-size: 16px;
      font-weight: bold;
      color: #333;
      margin-bottom: 5px;
    }

    .document-period {
      font-size: 12px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 3px;
    }

    .document-scale {
      font-size: 9px;
      color: #666;
    }

    /* Tableau de planning */
    .gantt-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 8px;
    }

    .gantt-table th {
      background: white;
      border: 1px solid #d1d5db;
      padding: 8px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 7px;
      color: #374151;
      vertical-align: middle;
    }

    .gantt-table td {
      border: 1px solid #d1d5db;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
      height: 30px;
    }

    /* Colonne des chantiers */
    .chantier-cell {
      text-align: left !important;
      font-weight: bold;
      background: #f9fafb;
      width: 200px;
      max-width: 200px;
      font-size: 8px;
      padding: 8px 10px !important;
      word-wrap: break-word;
      overflow: hidden;
    }

    .chantier-title {
      font-weight: bold;
      margin-bottom: 2px;
      color: #1f2937;
    }

    .chantier-client {
      font-size: 7px;
      color: #6b7280;
      margin-bottom: 1px;
    }

    .chantier-adresse {
      font-size: 6px;
      color: #9ca3af;
      font-style: italic;
    }

    /* Colonnes des unités de temps */
    .time-header {
      width: 35px;
      min-width: 35px;
      max-width: 35px;
      text-align: center;
      writing-mode: horizontal-tb;
    }

    .time-cell {
      width: 35px;
      min-width: 35px;
      max-width: 35px;
      padding: 2px !important;
      font-size: 6px;
      position: relative;
    }

    /* Indicateurs de chantier */
    .chantier-indicator {
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      bottom: 2px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 6px;
      font-weight: bold;
      color: white;
      text-align: center;
    }

    .etat-preparation {
      background-color: #f59e0b;
    }

    .etat-cours {
      background-color: #3b82f6;
    }

    .etat-termine {
      background-color: #10b981;
    }

    /* Légende */
    .legend {
      margin-top: 20px;
      padding: 10px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-size: 7px;
    }

    .legend-title {
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 8px;
    }

    .legend-items {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* Optimisations pour le PDF */
    @media print {
      body {
        padding: 10mm;
      }
      
      .gantt-table {
        page-break-inside: auto;
      }
      
      .gantt-table tr {
        page-break-inside: avoid;
      }
      
      .gantt-table thead {
        display: table-header-group;
      }
    }

    /* Responsive pour différentes largeurs */
    @page {
      size: A3 landscape;
      margin: 8mm;
    }
  </style>
</head>
<body>
  <!-- En-tête -->
  <div class="header">
    <div class="company-info">
      ${companySettings?.logoBase64 ? `
        <img src="${companySettings.logoBase64}" alt="Logo" class="company-logo">
      ` : ''}
      <div class="company-details">
        <div class="company-name">${companySettings?.nomEntreprise || 'Nom Entreprise'}</div>
        <div>${companySettings?.adresse || 'Adresse entreprise'}</div>
        ${companySettings?.siret ? `<div>SIRET: ${companySettings.siret}</div>` : ''}
      </div>
    </div>
    <div class="document-info">
      <div class="document-title">Planning des Chantiers</div>
      <div class="document-period">${data.periodText}</div>
      <div class="document-scale">Échelle: ${data.scale}</div>
    </div>
  </div>

  <!-- Tableau de planning -->
  <table class="gantt-table">
    <thead>
      <tr>
        <th class="chantier-cell">Chantier</th>
        ${data.timeUnits.map(unit => `
          <th class="time-header">
            <div style="font-size: 7px; font-weight: bold;">${unit.label}</div>
            <div style="font-size: 5px; color: #6b7280; margin-top: 1px;">${unit.subLabel}</div>
            ${data.scale === 'Jours' ? `
              <div style="font-size: 4px; color: #9ca3af; margin-top: 1px;">
                ${new Date(unit.start).toLocaleDateString('fr-FR', { weekday: 'short' })}
              </div>
            ` : ''}
          </th>
        `).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.chantiers.map(chantier => {
        const start = new Date(chantier.start)
        const end = new Date(chantier.end)
        
        // Déterminer la couleur selon l'état
        let etatClass = 'etat-preparation'
        if (chantier.etat === 'En cours') etatClass = 'etat-cours'
        else if (chantier.etat === 'Terminé') etatClass = 'etat-termine'
        
        return `
          <tr>
            <td class="chantier-cell">
              <div class="chantier-title">${chantier.title}</div>
              <div class="chantier-client">${chantier.client}</div>
              <div class="chantier-adresse">${chantier.adresse}</div>
            </td>
            ${data.timeUnits.map(unit => {
              const unitStart = new Date(unit.start)
              const unitEnd = new Date(unit.end)
              
              // Vérifier si le chantier est actif pendant cette période
              const isActive = start <= unitEnd && end >= unitStart
              
              if (!isActive) {
                return `<td class="time-cell"></td>`
              }
              
              // Calculer la progression dans l'unité de temps
              let progression = ''
              if (data.scale === 'Jours') {
                // Pour les jours, afficher le pourcentage de progression
                const totalDuration = end.getTime() - start.getTime()
                const currentProgress = unitStart.getTime() - start.getTime()
                if (totalDuration > 0) {
                  const percentage = Math.min(100, Math.max(0, (currentProgress / totalDuration) * 100))
                  progression = `${Math.round(percentage)}%`
                }
              } else if (data.scale === 'Semaines') {
                // Pour les semaines, afficher le jour de la semaine
                const dayOfWeek = unitStart.getDay()
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
                progression = dayNames[dayOfWeek]
              } else {
                // Pour les mois, afficher le jour du mois
                progression = unitStart.getDate().toString()
              }
              
              return `
                <td class="time-cell">
                  <div class="chantier-indicator ${etatClass}">
                    <div style="font-size: 5px; margin-bottom: 1px;">${progression}</div>
                    <div style="font-size: 6px; font-weight: bold;">
                      ${chantier.etat === 'En cours' ? 'C' : chantier.etat === 'Terminé' ? 'T' : 'P'}
                    </div>
                  </div>
                </td>
              `
            }).join('')}
          </tr>
        `
      }).join('')}
    </tbody>
  </table>

  <!-- Légende -->
  <div class="legend">
    <div class="legend-title">Légende</div>
    <div class="legend-items">
      <div class="legend-item">
        <div class="legend-color etat-preparation"></div>
        <span>En préparation</span>
      </div>
      <div class="legend-item">
        <div class="legend-color etat-cours"></div>
        <span>En cours</span>
      </div>
      <div class="legend-item">
        <div class="legend-color etat-termine"></div>
        <span>Terminé</span>
      </div>
      <div class="legend-item">
        <span><strong>C</strong> = En cours</span>
      </div>
      <div class="legend-item">
        <span><strong>T</strong> = Terminé</span>
      </div>
      <div class="legend-item">
        <span><strong>P</strong> = En préparation</span>
      </div>
      <div class="legend-item">
        <span><strong>%</strong> = Progression (jours)</span>
      </div>
      <div class="legend-item">
        <span><strong>Lun/Mar...</strong> = Jour semaine</span>
      </div>
      <div class="legend-item">
        <span><strong>1/15/30</strong> = Jour du mois</span>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

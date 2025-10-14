export interface PlanningData {
  periodText: string
  days: string[]
  resources: Array<{
    id: string
    title: string
    kind: 'I' | 'S'
  }>
  tasks: Array<{
    id: string
    title: string
    start: string
    end: string
    status: string
    ouvriersInternes?: Array<{ ouvrierInterne: { id: string } }>
    sousTraitants?: Array<{ soustraitant: { id: string } }>
  }>
}

export interface CompanySettings {
  nomEntreprise?: string
  adresse?: string
  siret?: string
  logoBase64?: string
}

export function generatePlanningHTML(
  data: PlanningData,
  companySettings: CompanySettings | null
): string {
  // Déterminer si c'est une vue semaine ou mois basée sur le nombre de jours
  const isWeekView = data.days.length === 7
  const isMonthView = data.days.length > 7
  
  // Calculer la largeur des colonnes de temps
  // const timeColumnWidth = isWeekView ? 'minmax(0, 1fr)' : `${100 / data.days.length}%`
  
  // Fonction pour obtenir la couleur d'une ressource
  const getColorForResource = (resourceId: string) => {
    const palette = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#f43f5e', '#fb7185']
    const hash = resourceId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)
    return palette[Math.abs(hash) % palette.length]
  }

  // Fonction pour obtenir la couleur teintée (pour la vue mois)
  const getTintedColor = (hex: string, alpha = 0.3) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const mix = (c: number) => Math.round((1 - alpha) * 255 + alpha * c)
    const rr = mix(r).toString(16).padStart(2, '0')
    const gg = mix(g).toString(16).padStart(2, '0')
    const bb = mix(b).toString(16).padStart(2, '0')
    return `#${rr}${gg}${bb}`
  }

  // Fonction pour vérifier si une tâche est active un jour donné
  const isTaskActiveOnDay = (task: { start: string; end: string }, day: string) => {
    const taskStart = new Date(task.start)
    const taskEnd = new Date(task.end)
    const dayDate = new Date(day)
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999)
    
    return taskStart <= dayEnd && taskEnd >= dayStart
  }

  // Fonction pour obtenir les segments de tâche pour un jour
  const getTaskSegmentsForDay = (task: { start: string; end: string }, day: string) => {
    const taskStart = new Date(task.start)
    const taskEnd = new Date(task.end)
    const dayDate = new Date(day)
    const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0)
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999)
    
    if (taskEnd < dayStart || taskStart > dayEnd) return []
    
    // Matin = [7:30, 12:00], Après-midi = [13:00, 16:30]
    const amStart = new Date(dayDate)
    amStart.setHours(7, 30, 0, 0)
    const amEnd = new Date(dayDate)
    amEnd.setHours(12, 0, 0, 0)
    const pmStart = new Date(dayDate)
    pmStart.setHours(13, 0, 0, 0)
    const pmEnd = new Date(dayDate)
    pmEnd.setHours(16, 30, 0, 0)
    
    const coversAM = taskEnd > amStart && taskStart < amEnd
    const coversPM = taskEnd > pmStart && taskStart < pmEnd
    
    if (coversAM && coversPM) return ['FULL']
    if (coversAM) return ['AM']
    if (coversPM) return ['PM']
    
    // Si sur la journée mais coupure midi non prise: considérer FULL
    if (taskStart <= amStart && taskEnd >= pmEnd) return ['FULL']
    return []
  }

  // Fonction pour vérifier si une ressource est assignée à une tâche
  const isResourceAssignedToTask = (
    resource: { id: string },
    task: {
      ouvriersInternes?: Array<{ ouvrierInterne: { id: string } }>
      sousTraitants?: Array<{ soustraitant: { id: string } }>
    }
  ) => {
    if (resource.id.startsWith('I:')) {
      return task.ouvriersInternes?.some((oi) => `I:${oi.ouvrierInterne.id}` === resource.id)
    } else if (resource.id.startsWith('S:')) {
      return task.sousTraitants?.some((st) => `S:${st.soustraitant.id}` === resource.id)
    }
    return false
  }

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planning des Ressources - ${data.periodText}</title>
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

    .document-view-type {
      font-size: 9px;
      color: #666;
    }

    /* Tableau de planning */
    .planning-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 8px;
    }

    .planning-table th {
      background: #f8fafc;
      border: 1px solid #d1d5db;
      padding: 8px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 7px;
      color: #374151;
      vertical-align: middle;
    }

    .planning-table td {
      border: 1px solid #d1d5db;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
      height: ${isWeekView ? '40px' : '24px'};
    }

    /* Colonne des ressources */
    .resource-cell {
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

    .resource-title {
      font-weight: bold;
      margin-bottom: 2px;
      color: #1f2937;
    }

    .resource-type {
      font-size: 7px;
      color: #6b7280;
      font-style: italic;
    }

    /* Colonnes des jours */
    .day-header {
      width: ${isWeekView ? '35px' : 'auto'};
      min-width: ${isWeekView ? '35px' : '20px'};
      max-width: ${isWeekView ? '35px' : 'none'};
      text-align: center;
      writing-mode: horizontal-tb;
    }

    .day-cell {
      width: ${isWeekView ? '35px' : 'auto'};
      min-width: ${isWeekView ? '35px' : '20px'};
      max-width: ${isWeekView ? '35px' : 'none'};
      padding: 2px !important;
      font-size: 6px;
      position: relative;
    }

    /* Indicateurs de tâche */
    .task-indicator {
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
      flex-direction: column;
    }

    .task-full {
      background-color: #3b82f6;
    }

    .task-am {
      background-color: #f59e0b;
    }

    .task-pm {
      background-color: #10b981;
    }

    /* Vue mois avec couleur teintée */
    .month-indicator {
      background-color: rgba(59, 130, 246, 0.3);
      border: 1px solid #3b82f6;
      border-radius: 2px;
    }

    /* Légende */
    .legend {
      margin-top: 20px;
      padding: 10px;
      background: #f8fafc;
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
      
      .planning-table {
        page-break-inside: auto;
      }
      
      .planning-table tr {
        page-break-inside: avoid;
      }
      
      .planning-table thead {
        display: table-header-group;
      }
    }

    /* Responsive pour différentes largeurs */
    @page {
      size: A4 landscape;
      margin: 15mm;
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
      <div class="document-title">Planning des Ressources</div>
      <div class="document-period">${data.periodText}</div>
      <div class="document-view-type">Vue: ${isWeekView ? 'Semaine' : isMonthView ? 'Mois' : 'Personnalisée'}</div>
    </div>
  </div>

  <!-- Tableau de planning -->
  <table class="planning-table">
    <thead>
      <tr>
        <th class="resource-cell">Ressource</th>
        ${data.days.map(day => {
          const date = new Date(day)
          const isSunday = date.getDay() === 0
          // Détection des fériés belges
          const belgianHolidays = (year: number) => {
            const holidays = new Set<string>()
            // Fériés fixes
            holidays.add(`${year}-01-01`) // Nouvel An
            holidays.add(`${year}-05-01`) // Fête du Travail
            holidays.add(`${year}-07-21`) // Fête Nationale
            holidays.add(`${year}-08-15`) // Assomption
            holidays.add(`${year}-11-01`) // Toussaint
            holidays.add(`${year}-11-11`) // Armistice
            holidays.add(`${year}-12-25`) // Noël
            
            // Pâques (calcul approximatif - dimanche après la première pleine lune du printemps)
            const easter = new Date(year, 2, 21) // 21 mars
            const daysToAdd = (15 + easter.getDay() + 19) % 7
            easter.setDate(21 + daysToAdd)
            holidays.add(easter.toISOString().slice(0, 10))
            
            // Lundi de Pâques
            const easterMonday = new Date(easter)
            easterMonday.setDate(easter.getDate() + 1)
            holidays.add(easterMonday.toISOString().slice(0, 10))
            
            // Ascension (40 jours après Pâques)
            const ascension = new Date(easter)
            ascension.setDate(easter.getDate() + 39)
            holidays.add(ascension.toISOString().slice(0, 10))
            
            // Lundi de Pentecôte (50 jours après Pâques)
            const pentecostMonday = new Date(easter)
            pentecostMonday.setDate(easter.getDate() + 50)
            holidays.add(pentecostMonday.toISOString().slice(0, 10))
            
            return holidays
          }
          const isHoliday = belgianHolidays(date.getFullYear()).has(date.toISOString().slice(0, 10))
          
          return `
            <th class="day-header" style="${isSunday ? 'background-color: #f3f4f6;' : ''} ${isHoliday ? 'background-color: #fef2f2;' : ''}">
              <div style="font-size: 7px; font-weight: bold;">
                ${isWeekView ? date.toLocaleDateString('fr-FR', { weekday: 'short' }) : date.getDate()}
              </div>
              <div style="font-size: 5px; color: #6b7280; margin-top: 1px;">
                ${isWeekView ? date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : date.toLocaleDateString('fr-FR', { month: 'short' })}
              </div>
              ${isWeekView ? `
                <div style="font-size: 4px; color: #9ca3af; margin-top: 1px;">
                  ${date.toLocaleDateString('fr-FR', { weekday: 'short' })}
                </div>
              ` : ''}
            </th>
          `
        }).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.resources.map(resource => `
        <tr>
          <td class="resource-cell">
            <div class="resource-title">${resource.title}</div>
            <div class="resource-type">${resource.kind === 'I' ? 'Ouvrier Interne' : 'Sous-traitant'}</div>
          </td>
          ${data.days.map(day => {
            const tasksForDay = data.tasks.filter(task => 
              isResourceAssignedToTask(resource, task) && isTaskActiveOnDay(task, day)
            )
            
            if (tasksForDay.length === 0) {
              return `<td class="day-cell"></td>`
            }
            
            if (isWeekView) {
              // Vue semaine : afficher les segments détaillés
              const segments = tasksForDay.flatMap(task => getTaskSegmentsForDay(task, day))
              const uniqueSegments = [...new Set(segments)]
              
              return `
                <td class="day-cell">
                  ${uniqueSegments.map(segment => {
                    const colorClass = segment === 'FULL' ? 'task-full' : segment === 'AM' ? 'task-am' : 'task-pm'
                    const label = segment === 'FULL' ? 'Jour' : segment === 'AM' ? 'AM' : 'PM'
                    
                    return `
                      <div class="task-indicator ${colorClass}">
                        <div style="font-size: 5px; margin-bottom: 1px;">${label}</div>
                        <div style="font-size: 6px; font-weight: bold;">${tasksForDay.length}</div>
                      </div>
                    `
                  }).join('')}
                </td>
              `
            } else {
              // Vue mois : afficher un indicateur simple avec couleur teintée
              const resourceColor = getColorForResource(resource.id)
              const tintedColor = getTintedColor(resourceColor, 0.3)
              
              return `
                <td class="day-cell">
                  <div class="month-indicator" style="background-color: ${tintedColor}; border-color: ${resourceColor};">
                    <div style="font-size: 5px; color: #1f2937; font-weight: bold;">${tasksForDay.length}</div>
                  </div>
                </td>
              `
            }
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Légende -->
  <div class="legend">
    <div class="legend-title">Légende</div>
    <div class="legend-items">
      ${isWeekView ? `
        <div class="legend-item">
          <div class="legend-color task-full"></div>
          <span>Journée complète</span>
        </div>
        <div class="legend-item">
          <div class="legend-color task-am"></div>
          <span>Matin (7h30-12h)</span>
        </div>
        <div class="legend-item">
          <div class="legend-color task-pm"></div>
          <span>Après-midi (13h-16h30)</span>
        </div>
      ` : `
        <div class="legend-item">
          <div class="legend-color month-indicator"></div>
          <span>Tâches planifiées (nombre affiché)</span>
        </div>
      `}
      <div class="legend-item">
        <span><strong>Dimanche</strong> = Fond grisé</span>
      </div>
      <div class="legend-item">
        <span><strong>Férié</strong> = Fond rouge clair</span>
      </div>
    </div>
  </div>
</body>
</html>
  `
}

import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import 'dayjs/locale/fr'

// Initialiser dayjs avec les plugins nécessaires et la locale française
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
dayjs.locale('fr') // Les semaines commencent le lundi en France

export interface GanttData {
  chantiers: Array<{
    id: string
    title: string
    start: string
    end: string | null
    client: string
    etat: string
    adresse?: string
    montant?: number
    dureeEnJours?: number
  }>
  period: string
  scale: 'Jours' | 'Semaines' | 'Mois'
  filters: {
    'En préparation': boolean
    'En cours': boolean
    'Terminé': boolean
  }
  companySettings: {
    nom?: string
    adresse?: string
    telephone?: string
    email?: string
  }
}

export function generateGanttHTML(data: GanttData): string {
  const { chantiers, period, scale, filters, companySettings } = data
  
  // Filtrer les chantiers selon les filtres
  const filteredChantiers = chantiers.filter(
    chantier => filters[chantier.etat as keyof typeof filters]
  )

  // Calculer les statistiques
  const stats = {
    total: filteredChantiers.length,
    enPreparation: filteredChantiers.filter(c => c.etat === 'En préparation').length,
    enCours: filteredChantiers.filter(c => c.etat === 'En cours').length,
    termines: filteredChantiers.filter(c => c.etat === 'Terminé').length
  }

  // Générer les colonnes de temps selon l'échelle (même logique que GanttChart)
  const generateTimeColumns = () => {
    // Utiliser la même période que dans le composant GanttChart
    const periodStart = dayjs().startOf('month')
    const periodEnd = dayjs().add(3, 'month').endOf('month')
    
    let columns = ''
    let current = periodStart.clone()
    
    if (scale === 'Semaines') {
      current = periodStart.startOf('week')
      while (current.isBefore(periodEnd)) {
        const weekEnd = current.add(6, 'day')
        const weekNumber = current.week()
        columns += `
          <th class="time-header">
            <div class="time-label">Sem ${weekNumber}</div>
            <div class="time-sublabel">${current.format('DD/MM')} - ${weekEnd.format('DD/MM')}</div>
          </th>
        `
        current = current.add(1, 'week')
      }
    } else if (scale === 'Mois') {
      current = periodStart.clone().startOf('month')
      while (current.isBefore(periodEnd)) {
        const monthName = current.format('MMM')
        columns += `
          <th class="time-header">
            <div class="time-label">${monthName.charAt(0).toUpperCase() + monthName.slice(1)}</div>
            <div class="time-sublabel">${current.format('YYYY')}</div>
          </th>
        `
        current = current.add(1, 'month')
      }
    } else {
      // Jours
      current = periodStart.clone()
      while (current.isBefore(periodEnd) || current.isSame(periodEnd, 'day')) {
        columns += `
          <th class="time-header">
            <div class="time-label">${current.format('DD')}</div>
            <div class="time-sublabel">${current.format('ddd')}</div>
          </th>
        `
        current = current.add(1, 'day')
      }
    }
    
    return columns
  }

  // Générer les barres de chantiers avec positionnement correct (même logique que GanttChart)
  const generateChantierBars = () => {
    // Utiliser exactement la même période que dans GanttChart
    const periodStart = dayjs().startOf('month')
    const periodEnd = dayjs().add(3, 'month').endOf('month')
    
    // Générer les unités de temps de la même manière que GanttChart
    const timeUnits = []
    let current = periodStart.clone()
    
    if (scale === 'Semaines') {
      current = periodStart.startOf('week')
      while (current.isBefore(periodEnd)) {
        timeUnits.push({
          start: current.clone(),
          end: current.clone().add(6, 'day')
        })
        current = current.add(1, 'week')
      }
    } else if (scale === 'Mois') {
      current = periodStart.clone().startOf('month')
      while (current.isBefore(periodEnd)) {
        timeUnits.push({
          start: current.clone(),
          end: current.clone().endOf('month')
        })
        current = current.add(1, 'month')
      }
    } else {
      // Jours
      current = periodStart.clone()
      while (current.isBefore(periodEnd) || current.isSame(periodEnd, 'day')) {
        timeUnits.push({
          start: current.clone(),
          end: current.clone().endOf('day')
        })
        current = current.add(1, 'day')
      }
    }
    
    return filteredChantiers.map(chantier => {
      const chantierStart = dayjs(chantier.start)
      const chantierEnd = chantier.end ? dayjs(chantier.end) : chantierStart.add(30, 'day')
      
      // Couleur selon l'état
      let color = '#10b981' // Vert par défaut
      if (chantier.etat === 'En préparation') color = '#f59e0b' // Jaune
      else if (chantier.etat === 'En cours') color = '#3b82f6' // Bleu
      
      // Calculer la position comme dans GanttChart
      let startPosition = 0
      let startOffset = 0
      let endPosition = timeUnits.length - 1
      let endOffset = 80 // Largeur par unité
      
      // Trouver la position de début
      for (let i = 0; i < timeUnits.length; i++) {
        const unit = timeUnits[i]
        
        if (chantierStart.isBefore(periodStart)) {
          startPosition = 0
          startOffset = 0
          break
        }
        
        if (
          (scale === 'Jours' && chantierStart.isSame(unit.start, 'day')) ||
          (scale === 'Semaines' && (chantierStart.isAfter(unit.start) || chantierStart.isSame(unit.start)) && (chantierStart.isBefore(unit.end) || chantierStart.isSame(unit.end))) ||
          (scale === 'Mois' && (chantierStart.isAfter(unit.start) || chantierStart.isSame(unit.start)) && (chantierStart.isBefore(unit.end) || chantierStart.isSame(unit.end)))
        ) {
          startPosition = i
          
          if (scale === 'Semaines') {
            const dayInWeek = chantierStart.diff(unit.start, 'day')
            startOffset = (dayInWeek / 7) * 80
          } else if (scale === 'Mois') {
            const daysInMonth = unit.end.date()
            const dayInMonth = chantierStart.date() - 1
            startOffset = (dayInMonth / daysInMonth) * 120
          }
          break
        }
      }
      
      // Trouver la position de fin
      for (let i = 0; i < timeUnits.length; i++) {
        const unit = timeUnits[i]
        
        if (chantierEnd.isAfter(periodEnd)) {
          endPosition = timeUnits.length - 1
          endOffset = 80
          break
        }
        
        if (
          (scale === 'Jours' && chantierEnd.isSame(unit.start, 'day')) ||
          (scale === 'Semaines' && (chantierEnd.isAfter(unit.start) || chantierEnd.isSame(unit.start)) && (chantierEnd.isBefore(unit.end) || chantierEnd.isSame(unit.end))) ||
          (scale === 'Mois' && (chantierEnd.isAfter(unit.start) || chantierEnd.isSame(unit.start)) && (chantierEnd.isBefore(unit.end) || chantierEnd.isSame(unit.end)))
        ) {
          endPosition = i
          
          if (scale === 'Semaines') {
            const dayInWeek = chantierEnd.diff(unit.start, 'day')
            endOffset = ((dayInWeek + 1) / 7) * 80
          } else if (scale === 'Mois') {
            const daysInMonth = unit.end.date()
            const dayInMonth = chantierEnd.date()
            endOffset = (dayInMonth / daysInMonth) * 120
          }
          break
        }
      }
      
      // Calculer la position et largeur finale
      const columnWidth = scale === 'Jours' ? 20 : scale === 'Semaines' ? 80 : 120
      const barStartX = (startPosition * columnWidth) + startOffset
      const barWidth = ((endPosition - startPosition) * columnWidth) + endOffset - startOffset
      
      return `
        <tr class="chantier-row">
          <td class="chantier-info">
            <div class="chantier-name">${chantier.title}</div>
            <div class="chantier-client">${chantier.client}</div>
            <div class="chantier-dates">${chantierStart.format('DD/MM/YY')} - ${chantierEnd.format('DD/MM/YY')}</div>
          </td>
          <td class="chantier-bar-cell" colspan="${timeUnits.length}">
            <div class="chantier-bar-container">
              <div class="chantier-bar" style="background-color: ${color}; width: ${Math.max(barWidth, 8)}px; margin-left: ${barStartX}px;">
                <span class="bar-text">${chantier.title.length > 20 ? chantier.title.substring(0, 20) + '...' : chantier.title}</span>
              </div>
            </div>
          </td>
        </tr>
      `
    }).join('')
  }

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Planning des Chantiers</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          font-size: 12px;
          color: #1f2937;
          background: white;
          line-height: 1.4;
        }
        
        .page-header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #3b82f6;
        }
        
        .company-info {
          margin-bottom: 15px;
        }
        
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          margin-bottom: 5px;
        }
        
        .company-details {
          font-size: 12px;
          color: #6b7280;
        }
        
        .document-title {
          font-size: 20px;
          font-weight: bold;
          color: #1f2937;
          margin: 15px 0;
        }
        
        .document-subtitle {
          font-size: 14px;
          color: #6b7280;
        }
        
        .stats-container {
          display: flex;
          justify-content: space-around;
          margin: 20px 0;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .stat-item {
          text-align: center;
        }
        
        .stat-number {
          font-size: 24px;
          font-weight: bold;
          color: #3b82f6;
          display: block;
        }
        
        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .gantt-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 11px;
        }
        
        .gantt-table th,
        .gantt-table td {
          border: 1px solid #d1d5db;
          padding: 8px;
          vertical-align: top;
        }
        
        .gantt-table th {
          background: #3b82f6;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .time-header {
          min-width: 80px;
        }
        
        .time-label {
          font-weight: bold;
          margin-bottom: 2px;
        }
        
        .time-sublabel {
          font-size: 10px;
          opacity: 0.9;
        }
        
        .chantier-info {
          background: #f9fafb;
          font-weight: 500;
          width: 250px;
          min-width: 250px;
        }
        
        .chantier-name {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 2px;
        }
        
        .chantier-client {
          color: #6b7280;
          font-size: 10px;
          margin-bottom: 2px;
        }
        
        .chantier-dates {
          color: #9ca3af;
          font-size: 9px;
        }
        
        .chantier-bar-cell {
          position: relative;
          height: 40px;
          padding: 5px;
        }
        
        .chantier-bar-container {
          position: relative;
          width: 100%;
          height: 100%;
        }
        
        .chantier-bar {
          height: 20px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          padding: 0 8px;
          position: relative;
          min-width: 50px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .bar-text {
          color: white;
          font-size: 9px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          white-space: nowrap;
          overflow: hidden;
        }
        
        .legend {
          margin-top: 30px;
          padding: 15px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        
        .legend-title {
          font-weight: bold;
          margin-bottom: 10px;
          color: #1f2937;
        }
        
        .legend-items {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          font-size: 11px;
        }
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 8px;
          margin-right: 8px;
        }
        
        .page-footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 10px;
          color: #6b7280;
        }
        
        @media print {
          body {
            font-size: 10px;
          }
          
          .page-header {
            margin-bottom: 20px;
          }
          
          .stats-container {
            margin: 15px 0;
            padding: 10px;
          }
          
          .gantt-table {
            font-size: 9px;
          }
          
          .chantier-bar {
            height: 18px;
          }
          
          .bar-text {
            font-size: 8px;
          }
        }
      </style>
    </head>
    <body>
      <div class="page-header">
        <div class="company-info">
          ${companySettings.nom ? `<div class="company-name">${companySettings.nom}</div>` : ''}
          ${companySettings.adresse ? `<div class="company-details">${companySettings.adresse}</div>` : ''}
          ${companySettings.telephone ? `<div class="company-details">Tél: ${companySettings.telephone}</div>` : ''}
          ${companySettings.email ? `<div class="company-details">Email: ${companySettings.email}</div>` : ''}
        </div>
        
        <div class="document-title">Planning des Chantiers</div>
        <div class="document-subtitle">${period} - Échelle: ${scale}</div>
      </div>
      
      <div class="stats-container">
        <div class="stat-item">
          <span class="stat-number">${stats.total}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.enPreparation}</span>
          <span class="stat-label">En préparation</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.enCours}</span>
          <span class="stat-label">En cours</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${stats.termines}</span>
          <span class="stat-label">Terminés</span>
        </div>
      </div>
      
      <table class="gantt-table">
        <thead>
          <tr>
            <th style="width: 250px;">Chantier</th>
            ${generateTimeColumns()}
          </tr>
        </thead>
        <tbody>
          ${generateChantierBars()}
        </tbody>
      </table>
      
      <div class="legend">
        <div class="legend-title">Légende des états</div>
        <div class="legend-items">
          <div class="legend-item">
            <div class="legend-color" style="background-color: #f59e0b;"></div>
            <span>En préparation</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #3b82f6;"></div>
            <span>En cours</span>
          </div>
          <div class="legend-item">
            <div class="legend-color" style="background-color: #10b981;"></div>
            <span>Terminé</span>
          </div>
        </div>
      </div>
      
      <div class="page-footer">
        Généré le ${dayjs().format('DD/MM/YYYY à HH:mm')} - Planning des Chantiers
      </div>
    </body>
    </html>
  `
}

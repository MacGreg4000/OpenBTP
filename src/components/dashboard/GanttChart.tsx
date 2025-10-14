import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isToday from 'dayjs/plugin/isToday'
import 'dayjs/locale/fr'
import { ChevronLeftIcon, ChevronRightIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'

// Initialiser dayjs
dayjs.extend(weekOfYear)
dayjs.extend(isSameOrBefore)
dayjs.extend(isSameOrAfter)
dayjs.extend(isToday)
dayjs.locale('fr')

// Types
interface Chantier {
  id: string
  title: string
  start: string
  end: string | null
  client: string
  etat: string
  adresse?: string
  montant?: number
  dureeEnJours?: number
}

interface GanttChartProps {
  chantiers: Chantier[]
  loading?: boolean
}

const GanttChart: React.FC<GanttChartProps> = ({ chantiers, loading = false }) => {
  // État pour l'infobulle
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    chantier: Chantier | null;
    position: { x: number; y: number };
  }>({
    visible: false,
    chantier: null,
    position: { x: 0, y: 0 }
  })

  // État pour la période affichée
  const [period, setPeriod] = useState({
    start: dayjs().startOf('month'),
    end: dayjs().add(3, 'month').endOf('month')
  })
  
  // État pour l'échelle de temps
  const [scale, setScale] = useState<'Jours' | 'Semaines' | 'Mois'>('Semaines')
  
  // État pour les filtres - par défaut, masquer les chantiers terminés
  const [filters, setFilters] = useState({
    'En préparation': true,
    'En cours': true,
    'Terminé': false
  })
  
  // État pour afficher tous les chantiers ou seulement ceux dans la période
  const [showAllChantiers, setShowAllChantiers] = useState(false)
  
  // Gérer le changement d'échelle
  useEffect(() => {
    const now = dayjs()
    
    switch(scale) {
      case 'Jours':
        setPeriod({
          start: now.subtract(2, 'day').startOf('day'),
          end: now.add(12, 'day').endOf('day')
        })
        break
      case 'Semaines':
        setPeriod({
          start: now.startOf('month'),
          end: now.add(3, 'month').endOf('month')
        })
        break
      case 'Mois':
        setPeriod({
          start: now.subtract(1, 'month').startOf('month'),
          end: now.add(6, 'month').endOf('month')
        })
        break
    }
  }, [scale])
  
  // Calculer les divisions de temps selon l'échelle
  const timeUnits = React.useMemo(() => {
    const result = []
    let current: dayjs.Dayjs
    
    switch(scale) {
      case 'Jours':
        current = period.start.clone()
        while (current.isBefore(period.end) || current.isSame(period.end, 'day')) {
          result.push({
            start: current.clone(),
            end: current.clone().endOf('day'),
            label: current.format('DD'),
            subLabel: current.format('ddd'),
            isWeekend: [0, 6].includes(current.day())
          })
          current = current.add(1, 'day')
        }
        break
      
      case 'Semaines':
        current = period.start.clone().startOf('week')
        while (current.isBefore(period.end)) {
          result.push({
            start: current.clone(),
            end: current.clone().add(6, 'day'),
            label: `Sem ${current.week()}`,
            subLabel: `${current.format('DD/MM')} - ${current.add(6, 'day').format('DD/MM')}`,
            isWeekend: false
          })
          current = current.add(1, 'week')
        }
        break
      
      case 'Mois':
        current = period.start.clone().startOf('month')
        while (current.isBefore(period.end)) {
          const monthName = current.format('MMM')
          result.push({
            start: current.clone(),
            end: current.clone().endOf('month'),
            label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
            subLabel: current.format('YYYY'),
            isWeekend: false
          })
          current = current.add(1, 'month')
        }
        break
    }
    
    // Log pour déboguer
    console.log(`🔄 Échelle ${scale}: ${result.length} unités de temps générées`)
    if (result.length > 0) {
      console.log(`📅 Première unité: ${result[0].start.format('DD/MM/YYYY')} → ${result[0].end.format('DD/MM/YYYY')}`)
      console.log(`📅 Dernière unité: ${result[result.length - 1].start.format('DD/MM/YYYY')} → ${result[result.length - 1].end.format('DD/MM/YYYY')}`)
    }
    
    return result
  }, [period, scale])

  // Changer de période
  const goToPrevious = () => {
    switch(scale) {
      case 'Jours':
        setPeriod(prev => ({
          start: prev.start.subtract(14, 'day'),
          end: prev.end.subtract(14, 'day')
        }))
        break
      case 'Semaines':
        setPeriod(prev => ({
          start: prev.start.subtract(2, 'month'),
          end: prev.end.subtract(2, 'month')
        }))
        break
      case 'Mois':
        setPeriod(prev => ({
          start: prev.start.subtract(6, 'month'),
          end: prev.end.subtract(6, 'month')
        }))
        break
    }
  }
  
  const goToNext = () => {
    switch(scale) {
      case 'Jours':
        setPeriod(prev => ({
          start: prev.start.add(14, 'day'),
          end: prev.end.add(14, 'day')
        }))
        break
      case 'Semaines':
        setPeriod(prev => ({
          start: prev.start.add(2, 'month'),
          end: prev.end.add(2, 'month')
        }))
        break
      case 'Mois':
        setPeriod(prev => ({
          start: prev.start.add(6, 'month'),
          end: prev.end.add(6, 'month')
        }))
        break
    }
  }
  
  // Filtrer les chantiers selon l'état
  const filteredChantiers = chantiers.filter(
    chantier => filters[chantier.etat as keyof typeof filters]
  )
  
  // Exporter en PDF
  const handleExportPDF = async () => {
    try {
      console.log('📄 Export PDF du planning des chantiers...')
      
      const planningData = {
        chantiers: filteredChantiers,
        period: periodDisplay,
        scale,
        filters
      }

      const response = await fetch('/api/planning/gantt-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planningData)
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `Planning_Chantiers_${periodDisplay.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        console.log('✅ PDF exporté avec succès')
      } else {
        console.error('❌ Erreur lors de l\'export PDF')
        alert('Erreur lors de l\'export PDF')
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'export PDF:', error)
      alert('Erreur lors de l\'export PDF')
    }
  }
  
  // Afficher / masquer l'infobulle
  const showTooltip = (e: React.MouseEvent, chantier: Chantier) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({
      visible: true,
      chantier,
      position: { 
        x: rect.left + rect.width / 2, 
        y: rect.bottom 
      }
    })
  }
  
  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }))
  }
  
  // Affichage pendant le chargement
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }
  
  // Affichage quand pas de chantiers
  if (!chantiers.length) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-gray-500">Aucun chantier à afficher</div>
      </div>
    )
  }
  
  // Formater la période pour l'affichage
  const periodDisplay = `${period.start.format('DD MMM YYYY')} — ${period.end.format('DD MMM YYYY')}`
  
  const toggleFilter = (filter: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
    }))
  }
  
  const columnWidth = scale === 'Jours' ? 70 : scale === 'Semaines' ? 120 : 180
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Barre d'outils */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-wrap justify-between items-center">
          {/* Partie gauche: Navigation et période */}
          <div className="flex items-center">
            <button 
              onClick={goToPrevious}
              className="p-1 rounded hover:bg-gray-100" 
              aria-label="Période précédente"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
            </button>
            
            <span className="mx-2 text-sm font-medium">
              {periodDisplay}
            </span>
            
            <button 
              onClick={goToNext} 
              className="p-1 rounded hover:bg-gray-100"
              aria-label="Période suivante"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Partie centrale: Sélecteur d'échelle */}
          <div className="flex justify-center items-center space-x-3">
            <div className="inline-flex rounded-md border border-gray-300 overflow-hidden">
              {(['Jours', 'Semaines', 'Mois'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setScale(option)}
                  className={`px-4 py-2 text-sm ${
                    scale === option
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-md">
              Échelle: <span className="font-medium text-blue-600">{scale}</span>
            </div>
          </div>
          
          {/* Partie droite: Filtres et exportation */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {Object.entries(filters).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key as keyof typeof filters)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    value 
                      ? key === 'En préparation'
                        ? 'bg-yellow-100 text-yellow-800'
                        : key === 'En cours'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
            
            {/* Toggle pour afficher tous les chantiers */}
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showAllChantiers}
                  onChange={(e) => setShowAllChantiers(e.target.checked)}
                  className="mr-2"
                />
                Tout afficher ({filteredChantiers.length})
              </label>
            </div>
            
            {/* Bouton d'export PDF */}
            <button
              onClick={handleExportPDF}
              className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              title="Exporter en PDF"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export PDF
            </button>
            
          </div>
        </div>
      </div>
      
      {/* Contenu du planning */}
      <div id="gantt-chart" className="overflow-x-auto max-h-[48rem] overflow-y-auto">
        <div className="relative" style={{ minWidth: `${300 + (timeUnits.length * columnWidth)}px` }}>
          {/* Entête avec les unités de temps */}
          <div className="grid" style={{ 
            gridTemplateColumns: `300px repeat(${timeUnits.length}, ${columnWidth}px)` 
          }}>
            <div className="p-3 font-medium text-sm border-b border-r border-gray-200 bg-gray-100 w-full">
              Chantier
            </div>
            
            {timeUnits.map((unit, index) => (
              <div 
                key={index}
                className={`p-3 text-center border-b border-r border-gray-200 ${
                  unit.isWeekend ? 'bg-gray-100' : 'bg-gray-50'
                }`}
              >
                <div className="text-xs font-medium">{unit.label}</div>
                <div className="text-xs text-gray-500">{unit.subLabel}</div>
              </div>
            ))}
          </div>
          
          {/* Corps du tableau avec chantiers */}
          {filteredChantiers.map((chantier) => {
            const start = dayjs(chantier.start)
            const end = chantier.end ? dayjs(chantier.end) : start.add(30, 'day')
            
            // Vérifier si le chantier est dans la période visible (sauf si showAllChantiers est activé)
            if (!showAllChantiers && (end.isBefore(period.start) || start.isAfter(period.end))) {
              return null // Hors période, ne pas afficher
            }
            
            // Calculer la position relative de début
            let startPosition = 0;
            let startOffset = 0;
            
            // Trouver l'unité de temps contenant la date de début
            for (let i = 0; i < timeUnits.length; i++) {
              const unit = timeUnits[i];
              
              // Si la date de début est avant la période visible, positionner au début
              if (start.isBefore(period.start)) {
                startPosition = 0;
                startOffset = 0;
                break;
              }
              
              // Vérifier si la date est dans cette unité
              if (
                (scale === 'Jours' && start.isSame(unit.start, 'day')) ||
                (scale === 'Semaines' && start.isSameOrAfter(unit.start, 'day') && start.isSameOrBefore(unit.end, 'day')) ||
                (scale === 'Mois' && start.isSameOrAfter(unit.start, 'day') && start.isSameOrBefore(unit.end, 'day'))
              ) {
                startPosition = i;
                
                // Calculer le décalage à l'intérieur de l'unité de temps (pour un positionnement plus précis)
                if (scale === 'Jours') {
                  // Pour les jours, pas de décalage supplémentaire
                  startOffset = 0;
                } else if (scale === 'Semaines') {
                  // Pour les semaines, calculer position dans la semaine (0-6)
                  const dayInWeek = start.diff(unit.start, 'day');
                  startOffset = (dayInWeek / 7) * columnWidth;
                } else if (scale === 'Mois') {
                  // Pour les mois, calculer position dans le mois (0-30/31)
                  const daysInMonth = unit.end.date();
                  const dayInMonth = start.date() - 1; // 0-indexed
                  startOffset = (dayInMonth / daysInMonth) * columnWidth;
                }
                break;
              }
            }
            
            // Calculer la position relative de fin
            let endPosition = timeUnits.length - 1;
            let endOffset = columnWidth;
            
            // Trouver l'unité de temps contenant la date de fin
            for (let i = 0; i < timeUnits.length; i++) {
              const unit = timeUnits[i];
              
              // Si la date de fin est après la période visible, positionner à la fin
              if (end.isAfter(period.end)) {
                endPosition = timeUnits.length - 1;
                endOffset = columnWidth;
                break;
              }
              
              // Vérifier si la date est dans cette unité
              if (
                (scale === 'Jours' && end.isSame(unit.start, 'day')) ||
                (scale === 'Semaines' && end.isSameOrAfter(unit.start, 'day') && end.isSameOrBefore(unit.end, 'day')) ||
                (scale === 'Mois' && end.isSameOrAfter(unit.start, 'day') && end.isSameOrBefore(unit.end, 'day'))
              ) {
                endPosition = i;
                
                // Calculer le décalage à l'intérieur de l'unité de temps
                if (scale === 'Jours') {
                  // Pour les jours, utiliser toute la cellule
                  endOffset = columnWidth;
                } else if (scale === 'Semaines') {
                  // Pour les semaines, calculer position dans la semaine (0-6)
                  const dayInWeek = end.diff(unit.start, 'day');
                  endOffset = ((dayInWeek + 1) / 7) * columnWidth;
                } else if (scale === 'Mois') {
                  // Pour les mois, calculer position dans le mois (0-30/31)
                  const daysInMonth = unit.end.date();
                  const dayInMonth = end.date();
                  endOffset = (dayInMonth / daysInMonth) * columnWidth;
                }
                break;
              }
            }
            
            // Calculer la largeur et la position de la barre
            const barStartX = 300 + (startPosition * columnWidth) + startOffset;
            const barWidth = ((endPosition - startPosition) * columnWidth) + endOffset - startOffset;
            
            return (
              <div 
                key={chantier.id} 
                className="grid items-center relative" 
                style={{ 
                  gridTemplateColumns: `300px repeat(${timeUnits.length}, ${columnWidth}px)`,
                  height: '72px'
                }}
              >
                {/* Info chantier */}
                <div className="p-3 border-b border-r border-gray-200 w-full overflow-hidden">
                  <div className="text-sm font-medium truncate" title={chantier.title}>
                    {chantier.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={chantier.client}>
                    {chantier.client}
                  </div>
                  <div className="text-xs text-gray-400">
                    {dayjs(chantier.start).format('DD/MM/YY')} - {chantier.end ? dayjs(chantier.end).format('DD/MM/YY') : '?'}
                  </div>
                </div>
                
                {/* Cellules unités de temps */}
                {timeUnits.map((unit, index) => (
                  <div 
                    key={index} 
                    className={`border-b border-r border-gray-200 h-full ${
                      unit.isWeekend ? 'bg-gray-50' : ''
                    }`} 
                  />
                ))}
                
                {/* Barre du chantier */}
                <div
                  className={`absolute h-8 rounded shadow-sm cursor-pointer hover:opacity-90 ${
                    chantier.etat === 'En préparation'
                      ? 'bg-yellow-500'
                      : chantier.etat === 'En cours'
                        ? 'bg-blue-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    left: `${barStartX}px`,
                    width: `${Math.max(barWidth, 8)}px`, // Au moins 8px de large pour visibilité
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onMouseEnter={(e) => showTooltip(e, chantier)}
                  onMouseLeave={hideTooltip}
                >
                  <div className="h-full flex items-center justify-start px-3">
                    <span className="text-xs font-medium text-white truncate">
                      {chantier.title.length > 25 ? chantier.title.substring(0, 25) + '...' : chantier.title}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Infobulle flottante moderne simplifiée */}
      {tooltip.visible && tooltip.chantier && (
        <div 
          className="fixed bg-white dark:bg-gray-800 shadow-2xl rounded-xl p-6 w-80 border border-gray-200 dark:border-gray-700 z-[1000]"
          style={{
            left: `${tooltip.position.x}px`,
            top: `${tooltip.position.y + 8}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {/* En-tête simplifié */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                tooltip.chantier.etat === 'En préparation'
                  ? 'bg-yellow-500'
                  : tooltip.chantier.etat === 'En cours'
                    ? 'bg-blue-500'
                    : 'bg-green-500'
              }`}></div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">
                {tooltip.chantier.title}
              </h3>
            </div>
            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
              tooltip.chantier.etat === 'En préparation'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                : tooltip.chantier.etat === 'En cours'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            }`}>
              {tooltip.chantier.etat === 'En préparation' ? '⏳' : tooltip.chantier.etat === 'En cours' ? '⚡' : '✅'} {tooltip.chantier.etat}
            </div>
          </div>

          {/* Client */}
          <div className="flex items-center mb-4 text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">👤 {tooltip.chantier.client}</span>
          </div>

          {/* Informations organisées */}
          <div className="space-y-4">
            {/* Période */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Période</span>
                </div>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {tooltip.chantier.dureeEnJours || (tooltip.chantier.end ? dayjs(tooltip.chantier.end).diff(dayjs(tooltip.chantier.start), 'day') : '?')} jours
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Début :</span>
                  <span className="font-medium">{dayjs(tooltip.chantier.start).format('DD/MM/YYYY')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fin :</span>
                  <span className="font-medium">{tooltip.chantier.end ? dayjs(tooltip.chantier.end).format('DD/MM/YYYY') : 'Non définie'}</span>
                </div>
              </div>
            </div>

            {/* Montant */}
            {tooltip.chantier.montant && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Montant</span>
                </div>
                <span className="font-bold text-emerald-800 dark:text-emerald-200">
                  {tooltip.chantier.montant.toLocaleString('fr-FR')} €
                </span>
              </div>
            )}
            
            {/* Adresse */}
            {tooltip.chantier.adresse && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-start">
                  <svg className="w-4 h-4 mr-2 text-gray-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Adresse</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tooltip.chantier.adresse}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Flèche du tooltip */}
          <div className="absolute h-3 w-3 bg-white dark:bg-gray-800 transform rotate-45 border-t border-l border-gray-200 dark:border-gray-700"
               style={{ top: '-6px', left: '50%', marginLeft: '-6px' }}></div>
        </div>
      )}
    </div>
  )
}

export default GanttChart 
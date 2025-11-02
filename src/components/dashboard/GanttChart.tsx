import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isToday from 'dayjs/plugin/isToday'
import 'dayjs/locale/fr'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

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
  
  // État pour la recherche
  const [searchTerm, setSearchTerm] = useState('')
  
  // État pour le panneau de filtres
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  
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
  
  // Filtrer les chantiers selon l'état et la recherche
  const filteredChantiers = chantiers.filter(chantier => {
    const matchesFilter = filters[chantier.etat as keyof typeof filters]
    const matchesSearch = searchTerm === '' || 
      chantier.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chantier.client.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })
  
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
    <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
      {/* Barre d'outils moderne */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="p-6 space-y-4">
          {/* Ligne 1: Navigation temporelle et recherche */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Navigation temporelle avec design moderne */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button 
                  onClick={goToPrevious}
                  className="p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-600 transition-all duration-200 group" 
                  aria-label="Période précédente"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </button>
                
                <div className="px-6 py-3 border-x border-gray-200 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-600 dark:to-gray-600">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Période</div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    {periodDisplay}
                  </div>
                </div>
                
                <button 
                  onClick={goToNext} 
                  className="p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-600 transition-all duration-200 group"
                  aria-label="Période suivante"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </button>
              </div>
              
              {/* Badge du jour actuel */}
              <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg">
                <div className="text-xs font-semibold">Aujourd'hui</div>
                <div className="text-sm font-bold">{dayjs().format('DD MMM YYYY')}</div>
              </div>
            </div>

            {/* Barre de recherche moderne */}
            <div className="flex-1 max-w-md">
              <div className="relative group">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un chantier ou client..."
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm font-medium placeholder:text-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg font-semibold text-sm transition-all duration-200 ${
                  showFiltersPanel
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                Filtres
                <span className="px-2 py-0.5 bg-white/20 dark:bg-black/20 rounded-full text-xs">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              </button>
              
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm transition-all duration-200"
                title="Exporter en PDF"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export PDF
              </button>
            </div>
          </div>

          {/* Ligne 2: Échelle et filtres (si panneau ouvert) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Sélecteur d'échelle avec design pills moderne */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl">
                <AdjustmentsHorizontalIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Échelle</span>
              </div>
              <div className="inline-flex bg-white dark:bg-gray-700 rounded-xl shadow-lg p-1 border border-gray-200 dark:border-gray-600">
                {(['Jours', 'Semaines', 'Mois'] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() => setScale(option)}
                    className={`relative px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      scale === option
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Panneau de filtres élégant */}
            {showFiltersPanel && (
              <div className="flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600 animate-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">États:</span>
                  {Object.entries(filters).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => toggleFilter(key as keyof typeof filters)}
                      className={`group relative px-4 py-2 text-xs font-bold rounded-lg transition-all duration-300 overflow-hidden ${
                        value 
                          ? key === 'En préparation'
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg shadow-yellow-500/30 scale-105'
                            : key === 'En cours'
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 scale-105'
                          : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
                      }`}
                    >
                      <span className="relative z-10 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${value ? 'bg-white' : 'bg-gray-400'}`}></span>
                        {key}
                      </span>
                    </button>
                  ))}
                </div>
                
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors">
                  <input
                    type="checkbox"
                    checked={showAllChantiers}
                    onChange={(e) => setShowAllChantiers(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Tout afficher ({filteredChantiers.length} / {chantiers.length})
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Contenu du planning moderne */}
      <div id="gantt-chart" className="overflow-x-auto max-h-[48rem] overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
        <div className="relative" style={{ minWidth: `${350 + (timeUnits.length * columnWidth)}px` }}>
          {/* En-tête moderne avec les unités de temps */}
          <div className="sticky top-0 z-20 grid shadow-lg" style={{ 
            gridTemplateColumns: `350px repeat(${timeUnits.length}, ${columnWidth}px)` 
          }}>
            <div className="p-4 font-bold text-sm bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 border-b-2 border-r-2 border-gray-300 dark:border-gray-600 w-full backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-gray-800 dark:text-white uppercase tracking-wide">Chantiers</span>
              </div>
            </div>
            
            {timeUnits.map((unit, index) => {
              const isToday = dayjs().isSame(unit.start, scale === 'Jours' ? 'day' : scale === 'Semaines' ? 'week' : 'month')
              return (
                <div 
                  key={index}
                  className={`relative p-3 text-center border-b-2 border-r border-gray-300 dark:border-gray-600 backdrop-blur-sm transition-all duration-200 ${
                    isToday 
                      ? 'bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/30 shadow-inner' 
                      : unit.isWeekend 
                        ? 'bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-600' 
                        : 'bg-gradient-to-b from-white to-gray-50 dark:from-gray-600 dark:to-gray-700'
                  }`}
                >
                  {isToday && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  )}
                  <div className={`text-xs font-bold uppercase tracking-wider ${isToday ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {unit.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isToday ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>
                    {unit.subLabel}
                  </div>
                  {isToday && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Corps du tableau avec chantiers modernes */}
          {filteredChantiers.map((chantier, chantierId) => {
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
            const barStartX = 350 + (startPosition * columnWidth) + startOffset;
            const barWidth = ((endPosition - startPosition) * columnWidth) + endOffset - startOffset;
            
            // Obtenir le statut et les couleurs
            const getStatusStyles = (etat: string) => {
              switch (etat) {
                case 'En préparation':
                  return {
                    gradient: 'from-amber-400 via-yellow-500 to-amber-500',
                    glow: 'shadow-amber-500/30',
                    icon: '⏳',
                    text: 'text-amber-900'
                  }
                case 'En cours':
                  return {
                    gradient: 'from-blue-500 via-indigo-600 to-blue-600',
                    glow: 'shadow-blue-500/30',
                    icon: '🚧',
                    text: 'text-blue-900'
                  }
                case 'Terminé':
                  return {
                    gradient: 'from-emerald-500 via-teal-600 to-emerald-600',
                    glow: 'shadow-emerald-500/30',
                    icon: '✅',
                    text: 'text-emerald-900'
                  }
                default:
                  return {
                    gradient: 'from-gray-400 to-gray-500',
                    glow: 'shadow-gray-500/30',
                    icon: '❓',
                    text: 'text-gray-900'
                  }
              }
            }

            const statusStyles = getStatusStyles(chantier.etat)

            return (
              <div 
                key={chantier.id} 
                className={`grid items-center relative group hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent dark:hover:from-blue-900/10 transition-all duration-200 ${chantierId % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-850/50'}`}
                style={{ 
                  gridTemplateColumns: `350px repeat(${timeUnits.length}, ${columnWidth}px)`,
                  height: '88px'
                }}
              >
                {/* Info chantier moderne */}
                <div className="relative p-4 border-b border-r border-gray-200/50 dark:border-gray-700/50 w-full overflow-hidden">
                  <div className="flex items-start gap-3">
                    {/* Badge de statut */}
                    <div className={`flex-shrink-0 w-10 h-10 bg-gradient-to-br ${statusStyles.gradient} rounded-xl flex items-center justify-center text-lg shadow-lg ${statusStyles.glow} group-hover:scale-110 transition-transform duration-200`}>
                      {statusStyles.icon}
                    </div>
                    
                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={chantier.title}>
                        {chantier.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="truncate font-medium" title={chantier.client}>{chantier.client}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-semibold">{dayjs(chantier.start).format('DD/MM')}</span>
                          <span>→</span>
                          <span className="font-semibold">{chantier.end ? dayjs(chantier.end).format('DD/MM') : '?'}</span>
                        </div>
                        {chantier.dureeEnJours && (
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-bold">
                            {chantier.dureeEnJours}j
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Cellules unités de temps avec marqueurs aujourd'hui */}
                {timeUnits.map((unit, index) => {
                  const isToday = dayjs().isSame(unit.start, scale === 'Jours' ? 'day' : scale === 'Semaines' ? 'week' : 'month')
                  return (
                    <div 
                      key={index} 
                      className={`relative border-b border-r border-gray-200/30 dark:border-gray-700/30 h-full transition-colors ${
                        isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : unit.isWeekend ? 'bg-gray-100/30 dark:bg-gray-700/30' : ''
                      }`}
                    >
                      {isToday && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-blue-400 via-blue-600 to-blue-400 opacity-50"></div>
                      )}
                    </div>
                  )
                })}
                
                {/* Barre du chantier moderne */}
                <div
                  className={`absolute h-10 rounded-xl cursor-pointer transition-all duration-300 bg-gradient-to-r ${statusStyles.gradient} shadow-xl ${statusStyles.glow} hover:shadow-2xl hover:scale-105 hover:z-10 group/bar`}
                  style={{
                    left: `${barStartX}px`,
                    width: `${Math.max(barWidth, 12)}px`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                  onMouseEnter={(e) => showTooltip(e, chantier)}
                  onMouseLeave={hideTooltip}
                >
                  {/* Effet brillant */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-xl"></div>
                  
                  {/* Contenu */}
                  <div className="relative h-full flex items-center justify-between px-3 gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs font-bold text-white truncate drop-shadow-lg">
                        {chantier.title.length > 20 ? chantier.title.substring(0, 20) + '...' : chantier.title}
                      </span>
                    </div>
                    
                    {/* Indicateur de progression si montant disponible */}
                    {chantier.montant && (
                      <div className="flex-shrink-0 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center group-hover/bar:bg-white/30 transition-colors">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Bordure animée au hover */}
                  <div className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover/bar:border-white/50 transition-all duration-300"></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Infobulle flottante ultra-moderne */}
      {tooltip.visible && tooltip.chantier && (
        <div 
          className="fixed z-[1000] animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{
            left: `${tooltip.position.x}px`,
            top: `${tooltip.position.y + 12}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="relative bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl rounded-2xl p-6 w-96 border-2 border-gray-200/50 dark:border-gray-700/50">
            {/* Flèche moderne */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="w-6 h-6 bg-white dark:bg-gray-900 border-l-2 border-t-2 border-gray-200/50 dark:border-gray-700/50 rotate-45 backdrop-blur-xl"></div>
            </div>

            {/* En-tête avec gradient et icône */}
            <div className="relative mb-5 pb-4 border-b-2 border-gray-100 dark:border-gray-800">
              <div className="flex items-start gap-4">
                {/* Badge de statut grand */}
                <div className={`flex-shrink-0 w-14 h-14 bg-gradient-to-br ${
                  tooltip.chantier.etat === 'En préparation'
                    ? 'from-amber-400 via-yellow-500 to-amber-500 shadow-amber-500/30'
                    : tooltip.chantier.etat === 'En cours'
                      ? 'from-blue-500 via-indigo-600 to-blue-600 shadow-blue-500/30'
                      : 'from-emerald-500 via-teal-600 to-emerald-600 shadow-emerald-500/30'
                } rounded-2xl flex items-center justify-center text-2xl shadow-xl animate-pulse`}>
                  {tooltip.chantier.etat === 'En préparation' ? '⏳' : tooltip.chantier.etat === 'En cours' ? '🚧' : '✅'}
                </div>
                
                {/* Titre et badge */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2 leading-tight">
                    {tooltip.chantier.title}
                  </h3>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg ${
                    tooltip.chantier.etat === 'En préparation'
                      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white'
                      : tooltip.chantier.etat === 'En cours'
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                  }`}>
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    {tooltip.chantier.etat}
                  </div>
                </div>
              </div>
            </div>

            {/* Client */}
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Client</div>
                  <div className="font-bold text-gray-900 dark:text-white truncate">{tooltip.chantier.client}</div>
                </div>
              </div>
            </div>

            {/* Informations en grille moderne */}
            <div className="space-y-3">
              {/* Période avec design moderne */}
              <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-inner">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Durée</span>
                  </div>
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg text-xs font-bold shadow-lg">
                    {tooltip.chantier.dureeEnJours || (tooltip.chantier.end ? dayjs(tooltip.chantier.end).diff(dayjs(tooltip.chantier.start), 'day') : '?')} jours
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Début</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{dayjs(tooltip.chantier.start).format('DD/MM/YYYY')}</div>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg p-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fin</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{tooltip.chantier.end ? dayjs(tooltip.chantier.end).format('DD/MM/YYYY') : 'Non définie'}</div>
                  </div>
                </div>
              </div>

              {/* Montant avec design premium */}
              {tooltip.chantier.montant && (
                <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/30 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Montant Total</div>
                        <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                          {tooltip.chantier.montant.toLocaleString('fr-FR')} €
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Adresse avec icône de localisation */}
              {tooltip.chantier.adresse && (
                <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-orange-700 dark:text-orange-300 uppercase tracking-wider mb-1">Localisation</div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{tooltip.chantier.adresse}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Effet de brillance */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GanttChart 
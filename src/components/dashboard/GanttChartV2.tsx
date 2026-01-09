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
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

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

interface GanttChartV2Props {
  chantiers: Chantier[]
  loading?: boolean
}

// 🎨 PALETTE "NATURE MODERNE"
// En préparation: Sage (#10B981)
// En cours: Terracotta (#DC2626)
// Terminé: Charbon (#374151)
// Accent: Miel (#F59E0B)

const GanttChartV2: React.FC<GanttChartV2Props> = ({ chantiers, loading = false }) => {
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
  
  // État pour la recherche
  const [searchTerm, setSearchTerm] = useState('')
  
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
            label: `S${current.week()}`,
            subLabel: `${current.format('DD/MM')}`,
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
    
    // Vérifier si dans la période visible
    const start = dayjs(chantier.start)
    const end = chantier.end ? dayjs(chantier.end) : start.add(30, 'day')
    const isInPeriod = !(end.isBefore(period.start) || start.isAfter(period.end))
    
    return matchesFilter && matchesSearch && isInPeriod
  })
  
  // Exporter en PDF
  const handleExportPDF = async () => {
    try {
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
        a.download = `Planning_Nature_${periodDisplay.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        toast.success('PDF exporté avec succès')
      } else {
        toast.error('Erreur lors de l\'export PDF')
      }
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error)
      toast.error('Erreur lors de l\'export PDF')
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
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-6 bg-gray-200 rounded mb-2"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    )
  }
  
  // Affichage quand pas de chantiers
  if (!chantiers.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
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
  
  // Largeurs de colonnes
  const columnWidth = scale === 'Jours' ? 70 : scale === 'Semaines' ? 120 : 180
  
  // 🎨 Obtenir les styles selon le statut - PALETTE NATURE MODERNE
  const getStatusConfig = (etat: string) => {
    switch (etat) {
      case 'En préparation':
        return {
          color: 'bg-emerald-500',     // Sage
          text: 'text-emerald-700',
          bgLight: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        }
      case 'En cours':
        return {
          color: 'bg-red-600',         // Terracotta
          text: 'text-red-700',
          bgLight: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          dot: 'bg-red-600'
        }
      case 'Terminé':
        return {
          color: 'bg-gray-700',        // Charbon
          text: 'text-gray-700',
          bgLight: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          dot: 'bg-gray-700'
        }
      default:
        return {
          color: 'bg-gray-500',
          text: 'text-gray-700',
          bgLight: 'bg-gray-50 dark:bg-gray-900/20',
          border: 'border-gray-200 dark:border-gray-800',
          dot: 'bg-gray-500'
        }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">

      {/* Barre d'outils compacte */}
      <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="p-4 space-y-3">
          {/* Ligne 1: Navigation et contrôles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Navigation temporelle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                <button 
                  onClick={goToPrevious}
                  className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                  aria-label="Période précédente"
                >
                  <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
                
                <div className="px-4 py-2 border-x border-gray-200 dark:border-gray-600">
                  <div className="text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                    {periodDisplay}
                  </div>
                </div>
                
                <button 
                  onClick={goToNext} 
                  className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  aria-label="Période suivante"
                >
                  <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
              </div>
              
              {/* Badge aujourd'hui - Accent OR ROSE */}
              <div className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold">
                {dayjs().format('DD MMM')}
              </div>
            </div>

            {/* Recherche */}
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Export - Accent OR ROSE */}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Ligne 2: Échelle et filtres */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Échelle - Accent EMERALD */}
            <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg shadow-sm p-0.5 border border-gray-200 dark:border-gray-600">
              {(['Jours', 'Semaines', 'Mois'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setScale(option)}
                  className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    scale === option
                      ? 'bg-emerald-500 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            
            {/* Filtres */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Afficher:</span>
              {Object.entries(filters).map(([key, value]) => {
                const config = getStatusConfig(key)
                return (
                  <button
                    key={key}
                    onClick={() => toggleFilter(key as keyof typeof filters)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      value 
                        ? `${config.color} text-white border-transparent`
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${value ? 'bg-white' : config.dot}`}></span>
                    {key}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tableau Gantt */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <div className="relative" style={{ minWidth: `${320 + (timeUnits.length * columnWidth)}px` }}>
          {/* En-tête */}
          <div className="sticky top-0 z-20 grid bg-gray-50 dark:bg-gray-900 border-b-2 border-gray-300 dark:border-gray-600" style={{ 
            gridTemplateColumns: `320px repeat(${timeUnits.length}, ${columnWidth}px)` 
          }}>
            <div className="px-4 py-3 font-semibold text-xs text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
              Chantier
            </div>
            
            {timeUnits.map((unit, index) => {
              const isToday = dayjs().isSame(unit.start, scale === 'Jours' ? 'day' : scale === 'Semaines' ? 'week' : 'month')
              return (
                <div 
                  key={index}
                  className={`px-2 py-2 text-center border-r border-gray-200 dark:border-gray-700 ${
                    isToday 
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-b-2 border-b-amber-500' 
                      : unit.isWeekend 
                        ? 'bg-gray-100 dark:bg-gray-800' 
                        : 'bg-gray-50 dark:bg-gray-900'
                  }`}
                >
                  <div className={`text-xs font-semibold ${isToday ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {unit.label}
                  </div>
                  <div className={`text-[10px] ${isToday ? 'text-amber-500 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {unit.subLabel}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Lignes de chantiers */}
          {filteredChantiers.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Aucun chantier ne correspond aux filtres sélectionnés
            </div>
          ) : (
            filteredChantiers.map((chantier, index) => {
              const start = dayjs(chantier.start)
              const end = chantier.end ? dayjs(chantier.end) : start.add(30, 'day')
              
              // Calculer les positions
              let startPosition = 0;
              let startOffset = 0;
              
              for (let i = 0; i < timeUnits.length; i++) {
                const unit = timeUnits[i];
                
                if (start.isBefore(period.start)) {
                  startPosition = 0;
                  startOffset = 0;
                  break;
                }
                
                if (
                  (scale === 'Jours' && start.isSame(unit.start, 'day')) ||
                  (scale === 'Semaines' && start.isSameOrAfter(unit.start, 'day') && start.isSameOrBefore(unit.end, 'day')) ||
                  (scale === 'Mois' && start.isSameOrAfter(unit.start, 'day') && start.isSameOrBefore(unit.end, 'day'))
                ) {
                  startPosition = i;
                  
                  if (scale === 'Semaines') {
                    const dayInWeek = start.diff(unit.start, 'day');
                    startOffset = (dayInWeek / 7) * columnWidth;
                  } else if (scale === 'Mois') {
                    const daysInMonth = unit.end.date();
                    const dayInMonth = start.date() - 1;
                    startOffset = (dayInMonth / daysInMonth) * columnWidth;
                  }
                  break;
                }
              }
              
              let endPosition = timeUnits.length - 1;
              let endOffset = columnWidth;
              
              for (let i = 0; i < timeUnits.length; i++) {
                const unit = timeUnits[i];
                
                if (end.isAfter(period.end)) {
                  endPosition = timeUnits.length - 1;
                  endOffset = columnWidth;
                  break;
                }
                
                if (
                  (scale === 'Jours' && end.isSame(unit.start, 'day')) ||
                  (scale === 'Semaines' && end.isSameOrAfter(unit.start, 'day') && end.isSameOrBefore(unit.end, 'day')) ||
                  (scale === 'Mois' && end.isSameOrAfter(unit.start, 'day') && end.isSameOrBefore(unit.end, 'day'))
                ) {
                  endPosition = i;
                  
                  if (scale === 'Jours') {
                    endOffset = columnWidth;
                  } else if (scale === 'Semaines') {
                    const dayInWeek = end.diff(unit.start, 'day');
                    endOffset = ((dayInWeek + 1) / 7) * columnWidth;
                  } else if (scale === 'Mois') {
                    const daysInMonth = unit.end.date();
                    const dayInMonth = end.date();
                    endOffset = (dayInMonth / daysInMonth) * columnWidth;
                  }
                  break;
                }
              }
              
              const barStartX = 320 + (startPosition * columnWidth) + startOffset;
              const barWidth = ((endPosition - startPosition) * columnWidth) + endOffset - startOffset;
              const statusConfig = getStatusConfig(chantier.etat)

              return (
                <div 
                  key={chantier.id} 
                  className={`grid items-center relative hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-850'}`}
                  style={{ 
                    gridTemplateColumns: `320px repeat(${timeUnits.length}, ${columnWidth}px)`,
                    height: '60px'
                  }}
                >
                  {/* Info chantier */}
                  <div className="px-4 py-2 border-b border-r border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${statusConfig.dot} flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {chantier.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {chantier.client}
                      </div>
                    </div>
                  </div>
                  
                  {/* Cellules de temps */}
                  {timeUnits.map((unit, idx) => {
                    const isToday = dayjs().isSame(unit.start, scale === 'Jours' ? 'day' : scale === 'Semaines' ? 'week' : 'month')
                    return (
                      <div 
                        key={idx} 
                        className={`relative border-b border-r border-gray-200 dark:border-gray-700 h-full ${
                          isToday ? 'bg-amber-50/50 dark:bg-amber-900/10' : unit.isWeekend ? 'bg-gray-50 dark:bg-gray-800/30' : ''
                        }`}
                      >
                        {isToday && (
                          <div className="absolute inset-y-0 left-0 w-0.5 bg-amber-500/40"></div>
                        )}
                      </div>
                    )
                  })}
                  
                  {/* Barre du chantier */}
                  <div
                    className={`absolute h-6 rounded cursor-pointer transition-all ${statusConfig.color} opacity-90 hover:opacity-100 hover:h-7`}
                    style={{
                      left: `${barStartX}px`,
                      width: `${Math.max(barWidth, 12)}px`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                    onMouseEnter={(e) => showTooltip(e, chantier)}
                    onMouseLeave={hideTooltip}
                  >
                    <div className="h-full flex items-center px-2">
                      <span className="text-xs font-medium text-white truncate">
                        {barWidth > 80 ? chantier.title.substring(0, 15) + (chantier.title.length > 15 ? '...' : '') : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Infobulle compacte */}
      {tooltip.visible && tooltip.chantier && (
        <div 
          className="fixed z-[1000] pointer-events-none"
          style={{
            left: `${tooltip.position.x}px`,
            top: `${tooltip.position.y + 8}px`,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-80 border border-gray-200 dark:border-gray-700">
            {/* En-tête */}
            <div className="flex items-start gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
              <div className={`w-3 h-3 rounded-full ${getStatusConfig(tooltip.chantier.etat).dot} mt-1`}></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {tooltip.chantier.title}
                </h3>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${getStatusConfig(tooltip.chantier.etat).color} text-white`}>
                  {tooltip.chantier.etat}
                </span>
              </div>
            </div>

            {/* Infos */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-gray-900 dark:text-white font-medium">{tooltip.chantier.client}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-600 dark:text-gray-300">
                  {dayjs(tooltip.chantier.start).format('DD/MM/YYYY')} → {tooltip.chantier.end ? dayjs(tooltip.chantier.end).format('DD/MM/YYYY') : 'Non définie'}
                </span>
              </div>
              
              {tooltip.chantier.dureeEnJours && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300">
                    {tooltip.chantier.dureeEnJours} jours
                  </span>
                </div>
              )}
              
              {tooltip.chantier.montant && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {tooltip.chantier.montant.toLocaleString('fr-FR')} €
                  </span>
                </div>
              )}
              
              {tooltip.chantier.adresse && (
                <div className="flex items-start gap-2 pt-2">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-gray-600 dark:text-gray-300 text-xs">
                    {tooltip.chantier.adresse}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GanttChartV2

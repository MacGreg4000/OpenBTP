'use client'

import { useState } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

export default function MiniCalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const generateCalendar = (month: number, year: number) => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // Jours du mois précédent
    const prevMonth = new Date(year, month - 1, 0)
    const daysInPrevMonth = prevMonth.getDate()
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month - 1, daysInPrevMonth - i)
      })
    }
    
    // Jours du mois actuel
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      days.push({
        day,
        isCurrentMonth: true,
        isToday: isToday(date),
        date
      })
    }
    
    // Jours du mois suivant pour compléter
    const remainingCells = 42 - days.length // 6 rangées × 7 jours
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isToday: false,
        date: new Date(year, month + 1, day)
      })
    }
    
    return days
  }

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const days = generateCalendar(currentDate.getMonth(), currentDate.getFullYear())

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden h-full flex flex-col border border-gray-200 dark:border-gray-700">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Calendrier
          </h3>
          <button
            onClick={goToToday}
            className="text-sm px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            Aujourd&apos;hui
          </button>
        </div>
      </div>

      {/* Navigation du calendrier */}
      <div className="px-6 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
        
        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h4>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Grille du calendrier */}
      <div className="p-4 flex-grow">
        {/* Noms des jours */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(name => (
            <div key={name} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
              {name}
            </div>
          ))}
        </div>

        {/* Jours du mois */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => (
            <button
              key={index}
              onClick={() => setSelectedDate(day.date)}
              className={`
                relative p-2 text-sm rounded-lg transition-all duration-200 hover:bg-gray-50 dark:hover:bg-gray-700
                ${day.isCurrentMonth 
                  ? 'text-gray-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-900/30' 
                  : 'text-gray-400 dark:text-gray-600'
                }
                ${day.isToday ? 'bg-blue-100 text-blue-600 font-semibold ring-2 ring-blue-500 ring-opacity-50' : ''}
                ${isSelected(day.date) ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300' : ''}
              `}
            >
              <span className="relative z-10">{day.day}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Information sur l&apos;intégration */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p className="font-medium mb-1">Intégration calendrier</p>
          <p className="text-xs">
            L&apos;intégration directe avec iCloud n&apos;est pas disponible pour des raisons de sécurité. 
            Vous pouvez consulter votre calendrier Apple séparément.
          </p>
        </div>
      </div>
    </div>
  )
} 
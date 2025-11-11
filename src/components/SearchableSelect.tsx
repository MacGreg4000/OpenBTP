'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export interface SearchableSelectOption {
  value: string | number | null
  label: string
  subtitle?: string
  disabled?: boolean
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string | number | null
  onChange: (value: string | number | null) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  showAllOption?: boolean
  allOptionLabel?: string
  renderOption?: (option: SearchableSelectOption) => React.ReactNode
  colorScheme?: 'purple' | 'orange' | 'blue' | 'green'
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner...',
  searchPlaceholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat trouvé',
  className = '',
  disabled = false,
  showAllOption = true,
  allOptionLabel = 'Tous',
  renderOption,
  colorScheme = 'purple'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Couleurs dynamiques selon le colorScheme
  const colors = {
    purple: {
      ring: 'focus:ring-purple-500',
      border: 'focus:border-purple-500',
      hoverFrom: 'hover:from-purple-50 hover:to-indigo-50 dark:hover:from-purple-900/20 dark:hover:to-indigo-900/20',
      selectedFrom: 'from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30',
      selectedText: 'text-purple-700 dark:text-purple-300'
    },
    orange: {
      ring: 'focus:ring-orange-500',
      border: 'focus:border-orange-500',
      hoverFrom: 'hover:from-orange-50 hover:to-red-50 dark:hover:from-orange-900/20 dark:hover:to-red-900/20',
      selectedFrom: 'from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30',
      selectedText: 'text-orange-700 dark:text-orange-300'
    },
    blue: {
      ring: 'focus:ring-blue-500',
      border: 'focus:border-blue-500',
      hoverFrom: 'hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-900/20 dark:hover:to-cyan-900/20',
      selectedFrom: 'from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30',
      selectedText: 'text-blue-700 dark:text-blue-300'
    },
    green: {
      ring: 'focus:ring-green-500',
      border: 'focus:border-green-500',
      hoverFrom: 'hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-900/20 dark:hover:to-emerald-900/20',
      selectedFrom: 'from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30',
      selectedText: 'text-green-700 dark:text-green-300'
    }
  }

  const currentColors = colors[colorScheme]

  // Filtrer les options selon le terme de recherche
  const filteredOptions = options.filter(option => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      option.label.toLowerCase().includes(search) ||
      (option.subtitle && option.subtitle.toLowerCase().includes(search))
    )
  })

  // Trouver l'option sélectionnée
  const selectedOption = options.find(opt => opt.value === value)

  // Fermer le dropdown quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus sur l'input quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSelect = (selectedValue: string | number | null) => {
    onChange(selectedValue)
    setIsOpen(false)
    setSearchTerm('')
  }

  const displayLabel = selectedOption ? selectedOption.label : placeholder

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 ${currentColors.ring} ${currentColors.border} transition-all duration-200 ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span className="truncate text-left">{displayLabel}</span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 flex-shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl shadow-2xl max-h-80 flex flex-col overflow-hidden">
          {/* Champ de recherche */}
          <div className="p-2 border-b-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${currentColors.ring} ${currentColors.border} transition-all duration-200`}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Liste des options */}
          <div className="overflow-y-auto max-h-64">
            {showAllOption && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gradient-to-r ${currentColors.hoverFrom} transition-all duration-200 ${
                  value === null
                    ? `bg-gradient-to-r ${currentColors.selectedFrom} ${currentColors.selectedText} font-semibold`
                    : 'text-gray-900 dark:text-white'
                }`}
              >
                {allOptionLabel}
              </button>
            )}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = value === option.value
                const isDisabled = option.disabled

                if (renderOption) {
                  return (
                    <div
                      key={`${option.value}-${index}`}
                      onClick={() => !isDisabled && handleSelect(option.value)}
                      className={`cursor-pointer ${
                        isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {renderOption(option)}
                    </div>
                  )
                }

                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    onClick={() => !isDisabled && handleSelect(option.value)}
                    disabled={isDisabled}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-gradient-to-r ${currentColors.hoverFrom} transition-all duration-200 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
                      isSelected
                        ? `bg-gradient-to-r ${currentColors.selectedFrom} ${currentColors.selectedText} font-semibold`
                        : 'text-gray-900 dark:text-white'
                    } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">{option.label}</div>
                    {option.subtitle && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.subtitle}
                      </div>
                    )}
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-2.5 text-sm text-gray-500 dark:text-gray-400 text-center">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface SearchFilterOption {
  value: string | number | null
  label: string
  subtitle?: string
}

interface SearchFilterProps {
  options: SearchFilterOption[]
  value: string | number | null
  onChange: (value: string | number | null) => void
  placeholder?: string
  emptyMessage?: string
  className?: string
  allOptionLabel?: string
  showAllOption?: boolean
  renderOption?: (option: SearchFilterOption) => React.ReactNode
}

export function SearchFilter({
  options,
  value,
  onChange,
  placeholder = 'Rechercher...',
  emptyMessage = 'Aucun résultat trouvé',
  className = '',
  allOptionLabel = 'Tous',
  showAllOption = true,
  renderOption
}: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Fermer la liste quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSelect = (selectedValue: string | number | null) => {
    onChange(selectedValue)
    setSearchTerm('')
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setSearchTerm('')
    onChange(null)
    inputRef.current?.focus()
  }

  // Afficher le terme de recherche s'il existe, sinon la valeur sélectionnée, sinon rien
  const inputValue = searchTerm || (selectedOption ? selectedOption.label : '')

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            // Si on efface tout, réinitialiser la sélection
            if (e.target.value === '') {
              onChange(null)
            }
          }}
          onFocus={() => {
            setIsOpen(true)
            // Si une valeur est sélectionnée et qu'on n'a pas de terme de recherche, on peut commencer à chercher
            if (selectedOption && !searchTerm) {
              // On garde la valeur affichée mais on peut la modifier
            }
          }}
          onBlur={() => {
            // Ne pas fermer immédiatement pour permettre le clic sur une option
            setTimeout(() => {
              setIsOpen(false)
              // Si on n'a pas de terme de recherche, réafficher la valeur sélectionnée
              if (!searchTerm && selectedOption) {
                // La valeur sera automatiquement réaffichée via inputValue
              }
            }, 200)
          }}
          className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        />
        {(searchTerm || selectedOption) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Effacer"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Liste des résultats filtrés */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {showAllOption && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                value === null
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-gray-900 dark:text-white'
              }`}
            >
              {allOptionLabel}
            </button>
          )}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => {
              const isSelected = value === option.value

              if (renderOption) {
                return (
                  <div
                    key={`${option.value}-${index}`}
                    onClick={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    {renderOption(option)}
                  </div>
                )
              }

              return (
                <button
                  key={`${option.value}-${index}`}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border-b border-gray-200 dark:border-gray-600 last:border-b-0 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-900 dark:text-white'
                  }`}
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
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}


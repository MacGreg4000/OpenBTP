'use client'

import React, { useState } from 'react'

interface NumericInputProps {
  value: number | null | undefined
  onChangeNumber: (value: number) => void
  step?: number | string
  min?: number | string
  className?: string
  placeholder?: string
  disabled?: boolean
  name?: string
  id?: string
  onBlur?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export default function NumericInput({
  value,
  onChangeNumber,
  step = '0.01',
  min,
  className = '',
  placeholder,
  disabled,
  name,
  id,
  onBlur,
  onKeyDown,
}: NumericInputProps) {
  const [editingValue, setEditingValue] = useState<string | undefined>(undefined)

  const displayValue = editingValue !== undefined
    ? editingValue
    : value === null || value === undefined
      ? ''
      : String(value)

  return (
    <input
      type="number"
      name={name}
      id={id}
      step={step as string}
      min={min as string | undefined}
      className={className}
      value={displayValue}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={(e) => {
        // Conserver la valeur actuelle pour édition
        const current = value ?? 0
        setEditingValue(String(current))
        // Sélectionner tout le texte pour édition rapide
        requestAnimationFrame(() => {
          try { e.target.select() } catch {}
        })
      }}
      onChange={(e) => {
        const str = e.target.value
        setEditingValue(str)
        
        // Ne pas déclencher onChangeNumber si la valeur est en cours d'édition
        if (str === '') {
          onChangeNumber(0)
          return
        }
        
        // Parser plus robuste
        const cleanStr = str.replace(',', '.').replace(/[^\d.-]/g, '')
        const normalized = parseFloat(cleanStr)
        if (Number.isFinite(normalized)) {
          onChangeNumber(normalized)
        }
      }}
      onBlur={(e) => {
        const str = e.target.value
        setEditingValue(undefined)
        
        // Re-valider la valeur finale au blur
        if (str !== '') {
          const cleanStr = str.replace(',', '.').replace(/[^\d.-]/g, '')
          const normalized = parseFloat(cleanStr)
          if (Number.isFinite(normalized)) {
            onChangeNumber(normalized)
          }
        }
        
        onBlur?.()
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
      }}
    />
  )
}


'use client'

import React, { useState } from 'react'
import { evaluateFormula, isFormula } from '@/lib/formula'

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

  const formulaMode = isFormula(displayValue)

  return (
    <div className="relative">
      <input
        type="text"
        inputMode={formulaMode ? 'text' : 'decimal'}
        name={name}
        id={id}
        className={className}
        value={displayValue}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={(e) => {
          const current = value ?? 0
          setEditingValue(String(current))
          requestAnimationFrame(() => {
            try { e.target.select() } catch {}
          })
        }}
        onChange={(e) => {
          const str = e.target.value
          setEditingValue(str)

          // Mise à jour immédiate uniquement pour les valeurs numériques normales
          if (!isFormula(str)) {
            const cleanStr = str.replace(/,/g, '.').replace(/[^\d.-]/g, '')
            const normalized = parseFloat(cleanStr)
            if (Number.isFinite(normalized)) {
              onChangeNumber(normalized)
            } else if (str === '' || str === '-') {
              onChangeNumber(0)
            }
          }
        }}
        onBlur={(e) => {
          const str = e.target.value
          setEditingValue(undefined)

          const result = evaluateFormula(str)
          onChangeNumber(result !== null ? result : 0)

          onBlur?.()
        }}
        onKeyDown={(e) => {
          // Valider la formule avec Entrée
          if (e.key === 'Enter' && isFormula(displayValue)) {
            const result = evaluateFormula(displayValue)
            setEditingValue(undefined)
            onChangeNumber(result !== null ? result : 0)
          }
          onKeyDown?.(e)
        }}
      />
      {formulaMode && !disabled && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-purple-500 dark:text-purple-400 pointer-events-none select-none leading-none">
          fx
        </span>
      )}
    </div>
  )
}

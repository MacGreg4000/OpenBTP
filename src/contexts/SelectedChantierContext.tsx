'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Chantier {
  id: string
  chantierId: string
  nomChantier: string
  statut: string
  adresseChantier?: string | null
  clientNom?: string | null
  clientId?: string | null
}

interface SelectedChantierContextType {
  selectedChantier: Chantier | null
  setSelectedChantier: (chantier: Chantier | null) => void
  clearSelectedChantier: () => void
  isLoading: boolean
}

const SelectedChantierContext = createContext<SelectedChantierContextType | undefined>(undefined)

const STORAGE_KEY = 'mobile-selected-chantier'

export function SelectedChantierProvider({ children }: { children: ReactNode }) {
  const [selectedChantier, setSelectedChantierState] = useState<Chantier | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Charger depuis localStorage au montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setSelectedChantierState(parsed)
      }
    } catch (error) {
      console.error('Erreur lors du chargement du chantier sélectionné:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Sauvegarder dans localStorage quand le chantier change
  const setSelectedChantier = (chantier: Chantier | null) => {
    setSelectedChantierState(chantier)
    try {
      if (chantier) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chantier))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du chantier sélectionné:', error)
    }
  }

  const clearSelectedChantier = () => {
    setSelectedChantier(null)
  }

  return (
    <SelectedChantierContext.Provider
      value={{
        selectedChantier,
        setSelectedChantier,
        clearSelectedChantier,
        isLoading,
      }}
    >
      {children}
    </SelectedChantierContext.Provider>
  )
}

export function useSelectedChantier() {
  const context = useContext(SelectedChantierContext)
  if (context === undefined) {
    throw new Error('useSelectedChantier must be used within a SelectedChantierProvider')
  }
  return context
}


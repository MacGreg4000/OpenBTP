'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'

export interface FeatureModule {
  id: string
  code: string
  name: string
  description: string | null
  category: string
  icon: string | null
  isActive: boolean
  isSystem: boolean
  dependencies: string | null
  ordre: number
}

interface FeaturesContextType {
  modules: FeatureModule[]
  loading: boolean
  error: string | null
  isEnabled: (code: string) => boolean
  refresh: () => Promise<void>
}

const FeaturesContext = createContext<FeaturesContextType | undefined>(undefined)

export function useFeaturesProvider() {
  const [modules, setModules] = useState<FeatureModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModules = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/modules?activeOnly=true', {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des modules')
      }
      
      const data = await response.json()
      setModules(data)
      
      // Mettre en cache pour éviter de recharger à chaque page
      if (typeof window !== 'undefined') {
        localStorage.setItem('features_cache', JSON.stringify(data))
        localStorage.setItem('features_cache_time', Date.now().toString())
      }
    } catch (err) {
      console.error('Erreur lors du chargement des modules:', err)
      setError('Impossible de charger les modules')
      
      // Fallback sur le cache si disponible
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('features_cache')
        if (cached) {
          setModules(JSON.parse(cached))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    await fetchModules()
  }

  const isEnabled = (code: string): boolean => {
    return modules.some(m => m.code === code && m.isActive)
  }

  useEffect(() => {
    // Vérifier si on a un cache récent (< 5 minutes)
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('features_cache')
      const cacheTime = localStorage.getItem('features_cache_time')
      
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime)
        if (age < 5 * 60 * 1000) { // 5 minutes
          setModules(JSON.parse(cached))
          setLoading(false)
          return
        }
      }
    }
    
    fetchModules()
  }, [])

  return {
    modules,
    loading,
    error,
    isEnabled,
    refresh
  }
}

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const features = useFeaturesProvider()
  
  return (
    <FeaturesContext.Provider value={features}>
      {children}
    </FeaturesContext.Provider>
  )
}

export function useFeatures() {
  const context = useContext(FeaturesContext)
  
  // Retourner un fallback si pas dans un provider (pour le SSR/pre-rendering)
  if (context === undefined) {
    return {
      modules: [],
      loading: false,
      error: null,
      isEnabled: () => true, // Autoriser tout par défaut
      refresh: async () => {}
    }
  }
  
  return context
}


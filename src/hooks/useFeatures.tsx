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

  const fetchModules = async (forceRefresh = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // Si forceRefresh, vider le cache d'abord
      if (forceRefresh && typeof window !== 'undefined') {
        localStorage.removeItem('features_cache')
        localStorage.removeItem('features_cache_time')
      }
      
      const response = await fetch('/api/modules?activeOnly=true', {
        cache: 'no-store'
      })
      
      if (!response.ok) {
        // Si erreur 401 (non autorisé), c'est probablement un problème de session JWT
        if (response.status === 401) {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ Erreur d\'authentification lors du chargement des modules:', errorData.error)
          // Ne pas throw pour éviter de bloquer l'interface, mais afficher l'erreur
          setError('Session expirée. Veuillez vous reconnecter.')
          // Forcer la déconnexion en vidant les cookies de session
          if (typeof window !== 'undefined') {
            // Déclencher une déconnexion via NextAuth
            window.location.href = '/api/auth/signout?callbackUrl=/login'
          }
          return
        }
        
        // Si erreur 500 avec message spécifique sur NEXTAUTH_SECRET
        if (response.status === 500) {
          const errorData = await response.json().catch(() => ({}))
          if (errorData.error?.includes('NEXTAUTH_SECRET')) {
            setError('Configuration d\'authentification manquante. Contactez l\'administrateur.')
            console.error('❌', errorData.error)
            return
          }
        }
        
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
      
      // Fallback sur le cache si disponible (sauf si forceRefresh)
      if (!forceRefresh && typeof window !== 'undefined') {
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
    await fetchModules(true) // Force le refresh en vidant le cache
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


'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import * as HeroIcons from '@heroicons/react/24/outline'
import { useFeatures } from '@/hooks/useFeatures'
import { PageHeader } from '@/components/PageHeader'

interface FeatureModule {
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

const categoryLabels: Record<string, string> = {
  system: 'Système',
  commercial: 'Commercial',
  logistique: 'Logistique',
  organisation: 'Organisation',
  administratif: 'Administratif',
  communication: 'Communication',
  ia: 'Intelligence Artificielle',
  general: 'Général'
}

const categoryColors: Record<string, string> = {
  system: 'from-blue-500 to-indigo-600',
  commercial: 'from-green-500 to-emerald-600',
  logistique: 'from-orange-500 to-amber-600',
  organisation: 'from-purple-500 to-pink-600',
  administratif: 'from-gray-500 to-slate-600',
  communication: 'from-violet-500 to-purple-600',
  ia: 'from-cyan-500 to-teal-600',
  general: 'from-indigo-500 to-blue-600'
}

export default function ModulesAdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { refresh: refreshGlobalModules } = useFeatures()
  const [modules, setModules] = useState<FeatureModule[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Vérifier les permissions
  useEffect(() => {
    if (status === 'loading') return
    
    if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // Charger les modules
  const fetchModules = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/modules')
      
      if (!response.ok) {
        throw new Error('Erreur lors du chargement')
      }
      
      const data = await response.json()
      setModules(data)
    } catch (err) {
      setError('Impossible de charger les modules')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchModules()
    }
  }, [session])

  // Toggle un module
  const toggleModule = async (code: string, currentStatus: boolean) => {
    try {
      setUpdating(code)
      setError(null)
      setSuccessMessage(null)
      
      const response = await fetch('/api/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          isActive: !currentStatus
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }

      const updatedModule = await response.json()
      setModules(prev => prev.map(m => 
        m.code === code ? updatedModule : m
      ))
      
      // Rafraîchir les modules globaux pour mettre à jour la navbar
      await refreshGlobalModules()
      
      setSuccessMessage(`Module ${updatedModule.name} ${updatedModule.isActive ? 'activé' : 'désactivé'}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la mise à jour'
      setError(errorMessage)
    } finally {
      setUpdating(null)
    }
  }

  // Obtenir l'icône dynamiquement
  const getIcon = (iconName: string | null) => {
    if (!iconName) return <Cog6ToothIcon className="h-6 w-6" />
    
    const Icon = (HeroIcons as Record<string, React.ComponentType<{ className?: string }>>)[iconName]
    if (!Icon) return <Cog6ToothIcon className="h-6 w-6" />
    
    return <Icon className="h-6 w-6" />
  }

  // Grouper par catégorie
  const modulesByCategory = modules.reduce((acc, module) => {
    if (!acc[module.category]) {
      acc[module.category] = []
    }
    acc[module.category].push(module)
    return acc
  }, {} as Record<string, FeatureModule[]>)

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (session?.user?.role !== 'ADMIN') {
    return null
  }

  const actions = (
    <button
      onClick={fetchModules}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:scale-[1.02] hover:shadow-xl disabled:opacity-50"
    >
      <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Actualiser
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Modules"
        subtitle="Activez ou désactivez finement les fonctionnalités disponibles dans l'application."
        icon={Cog6ToothIcon}
        badgeColor="from-indigo-500 via-indigo-600 to-blue-600"
        gradientColor="from-indigo-500/12 via-indigo-600/12 to-blue-600/12"
        actions={actions}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/40 dark:bg-green-900/20 dark:text-green-200">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5" />
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Liste des modules par catégorie */}
        <div className="space-y-8">
          {Object.entries(modulesByCategory).map(([category, categoryModules]) => (
            <div key={category} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className={`px-6 py-4 bg-gradient-to-r ${categoryColors[category] || categoryColors.general}`}>
                <h2 className="text-lg font-bold text-white">
                  {categoryLabels[category] || category}
                </h2>
                <p className="text-sm text-white/80 mt-1">
                  {categoryModules.length} module{categoryModules.length > 1 ? 's' : ''}
                </p>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {categoryModules.map((module) => (
                  <div
                    key={module.id}
                    className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          module.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}>
                          {getIcon(module.icon)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {module.name}
                            </h3>
                            {module.isSystem && (
                              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                                Système
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {module.description || 'Aucune description'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {module.isActive ? (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Activé</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                            <XCircleIcon className="h-5 w-5" />
                            <span className="text-sm font-medium">Désactivé</span>
                          </div>
                        )}

                        <button
                          onClick={() => toggleModule(module.code, module.isActive)}
                          disabled={module.isSystem || updating === module.code}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            module.isActive
                              ? 'bg-green-600'
                              : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              module.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Légende */}
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
          <p className="text-sm text-indigo-800 dark:text-indigo-200">
            <strong>ℹ️ Note :</strong> Les modules marqués "Système" sont essentiels au fonctionnement de l'application et ne peuvent pas être désactivés.
            La désactivation d'un module masquera ses fonctionnalités dans l'interface et bloquera l'accès à ses pages.
          </p>
        </div>
      </div>
    </div>
  )
}


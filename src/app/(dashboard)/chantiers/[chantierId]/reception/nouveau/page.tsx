'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardDocumentCheckIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { Button, FormInput } from '@/components/ui'
import { format } from 'date-fns'
import React from 'react'

export default function NouvelleReceptionPage({ params }: { params: Promise<{ chantierId: string }> }) {
  // Utiliser React.use pour déballer la Promise params
  const { chantierId } = React.use(params)
  const router = useRouter()
  interface ChantierLite { nomChantier?: string }
  const [chantier, setChantier] = useState<ChantierLite | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    dateLimite: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // Date par défaut: aujourd'hui + 30 jours
  })

  useEffect(() => {
    const fetchChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}`)
        if (!response.ok) throw new Error('Erreur lors du chargement du chantier')
        const data = await response.json()
        setChantier(data)
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement du chantier')
        setLoading(false)
      }
    }

    fetchChantier()
  }, [chantierId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      console.log("Création d'une nouvelle réception avec date limite:", formData.dateLimite);
      
      // Formater correctement la date
      const dateLimiteFormatted = new Date(formData.dateLimite);
      
      // Vérifier si la date est valide
      if (isNaN(dateLimiteFormatted.getTime())) {
        throw new Error("La date limite n'est pas valide");
      }
      
      const response = await fetch(`/api/chantiers/${chantierId}/reception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateLimite: dateLimiteFormatted.toISOString(),
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const text = await response.text()
      const parsed = text && contentType.includes('application/json') ? JSON.parse(text) : null

      if (!response.ok) {
        const message = parsed?.error || 'Erreur lors de la création de la réception'
        console.error('Erreur API:', parsed || text)
        throw new Error(message)
      }
      
      const receptionData = parsed
      console.log("Réception créée avec succès:", receptionData);
      
      // Rediriger vers la page de réception
      router.push(`/chantiers/${chantierId}/reception`)
    } catch (error) {
      console.error('Erreur complète:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (!chantier) return <div className="p-8">Chantier non trouvé</div>

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header léger style backdrop-blur */}
      <div className="mb-6">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Effet de fond subtil avec dégradé red/rose (couleur de l'icône Réception) - opacité 60% */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/60 via-red-700/60 to-rose-800/60 dark:from-red-600/30 dark:via-red-700/30 dark:to-rose-800/30"></div>
          
          <div className="relative z-10 p-4 sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 mr-3 text-red-900 dark:text-white" />
                  <h1 className="text-xl font-bold text-red-900 dark:text-white">
                    Nouvelle réception
                  </h1>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  type="submit"
                  form="reception-form"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-red-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-900 dark:border-white"></div>
                      Création...
                    </>
                  ) : (
                    <>
                      <PlusCircleIcon className="h-5 w-5" />
                      Créer la réception
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <form id="reception-form" onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400 dark:text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                Informations de la réception
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Définissez la date limite pour résoudre toutes les remarques.
              </p>
            </div>

            <FormInput
              id="dateLimite"
              name="dateLimite"
              type="date"
              label="Date limite d'intervention"
              value={formData.dateLimite}
              onChange={handleChange}
              required
            />

            <div className="pt-5">
              {/* Le bouton est maintenant dans le header */}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 
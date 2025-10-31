'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import ChoixClientForm from '@/components/choix-client/ChoixClientForm'

export default function NouveauChoixClientPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (data: {
    nomClient: string
    telephoneClient?: string
    emailClient?: string
    chantierId?: string
    statut: string
    notesGenerales?: string
    documents?: string[]
    detailsChoix?: Array<{
      numeroChoix: number
      couleurPlan: string
      localisations: string[]
      type: string
      marque: string
      collection?: string
      modele: string
      reference?: string
      couleur?: string
      formatLongueur?: number
      formatLargeur?: number
      epaisseur?: number
      finition?: string
      surfaceEstimee?: number
      couleurJoint?: string
      largeurJoint?: number
      typeJoint?: string
      typePose?: string
      sensPose?: string
      particularitesPose?: string
      photosShowroom?: string[]
      notes?: string
    }>
  }) => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/choix-clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la création')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Choix client créé avec succès')
        router.push(`/choix-clients/${result.choixClient.id}/edit`)
      } else {
        throw new Error(result.error || 'Erreur lors de la création')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du choix client')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/choix-clients')}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Nouveau Choix Client
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enregistrer les choix de carrelage du client
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ChoixClientForm 
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  )
}


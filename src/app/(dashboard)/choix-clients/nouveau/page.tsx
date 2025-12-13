'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import toast, { Toaster } from 'react-hot-toast'
import { PageHeader } from '@/components/PageHeader'
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-pink-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Toaster position="top-right" />
      
      <PageHeader
        title="Nouveau Choix Client"
        subtitle="Enregistrer les choix de carrelage du client"
        icon={DocumentTextIcon}
        badgeColor="from-purple-600 via-pink-600 to-rose-700"
        gradientColor="from-purple-600/10 via-pink-600/10 to-rose-700/10"
        leftAction={
          <button
            onClick={() => router.push('/choix-clients')}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Retour à la liste des choix clients"
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        }
      />

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


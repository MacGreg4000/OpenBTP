'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import ChoixClientForm from '@/components/choix-client/ChoixClientForm'
import { PageHeader } from '@/components/PageHeader'
import { DocumentTextIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function EditChoixClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [choixClient, setChoixClient] = useState<{
    id: string
    nomClient: string
    telephoneClient?: string
    emailClient?: string
    dateVisite: string
    statut: string
    chantierId?: string
    notesGenerales?: string
    documents?: string[]
    detailsChoix?: Array<{
      id: string
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
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchChoixClient()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchChoixClient = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/choix-clients/${id}`)
      const data = await response.json()
      
      if (data.success) {
        setChoixClient(data.choixClient)
      } else {
        toast.error('Choix client non trouvé')
        router.push('/choix-clients')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement')
      router.push('/choix-clients')
    } finally {
      setLoading(false)
    }
  }

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
      
      const response = await fetch(`/api/choix-clients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Choix client mis à jour avec succès')
        setChoixClient(result.choixClient)
      } else {
        throw new Error(result.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la mise à jour')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Chargement...</span>
        </div>
      </div>
    )
  }

  if (!choixClient) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/20 to-pink-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <Toaster position="top-right" />

      <PageHeader
        title="Modifier le Choix Client"
        subtitle={choixClient.nomClient}
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
          initialData={choixClient}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  )
}


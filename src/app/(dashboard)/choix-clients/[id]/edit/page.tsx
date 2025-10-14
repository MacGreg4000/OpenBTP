'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import ChoixClientForm from '@/components/choix-client/ChoixClientForm'

export default function EditChoixClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [choixClient, setChoixClient] = useState<any>(null)
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

  const handleSubmit = async (data: any) => {
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                Modifier le Choix Client
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {choixClient.nomClient}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ChoixClientForm 
          initialData={choixClient}
          onSubmit={handleSubmit}
          saving={saving}
        />
      </div>
    </div>
  )
}


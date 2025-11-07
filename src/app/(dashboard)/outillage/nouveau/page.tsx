'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WrenchScrewdriverIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { PageHeader } from '@/components/PageHeader'

interface FormData {
  nom: string
  modele: string
  numeroSerie: string
  localisation: string
  dateAchat: string
  commentaire: string
}

export default function NouvelleMachinePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    modele: '',
    numeroSerie: '',
    localisation: '',
    dateAchat: '',
    commentaire: ''
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/outillage/machines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(errorData.error || `Erreur lors de la création de la machine (${response.status})`)
      }

      toast.success('Machine ajoutée avec succès')
      router.push('/outillage')
      router.refresh()
    } catch (error: unknown) {
      console.error('Erreur:', error)
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      toast.error(`Impossible de créer la machine : ${message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Nouvelle machine"
        subtitle="Ajoutez un nouvel équipement à votre parc outillage"
        icon={WrenchScrewdriverIcon}
        badgeColor="from-blue-600 via-indigo-600 to-purple-700"
        gradientColor="from-blue-600/10 via-indigo-600/10 to-purple-700/10"
        infoCard={
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 dark:bg-gray-900/60 border border-gray-200/70 dark:border-gray-700/60 text-xs font-semibold text-blue-700 dark:text-blue-200 shadow-sm">
            <CheckCircleIcon className="h-4 w-4" /> Création de machine
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/outillage"
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/90 dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Retour
            </Link>
          </div>
        }
      />

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-xl hover:shadow-2xl transition-shadow duration-300 overflow-hidden">
          <div className="border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-700/10 dark:from-blue-600/5 dark:via-indigo-600/5 dark:to-purple-700/5 px-6 sm:px-10 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informations principales</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Renseignez les détails nécessaires pour référencer correctement la machine.</p>
              </div>
              <div className="inline-flex items.center gap-2 px-3 py-1 rounded-full bg-white/60 dark:bg-gray-900/50 text-sm font-medium text-blue-700 dark:text-blue-200 shadow-sm">
                <CheckCircleIcon className="h-4 w-4" />
                Champs obligatoires indiqués par *
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 sm:px-10 py-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="nom" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Nom de la machine <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="nom"
                  id="nom"
                  required
                  value={formData.nom}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                  placeholder="Ex. Perforateur Hilti"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="modele" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Modèle <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="modele"
                  id="modele"
                  required
                  value={formData.modele}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                  placeholder="Référence du fabricant"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="numeroSerie" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Numéro de série
                </label>
                <input
                  type="text"
                  name="numeroSerie"
                  id="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                  placeholder="Identifiant unique de la machine"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="localisation" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Localisation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="localisation"
                  id="localisation"
                  required
                  value={formData.localisation}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                  placeholder="Ex. Atelier principal"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="dateAchat" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Date d'achat
                </label>
                <input
                  type="date"
                  name="dateAchat"
                  id="dateAchat"
                  value={formData.dateAchat}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label htmlFor="commentaire" className="block text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Commentaire
                </label>
                <textarea
                  name="commentaire"
                  id="commentaire"
                  rows={4}
                  value={formData.commentaire}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-gray-900/60 px-4 py-3 text-gray-900 dark:text-white shadow-inner focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40 transition resize-none"
                  placeholder="Ajoutez des précisions utiles (état, accessoires, etc.)"
                />
              </div>
            </div>

            <div className="border-t border-gray-200/60 dark:border-gray-700/60 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Toutes les informations peuvent être modifiées ultérieurement depuis la fiche de la machine.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/outillage')}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white/80 dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors"
                  disabled={saving}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Création en cours...' : 'Créer la machine'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
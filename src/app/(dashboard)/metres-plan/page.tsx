'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { PencilSquareIcon, PlusIcon, FolderOpenIcon } from '@heroicons/react/24/outline'

interface MetrePlan {
  id: string
  nom: string
  updatedAt: string
  chantier?: {
    chantierId: string
    nomChantier: string
  } | null
}

interface Chantier {
  chantierId: string
  nomChantier: string
}

export default function MetresPlanPage() {
  const router = useRouter()
  const [projets, setProjets] = useState<MetrePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nomProjet, setNomProjet] = useState('')
  const [chantierId, setChantierId] = useState('')
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadProjets()
    loadChantiers()
  }, [])

  const loadProjets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/metres-plan')
      if (!response.ok) throw new Error('Erreur lors du chargement des métrés')
      const data = await response.json()
      setProjets(Array.isArray(data) ? data : data.data ?? [])
    } catch (err) {
      console.error('Erreur:', err)
      setError('Impossible de charger les métrés sur plan')
      setProjets([])
    } finally {
      setLoading(false)
    }
  }

  const loadChantiers = async () => {
    try {
      const response = await fetch('/api/chantiers')
      if (!response.ok) return
      const data = await response.json()
      setChantiers(Array.isArray(data) ? data : data.data ?? [])
    } catch {
      // Silencieux — le select sera vide
    }
  }

  const handleCreate = async () => {
    if (!nomProjet.trim()) return
    try {
      setCreating(true)
      const body: Record<string, string> = { nom: nomProjet.trim() }
      if (chantierId) body.chantierId = chantierId
      const response = await fetch('/api/metres-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error('Erreur lors de la création')
      const data = await response.json()
      const newId = data.id ?? data.data?.id
      setDialogOpen(false)
      setNomProjet('')
      setChantierId('')
      if (newId) router.push(`/metres-plan/${newId}`)
      else loadProjets()
    } catch (err) {
      console.error('Erreur création:', err)
      alert('Impossible de créer le métré sur plan.')
    } finally {
      setCreating(false)
    }
  }

  const actionButton = (
    <button
      onClick={() => setDialogOpen(true)}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm font-semibold"
    >
      <PlusIcon className="h-4 w-4" />
      Nouveau métré
    </button>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Métrés sur plan"
        subtitle="Dessinez et mesurez directement sur vos plans PDF"
        icon={PencilSquareIcon}
        badgeColor="from-indigo-600 via-blue-600 to-sky-700"
        gradientColor="from-indigo-600/10 via-blue-600/10 to-sky-700/10"
        actions={actionButton}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={loadProjets}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Réessayer
            </button>
          </div>
        ) : projets.length === 0 ? (
          <div className="text-center py-20">
            <PencilSquareIcon className="h-20 w-20 text-gray-300 dark:text-gray-600 mx-auto mb-5" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Aucun métré sur plan</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Commencez par créer un nouveau métré sur plan pour dessiner sur vos PDF.
            </p>
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg shadow-md text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4" />
              Créer mon premier métré
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projets.map((projet) => (
              <div
                key={projet.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <PencilSquareIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                      {projet.nom}
                    </h3>
                    {projet.chantier && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {projet.chantier.nomChantier}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  Mis à jour le{' '}
                  {new Date(projet.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className="mt-auto">
                  <button
                    onClick={() => router.push(`/metres-plan/${projet.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-sm font-semibold"
                  >
                    <FolderOpenIcon className="h-4 w-4" />
                    Ouvrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog Nouveau métré */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Nouveau métré sur plan</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du projet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nomProjet}
                  onChange={(e) => setNomProjet(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder="Ex : Façade lot A - Appartement 3"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chantier associé <span className="text-gray-400">(optionnel)</span>
                </label>
                <select
                  value={chantierId}
                  onChange={(e) => setChantierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">— Aucun chantier —</option>
                  {chantiers.map((c) => (
                    <option key={c.chantierId} value={c.chantierId}>
                      {c.nomChantier}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setDialogOpen(false); setNomProjet(''); setChantierId('') }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreate}
                disabled={!nomProjet.trim() || creating}
                className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-all"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

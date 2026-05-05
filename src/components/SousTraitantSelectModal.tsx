'use client'
import { useState, useEffect, useMemo } from 'react'
import { Dialog } from '@headlessui/react'
import { XMarkIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

interface SousTraitant {
  id: string
  nom: string
  email: string
}

interface SousTraitantSelectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (sousTraitantId: string) => void
}

export default function SousTraitantSelectModal({
  isOpen,
  onClose,
  onSubmit
}: SousTraitantSelectModalProps) {
  const [sousTraitants, setSousTraitants] = useState<SousTraitant[]>([])
  const [selectedSousTraitantId, setSelectedSousTraitantId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchSousTraitants = async () => {
      try {
        setLoading(true)
        setSearch('')
        const response = await fetch('/api/sous-traitants')
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des sous-traitants')
        }
        const data = await response.json()
        // N'afficher que les sous-traitants actifs
        const actifs = (data as SousTraitant[]).filter((st: SousTraitant & { actif?: boolean }) => st.actif !== false)
        setSousTraitants(actifs)
        if (actifs.length > 0) {
          setSelectedSousTraitantId(actifs[0].id)
        }
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors du chargement des sous-traitants')
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchSousTraitants()
    }
  }, [isOpen])

  // Liste filtrée en temps réel
  const filteredST = useMemo(() =>
    sousTraitants.filter(st =>
      st.nom.toLowerCase().includes(search.toLowerCase()) ||
      (st.email && st.email.toLowerCase().includes(search.toLowerCase()))
    ),
    [sousTraitants, search]
  )

  // Quand le filtre change, sélectionner le premier résultat visible
  useEffect(() => {
    if (filteredST.length > 0) {
      if (!filteredST.find(st => st.id === selectedSousTraitantId)) {
        setSelectedSousTraitantId(filteredST[0].id)
      }
    } else {
      setSelectedSousTraitantId('')
    }
  }, [filteredST, selectedSousTraitantId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    if (!selectedSousTraitantId) {
      setError('Veuillez sélectionner un sous-traitant')
      setIsSubmitting(false)
      return
    }
    onSubmit(selectedSousTraitantId)
    setIsSubmitting(false)
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-10 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Sélectionner un sous-traitant
          </Dialog.Title>

          {loading ? (
            <div className="py-4 text-center text-gray-500 dark:text-gray-400">
              Chargement des sous-traitants…
            </div>
          ) : error ? (
            <div className="py-4 text-center text-red-500">{error}</div>
          ) : sousTraitants.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Aucun sous-traitant n&apos;est disponible.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => window.open('/sous-traitants', '_blank')}
              >
                Créer un sous-traitant
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Champ de recherche */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un sous-traitant…"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 transition-colors"
                />
              </div>

              {/* Liste filtrée */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {filteredST.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                    Aucun résultat pour &quot;{search}&quot;
                  </p>
                ) : (
                  filteredST.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedSousTraitantId(st.id)}
                      className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between gap-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                        selectedSousTraitantId === st.id
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`font-medium truncate ${
                          selectedSousTraitantId === st.id
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          {st.nom}
                        </div>
                        {st.email && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {st.email}
                          </div>
                        )}
                      </div>
                      {selectedSousTraitantId === st.id && (
                        <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Compteur */}
              {search && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                  {filteredST.length} résultat{filteredST.length !== 1 ? 's' : ''}
                </p>
              )}

              <div className="pt-2 flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={onClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  disabled={!selectedSousTraitantId}
                >
                  {isSubmitting ? 'Chargement...' : 'Confirmer'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Dialog>
  )
}

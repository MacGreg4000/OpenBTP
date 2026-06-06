'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DocumentTextIcon,
  BuildingOffice2Icon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
  color: string
  bgColor: string
  hoverColor: string
  hoverTextColor: string
  shortcut?: string
}

interface Magasinier {
  id: string
  nom: string
}

export default function QuickActionsWidget() {
  const [tacheModalOpen, setTacheModalOpen] = useState(false)
  const [magasiniers, setMagasiniers] = useState<Magasinier[]>([])
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [dateExecution, setDateExecution] = useState(() => new Date().toISOString().slice(0, 10))
  const [magasinierId, setMagasinierId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  // Charger les magasiniers à l'ouverture de la modale
  useEffect(() => {
    if (tacheModalOpen && magasiniers.length === 0) {
      fetch('/api/magasiniers')
        .then(r => r.json())
        .then(data => {
          setMagasiniers(data)
          if (data.length === 1) setMagasinierId(data[0].id)
        })
        .catch(() => {})
    }
  }, [tacheModalOpen, magasiniers.length])

  const openTacheModal = () => {
    setTitre('')
    setDescription('')
    setDateExecution(new Date().toISOString().slice(0, 10))
    setMagasinierId(magasiniers.length === 1 ? magasiniers[0].id : '')
    setError('')
    setSuccess(false)
    setTacheModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) { setError('Le titre est requis.'); return }
    if (!magasinierId) { setError('Veuillez choisir un magasinier.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/logistique/taches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titre: titre.trim(), description: description.trim() || undefined, dateExecution, magasinierId })
      })
      if (!res.ok) throw new Error('Erreur serveur')
      setSuccess(true)
      setTimeout(() => setTacheModalOpen(false), 1200)
    } catch {
      setError('Erreur lors de la création. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  const quickActions: QuickAction[] = [
    {
      id: 'devis',
      title: 'Devis',
      icon: DocumentTextIcon,
      href: '/devis',
      color: 'from-orange-500 to-red-600',
      bgColor: 'from-orange-50 to-red-50',
      hoverColor: 'shadow-orange-500/30',
      hoverTextColor: 'group-hover:text-orange-600 dark:group-hover:text-orange-400',
      shortcut: 'D'
    },
    {
      id: 'chantiers',
      title: 'Chantiers',
      icon: BuildingOffice2Icon,
      href: '/chantiers',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'from-amber-50 to-orange-50',
      hoverColor: 'shadow-amber-500/30',
      hoverTextColor: 'group-hover:text-amber-600 dark:group-hover:text-amber-400',
      shortcut: 'B'
    },
    {
      id: 'clients',
      title: 'Clients',
      icon: UsersIcon,
      href: '/clients',
      color: 'from-indigo-500 to-pink-600',
      bgColor: 'from-indigo-50 to-pink-50',
      hoverColor: 'shadow-indigo-500/30',
      hoverTextColor: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400',
      shortcut: 'L'
    },
    {
      id: 'sous-traitants',
      title: 'Sous-traitants',
      icon: UserGroupIcon,
      href: '/sous-traitants',
      color: 'from-blue-500 to-purple-600',
      bgColor: 'from-blue-50 to-purple-50',
      hoverColor: 'shadow-blue-500/30',
      hoverTextColor: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
      shortcut: 'S'
    },
    {
      id: 'planning',
      title: 'Planning',
      icon: CalendarIcon,
      href: '/planning',
      color: 'from-blue-500 to-purple-600',
      bgColor: 'from-blue-50 to-purple-50',
      hoverColor: 'shadow-blue-500/30',
      hoverTextColor: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
      shortcut: 'P'
    },
    {
      id: 'logistique',
      title: 'Tâche magasinier',
      icon: ClipboardDocumentListIcon,
      onClick: openTacheModal,
      color: 'from-green-500 to-teal-600',
      bgColor: 'from-green-50 to-teal-50',
      hoverColor: 'shadow-green-500/30',
      hoverTextColor: 'group-hover:text-green-600 dark:group-hover:text-green-400',
      shortcut: 'T'
    }
  ]

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const action = quickActions.find(a => a.shortcut?.toLowerCase() === e.key.toLowerCase())
        if (action) {
          e.preventDefault()
          if (action.onClick) action.onClick()
          else if (action.href) window.location.href = action.href
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magasiniers])

  return (
    <>
      {/* Actions principales */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const inner = (
            <div className="relative z-10 p-3 flex flex-col items-center text-center gap-2">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <h4 className={`font-bold text-gray-900 dark:text-white text-xs ${action.hoverTextColor} transition-colors`}>
                {action.title}
              </h4>
              {action.shortcut && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] bg-gray-900/80 dark:bg-white/80 text-white dark:text-gray-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    ⌘{action.shortcut}
                  </span>
                </div>
              )}
            </div>
          )

          const classes = `
            group relative overflow-hidden rounded-xl border transition-all duration-200
            bg-gradient-to-br ${action.bgColor} dark:from-gray-700/50 dark:to-gray-800/50
            border-gray-300 dark:border-gray-600
            hover:shadow-lg hover:scale-105 ${action.hoverColor}
          `

          if (action.onClick) {
            return (
              <button key={action.id} type="button" onClick={action.onClick} className={classes}>
                {inner}
              </button>
            )
          }
          return (
            <Link key={action.id} href={action.href!} className={classes}>
              {inner}
            </Link>
          )
        })}
      </div>

      {/* Modale création tâche magasinier */}
      {tacheModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-green-500 to-teal-600">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nouvelle tâche magasinier</h2>
              </div>
              <button
                onClick={() => setTacheModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Corps */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {success ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-base font-semibold text-green-700 dark:text-green-300">Tâche créée avec succès !</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre *</label>
                    <input
                      type="text"
                      value={titre}
                      onChange={e => setTitre(e.target.value)}
                      placeholder="Ex: Rangement étagère A3"
                      autoFocus
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optionnel)</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Détails supplémentaires..."
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date d&apos;exécution</label>
                      <input
                        type="date"
                        value={dateExecution}
                        onChange={e => setDateExecution(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Magasinier *</label>
                      <select
                        value={magasinierId}
                        onChange={e => setMagasinierId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Choisir...</option>
                        {magasiniers.map(m => (
                          <option key={m.id} value={m.id}>{m.nom}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                  )}

                  {/* Footer */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setTacheModalOpen(false)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-teal-600 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {submitting ? 'Création...' : 'Créer la tâche'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  )
}

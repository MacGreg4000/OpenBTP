'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline'

export default function MobileNouvelleNotePage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [contenu, setContenu] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
  }, [selectedChantier, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedChantier) return

    if (!contenu.trim()) {
      setErrorMessage('Veuillez saisir une note')
      return
    }

    setErrorMessage(null)
    setSaving(true)

    try {
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/notes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contenu: contenu.trim(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la note')
      }

      router.push('/mobile/notes')
    } catch (error) {
      console.error('Erreur:', error)
      setErrorMessage('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
    }
  }

  if (!selectedChantier) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/mobile/notes')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black">Nouvelle note</h1>
            <div className="w-10"></div>
          </div>
          <p className="text-sm text-blue-100">{selectedChantier.nomChantier}</p>
        </div>
      </div>

      {/* Formulaire */}
      <div className="max-w-md mx-auto px-4 py-6">
        {errorMessage && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contenu de la note
            </label>
            <textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Saisissez votre note..."
              rows={12}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={saving || !contenu.trim()}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            <span>{saving ? 'Enregistrement...' : 'Enregistrer la note'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}


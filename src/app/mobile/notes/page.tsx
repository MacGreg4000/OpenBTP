'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
import {
  DocumentTextIcon,
  ArrowLeftIcon,
  PlusIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

interface Note {
  id: number
  contenu: string
  createdAt: string
  User: {
    name: string | null
    email: string | null
  } | null
}

export default function MobileNotesPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadNotes()
  }, [selectedChantier, router]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadNotes = async () => {
    if (!selectedChantier) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/notes`
      )
      if (response.ok) {
        const data = await response.json()
        setNotes(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notes:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (!selectedChantier) {
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/mobile/dashboard')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-xl font-black">Notes</h1>
            <button
              onClick={() => router.push('/mobile/notes/nouveau')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <PlusIcon className="h-6 w-6" />
            </button>
          </div>
          <p className="text-sm text-blue-100">{selectedChantier.nomChantier}</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Aucune note</p>
            <p className="text-sm text-gray-500 mt-1">Créez votre première note</p>
            <button
              onClick={() => router.push('/mobile/notes/nouveau')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-colors"
            >
              Créer une note
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-white rounded-xl p-4 shadow-lg border border-gray-200"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DocumentTextIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 whitespace-pre-wrap">{note.contenu}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                      <ClockIcon className="h-4 w-4" />
                      <span>{formatDate(note.createdAt)}</span>
                      {note.User?.name && (
                        <>
                          <span>•</span>
                          <span>{note.User.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}


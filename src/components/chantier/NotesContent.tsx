'use client'
import { useState, useEffect } from 'react'
// import { useSession } from 'next-auth/react'
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Note {
  id: number
  contenu: string
  createdAt: string
  User: {
    name: string | null
    email: string
  }
}

interface NotesContentProps {
  chantierId: string;
  debug?: boolean;
}

export function NotesContent({ chantierId, debug = false }: NotesContentProps) {
  // const { data: _session } = useSession()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiResponse, setApiResponse] = useState<unknown>(null)

  useEffect(() => {
    fetchNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId])

  const fetchNotes = async () => {
    setError(null)
    try {
      if (debug) console.log(`Récupération des notes pour le chantier ${chantierId}`)
      const response = await fetch(`/api/chantiers/${chantierId}/notes`)
      
      const responseText = await response.text()
      if (debug) console.log('Réponse brute:', responseText)
      
      let data
      try {
        data = JSON.parse(responseText)
        if (debug) console.log('Réponse parsée:', data)
        setApiResponse(data)
      } catch (e) {
        console.error('Erreur lors du parsing de la réponse:', e)
        setError(`Erreur de format de réponse: ${responseText.substring(0, 100)}...`)
        setLoading(false)
        return
      }
      
      if (!response.ok) {
        console.error('Réponse d\'erreur:', response.status, data)
        setError(`Erreur ${response.status}: ${data.error || response.statusText}`)
        setLoading(false)
        return
      }
      
      if (!Array.isArray(data)) {
        console.error('La réponse n\'est pas un tableau:', data)
        setError('Format de réponse invalide: attendu un tableau de notes')
        setLoading(false)
        return
      }
      
      if (debug) console.log('Notes récupérées:', data)
      setNotes(data)
    } catch (error: unknown) {
      console.error('Erreur lors de la récupération des notes:', error)
      setError(`Erreur lors de la récupération des notes: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    
    setError(null)
    try {
      console.log(`Ajout d'une note pour le chantier ${chantierId}:`, newNote)
      
      const response = await fetch(`/api/chantiers/${chantierId}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contenu: newNote
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      const noteCreated = await response.json()
      console.log('Note créée avec succès:', noteCreated)
      
      setNotes([noteCreated, ...notes])
      setNewNote('')
    } catch (error: unknown) {
      console.error('Erreur lors de l\'ajout de la note:', error)
      setError(`Erreur lors de l'ajout de la note: ${(error as Error).message}`)
    }
  }

  const handleDeleteNote = async (noteId: number) => {
    setNoteToDelete(noteId)
  }

  const confirmDelete = async () => {
    if (!noteToDelete) return
    
    setError(null)
    try {
      console.log(`Suppression de la note ${noteToDelete} pour le chantier ${chantierId}`)
      
      const response = await fetch(`/api/chantiers/${chantierId}/notes/${noteToDelete}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      console.log('Note supprimée avec succès')
      setNotes(notes.filter(note => note.id !== noteToDelete))
    } catch (error: unknown) {
      console.error('Erreur lors de la suppression de la note:', error)
      setError(`Erreur lors de la suppression de la note: ${(error as Error).message}`)
    } finally {
      setNoteToDelete(null)
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800 dark:text-red-400">
          {error}
          {debug && apiResponse && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-40">
              <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Ajouter une note..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddNote();
            }
          }}
        />
        <button
          onClick={handleAddNote}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
          title="Ajouter une note"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400">Aucune note pour ce chantier</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700 transition-colors group">
              <div className="flex justify-between items-start">
                <p className="flex-grow text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.contenu}</p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Supprimer cette note"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {note.User?.name || note.User?.email || 'Utilisateur inconnu'}
                <span className="mx-1.5">•</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(new Date(note.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de confirmation */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Confirmer la suppression</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir supprimer cette note ?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setNoteToDelete(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
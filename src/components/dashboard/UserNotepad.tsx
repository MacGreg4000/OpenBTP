'use client'
import { useState, useEffect } from 'react'
import { PencilIcon, CheckIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  important: boolean
}

interface NotepadData {
  content: string
  todos: TodoItem[]
}

export default function UserNotepad({ userId }: { userId: string }) {
  const [notepadData, setNotepadData] = useState<NotepadData>({
    content: '',
    todos: []
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [newTodoText, setNewTodoText] = useState('')

  // Charger les données du tableau blanc
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/notes`)
        if (response.ok) {
          const data = await response.json()
          setNotepadData({
            content: data.content || '',
            todos: data.todos || []
          })
          setLastSaved(data.updatedAt ? new Date(data.updatedAt).toLocaleString('fr-FR') : null)
        }
      } catch (error) {
        console.error('Erreur lors du chargement des notes:', error)
      }
    }

    fetchNotes()
  }, [userId])

  // Sauvegarder les données
  const saveNotes = async (dataToSave = notepadData) => {
    setIsSaving(true)
    
    try {
      const response = await fetch(`/api/users/${userId}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })
      
      if (response.ok) {
        await response.json()
        setLastSaved(new Date().toLocaleString('fr-FR'))
        toast.success('Tableau blanc sauvegardé')
        setIsEditing(false)
      } else {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }

  // Fonctions pour les todos
  const addTodo = () => {
    if (!newTodoText.trim()) return
    
    const newTodo: TodoItem = {
      id: Date.now().toString(),
      text: newTodoText,
      completed: false,
      important: false
    }
    
    const updatedData = {
      ...notepadData,
      todos: [...notepadData.todos, newTodo]
    }
    
    setNotepadData(updatedData)
    saveNotes(updatedData)
    setNewTodoText('')
  }

  const toggleTodo = (id: string) => {
    const updatedData = {
      ...notepadData,
      todos: notepadData.todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    }
    setNotepadData(updatedData)
    saveNotes(updatedData)
  }

  const deleteTodo = (id: string) => {
    const updatedData = {
      ...notepadData,
      todos: notepadData.todos.filter(todo => todo.id !== id)
    }
    setNotepadData(updatedData)
    saveNotes(updatedData)
  }

  const toggleTodoImportant = (id: string) => {
    const updatedData = {
      ...notepadData,
      todos: notepadData.todos.map(todo => 
        todo.id === id ? { ...todo, important: !todo.important } : todo
      )
    }
    setNotepadData(updatedData)
    saveNotes(updatedData)
  }



  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <PencilIcon className="h-5 w-5 mr-2 text-blue-600" />
            Mon Espace de Travail
          </h3>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sauvegardé: {lastSaved}
              </span>
            )}
            <button
              onClick={isEditing ? () => saveNotes() : () => setIsEditing(true)}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Sauvegarde...' : isEditing ? 'Sauvegarder' : 'Modifier'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Colonne gauche - Notes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Notes
            </h4>
          </div>
          
          <div className="relative">
            {isEditing ? (
              <textarea
                value={notepadData.content}
                onChange={(e) => setNotepadData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Écrivez vos notes ici..."
              />
            ) : (
              <div className="w-full h-64 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 overflow-y-auto">
                {notepadData.content ? (
                  <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                    {notepadData.content}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 italic">
                    Aucune note pour le moment. Cliquez sur "Modifier" pour commencer.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite - Liste des tâches */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
              Liste des tâches
            </h4>
            {/* Graphique de progression */}
            {notepadData.todos.length > 0 && (
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {notepadData.todos.filter(todo => todo.completed).length} / {notepadData.todos.length}
                </div>
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                    style={{ 
                      width: `${(notepadData.todos.filter(todo => todo.completed).length / notepadData.todos.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Ajout de nouvelle tâche */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="Nouvelle tâche..."
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={addTodo}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Liste des tâches */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notepadData.todos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Aucune tâche pour le moment</p>
              </div>
            ) : (
              notepadData.todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                    todo.important
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : todo.completed 
                        ? 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      todo.completed
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
                    }`}
                  >
                    {todo.completed && <CheckIcon className="h-3 w-3" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${
                      todo.completed 
                        ? 'line-through text-gray-500 dark:text-gray-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {todo.text}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      <input
                        type="checkbox"
                        checked={todo.important}
                        onChange={() => toggleTodoImportant(todo.id)}
                        className="w-3 h-3 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 dark:focus:ring-red-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                      <span className="text-lg" title="Marquer comme important">
                        ⚠️
                      </span>
                    </label>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
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
    <div className="bg-gradient-to-br from-white via-purple-50/30 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
      {/* En-tête moderne */}
      <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 dark:from-purple-900/20 dark:to-pink-900/20 border-b-2 border-purple-200/50 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
              <PencilIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">
              Mon Espace de Travail
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-600 dark:text-gray-400 font-medium px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                💾 {lastSaved}
              </span>
            )}
            <button
              onClick={isEditing ? () => saveNotes() : () => setIsEditing(true)}
              disabled={isSaving}
              className={`px-4 py-2 text-sm font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 ${
                isEditing 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
              }`}
            >
              {isSaving ? '💾 Sauvegarde...' : isEditing ? '✓ Sauvegarder' : '✏️ Modifier'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu principal moderne - 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Colonne gauche - Notes moderne */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h4 className="text-md font-black text-gray-900 dark:text-white">
              📝 Notes
            </h4>
          </div>
          
          <div className="relative">
            {isEditing ? (
              <textarea
                value={notepadData.content}
                onChange={(e) => setNotepadData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full h-64 p-4 border-2 border-blue-300 dark:border-blue-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white shadow-lg transition-all duration-200"
                placeholder="✍️ Écrivez vos notes ici..."
              />
            ) : (
              <div className="w-full h-64 p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-gradient-to-br from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800/50 overflow-y-auto shadow-lg">
                {notepadData.content ? (
                  <div className="whitespace-pre-wrap text-gray-900 dark:text-white font-medium">
                    {notepadData.content}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucune note</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Cliquez sur "Modifier" pour commencer</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite - Liste des tâches moderne */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <CheckIcon className="w-3.5 h-3.5 text-white" />
              </div>
              <h4 className="text-md font-black text-gray-900 dark:text-white">
                ✓ Tâches
              </h4>
            </div>
            {/* Graphique de progression moderne */}
            {notepadData.todos.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-lg">
                  <span className="text-sm font-bold text-green-700 dark:text-green-400">
                    {notepadData.todos.filter(todo => todo.completed).length} / {notepadData.todos.length}
                  </span>
                </div>
                <div className="w-20 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ 
                      width: `${(notepadData.todos.filter(todo => todo.completed).length / notepadData.todos.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Ajout de nouvelle tâche moderne */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              placeholder="➕ Nouvelle tâche..."
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white font-medium shadow-lg transition-all duration-200"
            />
            <button
              onClick={addTodo}
              className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 hover:scale-105 transition-all duration-200 shadow-lg flex items-center font-bold"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Liste des tâches moderne */}
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {notepadData.todos.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckIcon className="h-10 w-10 text-green-500 dark:text-green-400" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 font-semibold">Aucune tâche</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Ajoutez une tâche pour commencer</p>
              </div>
            ) : (
              notepadData.todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                    todo.important
                      ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-300 dark:border-red-700 hover:border-red-400 dark:hover:border-red-600'
                      : todo.completed 
                        ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-gray-300 dark:border-gray-600' 
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-600'
                  }`}
                >
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 hover:scale-110 ${
                      todo.completed
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 border-green-600 text-white shadow-lg'
                        : 'border-gray-400 dark:border-gray-500 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'
                    }`}
                  >
                    {todo.completed && <CheckIcon className="h-4 w-4" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      todo.completed 
                        ? 'line-through text-gray-500 dark:text-gray-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {todo.text}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <label className={`flex items-center gap-1 px-2 py-1 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                      todo.important 
                        ? 'bg-red-100 dark:bg-red-900/30' 
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20'
                    }`}>
                      <input
                        type="checkbox"
                        checked={todo.important}
                        onChange={() => toggleTodoImportant(todo.id)}
                        className="hidden"
                      />
                      <span className="text-base" title="Marquer comme important">
                        {todo.important ? '⚠️' : '⚪'}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 flex items-center justify-center hover:scale-110 opacity-0 group-hover:opacity-100"
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
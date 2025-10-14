'use client'
import { useState, useEffect } from 'react'
// import { useSession } from 'next-auth/react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface AdminTask {
  id?: number;
  chantierId: string;
  taskType: string;
  title: string;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  user: {
    name: string;
  } | null;
  category?: string;
}

export function AdminTasksContent({ chantierId }: { chantierId: string }) {
  // const { data: session } = useSession()
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chantierId])

  const fetchTasks = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/chantiers/${chantierId}/admin-tasks`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      const data = await response.json()
      setTasks(data)
    } catch (error: unknown) {
      console.error('Erreur lors de la récupération des tâches:', error)
      setError(`Erreur lors de la récupération des tâches: ${(error as Error).message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (taskType: string) => {
    try {
      setError(null)
      console.log(`Mise à jour de la tâche ${taskType} pour le chantier ${chantierId}`)
      
      const response = await fetch(`/api/chantiers/${chantierId}/admin-tasks/${taskType}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Réponse d\'erreur:', response.status, errorData)
        throw new Error(`Erreur ${response.status}: ${errorData.error || response.statusText}`)
      }
      
      const data = await response.json()
      console.log('Réponse de mise à jour:', data)
      
      setTasks(prevTasks => {
        const updatedTasks = [...prevTasks]
        const taskIndex = updatedTasks.findIndex(t => t.taskType === taskType)
        
        if (taskIndex >= 0) {
          updatedTasks[taskIndex] = data
        } else {
          updatedTasks.push(data)
        }
        
        return updatedTasks
      })
    } catch (error: unknown) {
      console.error('Erreur lors de la mise à jour de la tâche:', error)
      setError(`Erreur lors de la mise à jour de la tâche: ${(error as Error).message}`)
    }
  }

  if (loading) return <div>Chargement...</div>

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">
          {error}
        </div>
      )}
      
      {tasks.map((task) => {
        return (
          <div key={task.taskType} className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleToggleTask(task.taskType)}
              className={`flex items-center justify-center w-5 h-5 border-2 rounded mr-3 flex-shrink-0
                hover:border-green-600 dark:hover:border-green-500 transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800
                disabled:opacity-50
                ${task?.completed ? 'border-green-600 bg-green-600 dark:border-green-500 dark:bg-green-500' : 'border-gray-300 dark:border-gray-600'}`}
            >
              {task?.completed && <CheckIcon className="w-4 h-4 text-white" />}
            </button>
            
            <div className="flex-grow">
              <span className={`text-gray-700 dark:text-gray-200 ${task?.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                {task.title}
              </span>
              
              {task?.completed && task.completedAt && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Validé par {task.user?.name || 'Utilisateur inconnu'} le{' '}
                  {format(new Date(task.completedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {tasks.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          Aucune tâche administrative configurée ou disponible pour ce chantier.
        </div>
      )}
    </div>
  )
} 
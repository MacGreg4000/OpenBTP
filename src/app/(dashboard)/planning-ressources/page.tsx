'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/PageHeader'
import { CalendarIcon, PlusIcon, UserIcon, BuildingOfficeIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import ResourceScheduler from '@/components/planning/ResourceScheduler'
import TaskModal from '@/components/planning/TaskModal'
import { useNotification } from '@/hooks/useNotification'

interface Chantier {
  chantierId: string
  nomChantier: string
  statut: string
}

interface OuvrierInterne {
  id: string
  nom: string
  prenom: string
  poste?: string
}

interface Soustraitant {
  id: string
  nom: string
}

interface TaskData {
  id?: string
  title: string
  description?: string
  start: string
  end: string
  status: 'PREVU' | 'EN_COURS' | 'TERMINE'
  chantierId?: string
  ouvrierInterneIds: string[]
  soustraitantIds: string[]
}

interface TaskOuvrierInterne {
  ouvrierInterneId: string;
  ouvrierInterne: {
    id: string;
    nom: string;
    prenom: string;
    poste?: string;
  };
}

interface TaskSousTraitant {
  sousTraitantId: string;
  sousTraitant: {
    nom: string;
  };
}

interface Task {
  id: string
  title: string
  description?: string
  start: string
  end: string
  status: 'PREVU' | 'EN_COURS' | 'TERMINE'
  chantierId?: string
  chantier?: {
    nomChantier: string;
    chantierId: string;
  };
  ouvriersInternes: TaskOuvrierInterne[]
  sousTraitants: TaskSousTraitant[]
  originalTaskId?: string;
  dayIndex?: number;
  isMultiDay?: boolean;
  taskDate?: string;
}

export default function PlanningRessourcesPage() {
  const router = useRouter()
  const { showNotification, NotificationComponent } = useNotification()
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskData | null>(null)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [ouvriersInternes, setOuvriersInternes] = useState<OuvrierInterne[]>([])
  const [soustraitants, setSoustraitants] = useState<Soustraitant[]>([])
  const [loading, setLoading] = useState(true)

  // Charger les données initiales
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Charger les chantiers en cours
        const chantiersResponse = await fetch('/api/planning/chantiers')
        if (chantiersResponse.ok) {
          const chantiersData = await chantiersResponse.json()
          setChantiers(Array.isArray(chantiersData) ? chantiersData : [])
        } else {
          console.error('Erreur lors du chargement des chantiers')
          setChantiers([])
        }

        // Charger les ouvriers internes
        const ouvriersResponse = await fetch('/api/planning/ouvriers-internes')
        const ouvriersData = await ouvriersResponse.json()
        setOuvriersInternes(ouvriersData)

        // Charger les sous-traitants
        const soustraitantsResponse = await fetch('/api/planning/soustraitants')
        const soustraitantsData = await soustraitantsResponse.json()
        setSoustraitants(soustraitantsData)

      } catch (error) {
        console.error('Erreur lors du chargement des données:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleCreateTask = () => {
    setEditingTask(null)
    setShowTaskModal(true)
  }

  const handleEditTask = (task: Task) => {
    // Convertir Task vers TaskData
    const taskData: TaskData = {
      id: task.id,
      title: task.title,
      description: task.description,
      start: task.start,
      end: task.end,
      status: task.status,
      chantierId: task.chantierId,
      ouvrierInterneIds: task.ouvriersInternes?.map(oi => oi.ouvrierInterneId) || [],
      soustraitantIds: task.sousTraitants?.map(st => st.sousTraitantId) || []
    }
    setEditingTask(taskData)
    setShowTaskModal(true)
  }

  const handleSaveTask = async (taskData: TaskData) => {
    try {
      const url = taskData.id 
        ? `/api/planning/tasks/${taskData.id}`
        : '/api/planning/tasks'
      
      const method = taskData.id ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        // Fermer la modal
        setShowTaskModal(false)
        setEditingTask(null)
        // Recharger le planning
        window.location.reload()
      } else {
        console.error('Erreur lors de la sauvegarde de la tâche')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la tâche:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    // Si c'est une tâche individualisée (multi-jours), on demande confirmation spécifique
    const isIndividualTask = taskId.includes('-') && taskId.split('-').length > 1;
    
    let confirmMessage = 'Êtes-vous sûr de vouloir supprimer cette tâche ?';
    if (isIndividualTask) {
      confirmMessage = 'Êtes-vous sûr de vouloir supprimer cette journée de la tâche ?\n\nCela ne supprimera que ce jour spécifique, pas toute la tâche multi-jours.';
    }
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // Si c'est une tâche individualisée, on supprime seulement cette journée
      if (isIndividualTask) {
        // Extraire l'ID de la tâche originale et la date
        // Format: originalTaskId-YYYY-MM-DD
        const lastDashIndex = taskId.lastIndexOf('-');
        const secondLastDashIndex = taskId.lastIndexOf('-', lastDashIndex - 1);
        const thirdLastDashIndex = taskId.lastIndexOf('-', secondLastDashIndex - 1);
        
        const originalTaskId = taskId.substring(0, thirdLastDashIndex);
        const date = taskId.substring(thirdLastDashIndex + 1); // YYYY-MM-DD
        
        console.log('Suppression de journée:', { originalTaskId, date, taskId })
        
        const response = await fetch(`/api/planning/tasks/${originalTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'removeDay',
            date: date
          })
        })

      if (response.ok) {
        // Recharger le planning
        router.refresh()
        // Force le rechargement complet de la page après un court délai
        setTimeout(() => window.location.reload(), 100)
      } else {
        const errorData = await response.json()
        console.error('Erreur lors de la suppression de la journée:', errorData.error)
        showNotification('Erreur', 'Erreur lors de la suppression de la journée: ' + errorData.error, 'error')
      }
      return
    }

    // Sinon, suppression normale de la tâche complète
    const response = await fetch(`/api/planning/tasks/${taskId}`, {
      method: 'DELETE',
    })

    if (response.ok) {
      // Recharger le planning
      router.refresh()
      // Force le rechargement complet de la page après un court délai
      setTimeout(() => window.location.reload(), 100)
    } else {
      console.error('Erreur lors de la suppression de la tâche')
    }
    } catch (error) {
      console.error('Erreur lors de la suppression de la tâche:', error)
    }
  }

  const handleAddTask = (resourceId: string, date: string) => {
    // Créer une tâche par défaut pour cette ressource et cette date
    const defaultTask: TaskData = {
      title: '',
      description: '',
      start: new Date(`${date}T09:00`).toISOString().slice(0, 16),
      end: new Date(`${date}T17:00`).toISOString().slice(0, 16),
      status: 'PREVU',
      chantierId: '',
      ouvrierInterneIds: [],
      soustraitantIds: []
    }

    // Pré-remplir les ressources selon le type
    if (resourceId.startsWith('ouvrier-')) {
      defaultTask.ouvrierInterneIds = [resourceId.replace('ouvrier-', '')]
    } else if (resourceId.startsWith('soustraitant-')) {
      defaultTask.soustraitantIds = [resourceId.replace('soustraitant-', '')]
    }

    setEditingTask(defaultTask)
    setShowTaskModal(true)
  }

  const handleExportPDF = async () => {
    try {
      console.log('🚀 Début de l\'export PDF...');
      const response = await fetch('/api/planning/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        console.log('✅ Réponse OK, téléchargement du PDF...');
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `planning-ressources-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log('✅ PDF téléchargé avec succès');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('❌ Erreur lors de l\'export PDF:', errorData);
        showNotification('Erreur', `Erreur lors de l'export PDF: ${errorData.details || errorData.error || 'Erreur inconnue'}`, 'error');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'export PDF:', error)
      showNotification('Erreur', `Erreur lors de l'export PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`, 'error')
    }
  }

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Ouvriers</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{ouvriersInternes.length}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Sous-traitants</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{soustraitants.length}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Chantiers</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{chantiers.length}</div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-rose-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-8">
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement du planning...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-rose-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Planning des Ressources"
        subtitle="Planification et affectation des ressources humaines avec drag & drop"
        icon={CalendarIcon}
        badgeColor="from-orange-600 via-rose-600 to-pink-700"
        gradientColor="from-orange-600/10 via-rose-600/10 to-pink-700/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-orange-600 to-rose-700 hover:from-orange-700 hover:to-rose-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={handleCreateTask}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-orange-600 to-rose-700 hover:from-orange-700 hover:to-rose-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Nouvelle tâche</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        }
      />

      {/* Container du planning */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <ResourceScheduler
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      </div>

      {/* Modal de création/édition de tâche */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSave={handleSaveTask}
        task={editingTask}
        chantiers={chantiers}
        ouvriersInternes={ouvriersInternes}
        soustraitants={soustraitants}
      />
      <NotificationComponent />
    </div>
  )
}


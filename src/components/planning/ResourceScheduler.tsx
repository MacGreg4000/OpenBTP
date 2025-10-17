'use client';

import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  UserIcon, 
  BuildingOfficeIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

// Types
interface OuvrierInterne {
  id: string;
  nom: string;
  prenom: string;
  poste?: string;
}

interface Soustraitant {
  id: string;
  nom: string;
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
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  status: 'PREVU' | 'EN_COURS' | 'TERMINE';
  chantierId?: string;
  chantier?: {
    nomChantier: string;
    chantierId: string;
  };
  ouvriersInternes: TaskOuvrierInterne[];
  sousTraitants: TaskSousTraitant[];
  // Champs pour l'individualisation des tâches multi-jours
  originalTaskId?: string;
  dayIndex?: number;
  isMultiDay?: boolean;
  taskDate?: string;
}

// Système de couleurs pour les tâches
const TASK_COLORS = {
  // Couleur fixe pour les tâches libres
  LIBRE: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-800 dark:text-gray-200'
  },
  // Palette de couleurs pour les chantiers
  CHANTIER: [
    {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-200'
    },
    {
      bg: 'bg-green-100 dark:bg-green-900/30',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-800 dark:text-green-200'
    },
    {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-purple-300 dark:border-purple-700',
      text: 'text-purple-800 dark:text-purple-200'
    },
    {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      border: 'border-orange-300 dark:border-orange-700',
      text: 'text-orange-800 dark:text-orange-200'
    },
    {
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      border: 'border-pink-300 dark:border-pink-700',
      text: 'text-pink-800 dark:text-pink-200'
    },
    {
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      border: 'border-indigo-300 dark:border-indigo-700',
      text: 'text-indigo-800 dark:text-indigo-200'
    },
    {
      bg: 'bg-teal-100 dark:bg-teal-900/30',
      border: 'border-teal-300 dark:border-teal-700',
      text: 'text-teal-800 dark:text-teal-200'
    },
    {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      border: 'border-amber-300 dark:border-amber-700',
      text: 'text-amber-800 dark:text-amber-200'
    }
  ]
};

// Fonction pour obtenir la couleur d'une tâche
const getTaskColor = (task: Task, chantierColorMap: Map<string, number>): typeof TASK_COLORS.LIBRE | typeof TASK_COLORS.CHANTIER[0] => {
  if (!task.chantierId || !task.chantier) {
    return TASK_COLORS.LIBRE;
  }
  
  const colorIndex = chantierColorMap.get(task.chantierId) || 0;
  return TASK_COLORS.CHANTIER[colorIndex % TASK_COLORS.CHANTIER.length];
};

interface TaskOuvrierInterne {
  id: string;
  taskId: string;
  ouvrierInterneId: string;
  ouvrierInterne: {
    id: string;
    nom: string;
    prenom: string;
    poste?: string;
  };
}

interface TaskSousTraitant {
  id: string;
  taskId: string;
  soustraitantId: string;
  soustraitant: {
    id: string;
    nom: string;
  };
}

interface Resource {
  id: string;
  name: string;
  type: 'ouvrier' | 'soustraitant';
  poste?: string;
  tasks: Task[];
}

interface TimeSlot {
  date: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
}

// Composant Task Card
function TaskCard({ task, onEdit, onDelete, chantierColorMap }: { 
  task: Task; 
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  chantierColorMap: Map<string, number>;
}) {

  const colors = getTaskColor(task, chantierColorMap);

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-1">
        <h4 className={`font-medium ${colors.text} text-xs`}>
          {task.title}
        </h4>
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="p-1 text-gray-400 hover:text-blue-600"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 text-gray-400 hover:text-red-600"
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      {task.chantierId && (
        <div className="flex items-center gap-1 mb-1">
          <BuildingOfficeIcon className="h-2 w-2 text-gray-400" />
          <span className={`text-xs ${colors.text}`}>
            {task.chantier?.nomChantier || `Chantier ${task.chantierId}`}
            {task.isMultiDay && (
              <span className="ml-1 opacity-75">(multi-jours)</span>
            )}
          </span>
        </div>
      )}
      
      <div className="flex items-center justify-end">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {new Date(task.start).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - {new Date(task.end).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// Composant Time Slot (colonne jour)
function TimeSlot({ slot, tasks, onAddTask, onEditTask, onDeleteTask, chantierColorMap }: {
  slot: TimeSlot;
  tasks: Task[];
  onAddTask: (date: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  chantierColorMap: Map<string, number>;
}) {
  return (
    <div className={`border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${
      slot.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
    } ${slot.dayName === 'dim.' ? 'bg-gray-100 dark:bg-gray-800' : slot.dayName === 'sam.' ? 'bg-gray-50 dark:bg-gray-700' : 'bg-white dark:bg-gray-600'}`}
    style={{ width: '140px' }}>
      {/* Zone de tâches */}
      <div className="min-h-[120px] p-2">
        <div className="space-y-1 mb-2">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              chantierColorMap={chantierColorMap}
            />
          ))}
        </div>
        
        {/* Bouton pour ajouter une tâche */}
        <button
          onClick={() => onAddTask(slot.date)}
          className="w-full p-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors text-xs flex items-center justify-center gap-1"
        >
          <PlusIcon className="h-3 w-3" />
          Ajouter
        </button>
      </div>
    </div>
  );
}

// Composant Resource Row (ligne ressource)
function ResourceRow({ resource, timeSlots, tasksByDate, onAddTask, onEditTask, onDeleteTask, chantierColorMap }: {
  resource: Resource;
  timeSlots: TimeSlot[];
  tasksByDate: Record<string, Task[]>;
  onAddTask: (resourceId: string, date: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  chantierColorMap: Map<string, number>;
}) {
  return (
    <div className="flex border-b border-gray-200 dark:border-gray-700">
      {/* Colonne ressource */}
      <div className="p-2 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center flex-shrink-0" style={{ width: '156px' }}>
        <div className="flex items-center gap-2">
          {resource.type === 'ouvrier' ? (
            <UserIcon className="h-4 w-4 text-blue-600" />
          ) : (
            <BuildingOfficeIcon className="h-4 w-4 text-green-600" />
          )}
          <div>
            <div className="font-medium text-gray-900 dark:text-white text-sm">
              {resource.name}
            </div>
            {resource.poste && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {resource.poste}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonnes de temps */}
      {timeSlots.map(slot => (
        <TimeSlot
          key={slot.date}
          slot={slot}
          tasks={tasksByDate[slot.date] || []}
          onAddTask={(date) => onAddTask(resource.id, date)}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
          chantierColorMap={chantierColorMap}
        />
      ))}
    </div>
  );
}

// Composant principal
interface ResourceSchedulerProps {
  onAddTask: (resourceId: string, date: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function ResourceScheduler({ onAddTask, onEditTask, onDeleteTask }: ResourceSchedulerProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [tasksByResourceAndDate, setTasksByResourceAndDate] = useState<Record<string, Record<string, Task[]>>>({});
  const [chantierColorMap, setChantierColorMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Générer les créneaux horaires (7 jours complets : lundi à dimanche)
  useEffect(() => {
    const generateTimeSlots = () => {
      const slots: TimeSlot[] = [];
      const today = new Date();
      
      // Trouver le lundi de la semaine courante
      const monday = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche, 6 jours en arrière
      monday.setDate(today.getDate() - daysFromMonday);
      
      // Générer 7 jours à partir du lundi
      for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        
        slots.push({
          date: date.toISOString().split('T')[0],
          dayName: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
          dayNumber: date.getDate(),
          isToday: date.toDateString() === today.toDateString(),
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        });
      }
      
      setTimeSlots(slots);
    };

    generateTimeSlots();
  }, []);

  // Charger les ressources et tâches
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Charger les ouvriers internes
        const ouvriersResponse = await fetch('/api/planning/ouvriers-internes');
        const ouvriers = await ouvriersResponse.json();
        
        // Charger les sous-traitants
        const soustraitantsResponse = await fetch('/api/planning/soustraitants');
        const soustraitants = await soustraitantsResponse.json();
        
        // Charger les tâches
        const tasksResponse = await fetch('/api/planning/tasks');
        const tasks = await tasksResponse.json();
        
        // Créer le mapping des couleurs pour les chantiers
        const colorMap = new Map<string, number>();
        let colorIndex = 0;
        tasks.forEach((task: Task) => {
          if (task.chantierId && !colorMap.has(task.chantierId)) {
            colorMap.set(task.chantierId, colorIndex);
            colorIndex++;
          }
        });
        setChantierColorMap(colorMap);
        
        // Construire la liste des ressources
        const allResources: Resource[] = [
          ...ouvriers.map((ouvrier: OuvrierInterne) => ({
            id: `ouvrier-${ouvrier.id}`,
            name: `${ouvrier.prenom} ${ouvrier.nom}`,
            type: 'ouvrier' as const,
            poste: ouvrier.poste,
            tasks: []
          })),
          ...soustraitants.map((soustraitant: Soustraitant) => ({
            id: `soustraitant-${soustraitant.id}`,
            name: soustraitant.nom,
            type: 'soustraitant' as const,
            tasks: []
          }))
        ];
        
        setResources(allResources);
        
        // Organiser les tâches par ressource et date
        const tasksByResourceAndDate: Record<string, Record<string, Task[]>> = {};
        
        allResources.forEach(resource => {
          tasksByResourceAndDate[resource.id] = {};
          timeSlots.forEach(slot => {
            tasksByResourceAndDate[resource.id][slot.date] = [];
          });
        });
        
        // Distribuer les tâches existantes
        tasks.forEach((task: Task) => {
          const startDate = new Date(task.start);
          const endDate = new Date(task.end);
          
          // Calculer tous les jours couverts par la tâche
          const taskDates = [];
          const currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            taskDates.push(currentDate.toISOString().split('T')[0]);
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Tâches assignées aux ouvriers internes
          task.ouvriersInternes.forEach(assignment => {
            const resourceId = `ouvrier-${assignment.ouvrierInterneId}`;
            if (tasksByResourceAndDate[resourceId]) {
              taskDates.forEach((taskDate, index) => {
                if (tasksByResourceAndDate[resourceId][taskDate]) {
                  // Créer une tâche individuelle pour chaque jour
                  const individualTask = {
                    ...task,
                    id: `${task.id}-${taskDate}`, // ID unique pour chaque jour
                    start: new Date(taskDate + 'T' + new Date(task.start).toTimeString().slice(0, 8)).toISOString(),
                    end: new Date(taskDate + 'T' + new Date(task.end).toTimeString().slice(0, 8)).toISOString(),
                    originalTaskId: task.id, // Garder référence à la tâche originale
                    dayIndex: index, // Index du jour dans la tâche multi-jours
                    isMultiDay: taskDates.length > 1, // Indicateur de tâche multi-jours
                    taskDate: taskDate // Date spécifique de cette instance
                  };
                  tasksByResourceAndDate[resourceId][taskDate].push(individualTask);
                }
              });
            }
          });
          
          // Tâches assignées aux sous-traitants
          task.sousTraitants.forEach(assignment => {
            const resourceId = `soustraitant-${assignment.soustraitantId}`;
            if (tasksByResourceAndDate[resourceId]) {
              taskDates.forEach((taskDate, index) => {
                if (tasksByResourceAndDate[resourceId][taskDate]) {
                  // Créer une tâche individuelle pour chaque jour
                  const individualTask = {
                    ...task,
                    id: `${task.id}-${taskDate}`, // ID unique pour chaque jour
                    start: new Date(taskDate + 'T' + new Date(task.start).toTimeString().slice(0, 8)).toISOString(),
                    end: new Date(taskDate + 'T' + new Date(task.end).toTimeString().slice(0, 8)).toISOString(),
                    originalTaskId: task.id, // Garder référence à la tâche originale
                    dayIndex: index, // Index du jour dans la tâche multi-jours
                    isMultiDay: taskDates.length > 1, // Indicateur de tâche multi-jours
                    taskDate: taskDate // Date spécifique de cette instance
                  };
                  tasksByResourceAndDate[resourceId][taskDate].push(individualTask);
                }
              });
            }
          });
        });
        
        setTasksByResourceAndDate(tasksByResourceAndDate);
        
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    if (timeSlots.length > 0) {
      loadData();
    }
  }, [timeSlots]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Container avec scroll synchronisé */}
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* En-tête */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
                <div className="w-48 p-2 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ width: '156px' }}>
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                Ressources
              </h3>
            </div>
            {timeSlots.map(slot => (
              <div
                key={slot.date}
                  className={`p-2 text-center border-r border-gray-200 dark:border-gray-700 flex-shrink-0 ${
                  slot.isToday ? 'bg-blue-100 dark:bg-blue-900/30' : 
                  slot.dayName === 'dim.' ? 'bg-gray-200 dark:bg-gray-800' : 
                  slot.dayName === 'sam.' ? 'bg-gray-100 dark:bg-gray-700' : 
                  'bg-gray-100 dark:bg-gray-900'
                }`}
                style={{ width: '140px' }}
              >
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {slot.dayName}
                </div>
                <div className={`text-sm font-bold ${
                  slot.isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {slot.dayNumber}
                </div>
              </div>
            ))}
          </div>

          {/* Corps du planning */}
          {resources.map(resource => (
            <ResourceRow
              key={resource.id}
              resource={resource}
              timeSlots={timeSlots}
              tasksByDate={tasksByResourceAndDate[resource.id] || {}}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              chantierColorMap={chantierColorMap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

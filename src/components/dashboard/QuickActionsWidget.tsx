'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  BuildingOffice2Icon, 
  UserGroupIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  ChartBarIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
  hoverColor: string
  shortcut?: string
}

const quickActions: QuickAction[] = [
  {
    id: 'nouveau-chantier',
    title: 'Nouveau chantier',
    description: 'Créer un nouveau projet',
    icon: BuildingOffice2Icon,
    href: '/chantiers/nouveau',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
    shortcut: 'N'
  },
  {
    id: 'bon-regie',
    title: 'Bon de régie',
    description: 'Créer un nouveau bon',
    icon: DocumentTextIcon,
    href: '/public/bon-regie',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    hoverColor: 'hover:bg-green-100',
    shortcut: 'B'
  },
  {
    id: 'planning',
    title: 'Planning',
    description: 'Voir le planning général',
    icon: CalendarIcon,
    href: '/planning',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    hoverColor: 'hover:bg-purple-100',
    shortcut: 'P'
  },
  {
    id: 'sous-traitants',
    title: 'Sous-traitants',
    description: 'Gérer les sous-traitants',
    icon: UserGroupIcon,
    href: '/sous-traitants',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    hoverColor: 'hover:bg-orange-100',
    shortcut: 'S'
  },
  {
    id: 'rapports',
    title: 'Rapports',
    description: 'Consulter les statistiques',
    icon: ChartBarIcon,
    href: '/rapports',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    hoverColor: 'hover:bg-indigo-100',
    shortcut: 'R'
  },
  {
    id: 'outillage',
    title: 'Outillage',
    description: 'Gérer l\'inventaire',
    icon: CogIcon,
    href: '/outillage',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
    shortcut: 'O'
  }
]

export default function QuickActionsWidget() {
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const action = quickActions.find(a => a.shortcut?.toLowerCase() === e.key.toLowerCase())
        if (action) {
          e.preventDefault()
          window.location.href = action.href
        }
      }
      
      // Afficher/masquer les raccourcis avec ?
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setShowShortcuts(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showShortcuts])

  return (
    <div className="space-y-4">
      {/* Actions principales - layout horizontal */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            onMouseEnter={() => setSelectedAction(action.id)}
            onMouseLeave={() => setSelectedAction(null)}
            className={`
              group relative p-4 rounded-lg border transition-all duration-200 
              ${action.bgColor} ${action.hoverColor} 
              border-gray-200 dark:border-gray-600
              hover:shadow-md hover:scale-105
              ${selectedAction === action.id ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
            `}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                <action.icon className="h-6 w-6" />
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {action.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {action.description}
                </p>
              </div>

              {action.shortcut && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs bg-gray-800 text-white px-2 py-1 rounded">
                    Ctrl+{action.shortcut}
                  </span>
                </div>
              )}
            </div>

            {/* Effet de survol */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
          </Link>
        ))}
      </div>

      {/* Actions fréquentes en ligne */}
      <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Accès rapide :
        </span>
        
        <Link
          href="/chantiers"
          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ClipboardDocumentListIcon className="h-4 w-4" />
          <span>Tous les chantiers</span>
        </Link>
        
        <Link
          href="/clients"
          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <UserGroupIcon className="h-4 w-4" />
          <span>Clients</span>
        </Link>
        

        {/* Bouton aide raccourcis */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="ml-auto flex items-center space-x-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <LightBulbIcon className="h-4 w-4" />
          <span>Raccourcis</span>
        </button>
      </div>

      {/* Guide des raccourcis */}
      {showShortcuts && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
            Raccourcis clavier disponibles :
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-700 dark:text-blue-300">
            {quickActions.filter(a => a.shortcut).map(action => (
              <div key={action.id} className="flex justify-between">
                <span className="font-mono bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded">
                  Ctrl+{action.shortcut}
                </span>
                <span className="truncate ml-2">{action.title}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            💡 Appuyez sur <kbd className="bg-blue-100 dark:bg-blue-800/50 px-1 rounded">?</kbd> pour afficher/masquer cette aide
          </p>
        </div>
      )}
    </div>
  )
} 
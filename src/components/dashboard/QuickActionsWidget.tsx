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
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'from-blue-50 to-indigo-50',
    hoverColor: 'shadow-blue-500/30',
    shortcut: 'N'
  },
  {
    id: 'bon-regie',
    title: 'Bon de régie',
    description: 'Créer un nouveau bon',
    icon: DocumentTextIcon,
    href: '/public/bon-regie',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'from-emerald-50 to-teal-50',
    hoverColor: 'shadow-emerald-500/30',
    shortcut: 'B'
  },
  {
    id: 'planning',
    title: 'Planning',
    description: 'Voir le planning général',
    icon: CalendarIcon,
    href: '/planning',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'from-purple-50 to-pink-50',
    hoverColor: 'shadow-purple-500/30',
    shortcut: 'P'
  },
  {
    id: 'sous-traitants',
    title: 'Sous-traitants',
    description: 'Gérer les sous-traitants',
    icon: UserGroupIcon,
    href: '/sous-traitants',
    color: 'from-orange-500 to-red-600',
    bgColor: 'from-orange-50 to-red-50',
    hoverColor: 'shadow-orange-500/30',
    shortcut: 'S'
  },
  {
    id: 'rapports',
    title: 'Rapports',
    description: 'Consulter les statistiques',
    icon: ChartBarIcon,
    href: '/rapports',
    color: 'from-indigo-500 to-purple-600',
    bgColor: 'from-indigo-50 to-purple-50',
    hoverColor: 'shadow-indigo-500/30',
    shortcut: 'R'
  },
  {
    id: 'outillage',
    title: 'Outillage',
    description: 'Gérer l\'inventaire',
    icon: CogIcon,
    href: '/outillage',
    color: 'from-gray-500 to-slate-600',
    bgColor: 'from-gray-50 to-slate-50',
    hoverColor: 'shadow-gray-500/30',
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
      {/* Actions principales - layout horizontal moderne */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            onMouseEnter={() => setSelectedAction(action.id)}
            onMouseLeave={() => setSelectedAction(null)}
            className={`
              group relative overflow-hidden rounded-2xl border-2 transition-all duration-300
              bg-gradient-to-br ${action.bgColor} dark:from-gray-700 dark:to-gray-800
              border-gray-200 dark:border-gray-600
              hover:shadow-2xl hover:scale-105 hover:-translate-y-1 ${action.hoverColor}
              ${selectedAction === action.id ? 'ring-4 ring-blue-500/30 scale-105' : ''}
            `}
          >
            <div className="relative z-10 p-5 flex flex-col items-center text-center space-y-3">
              {/* Icône avec gradient */}
              <div className={`relative p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg ${action.hoverColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <action.icon className="h-7 w-7 text-white" />
                <div className="absolute inset-0 bg-white/30 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {action.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {action.description}
                </p>
              </div>

              {/* Badge raccourci moderne */}
              {action.shortcut && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                  <span className="flex items-center gap-1 text-xs bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-2.5 py-1 rounded-lg font-mono font-bold shadow-lg backdrop-blur-sm">
                    <kbd className="text-xs">⌘</kbd>
                    {action.shortcut}
                  </span>
                </div>
              )}
            </div>

            {/* Effet de brillance animé */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/30 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 transform group-hover:translate-x-full" style={{ transform: 'translateX(-100%) skewX(-15deg)' }} />
            
            {/* Bordure lumineuse au hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-transparent via-white/10 to-transparent"></div>
          </Link>
        ))}
      </div>

      {/* Actions fréquentes en ligne - modernisées */}
      <div className="flex flex-wrap items-center gap-3 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Accès rapide :
        </span>
        
        <Link
          href="/chantiers"
          className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          <ClipboardDocumentListIcon className="h-4 w-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Tous les chantiers</span>
        </Link>
        
        <Link
          href="/clients"
          className="group flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 dark:hover:from-gray-600 dark:hover:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105"
        >
          <UserGroupIcon className="h-4 w-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
          <span className="group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Clients</span>
        </Link>
        

        {/* Bouton aide raccourcis moderne */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`ml-auto flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 ${
            showShortcuts
              ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white'
              : 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-700 hover:bg-gradient-to-r hover:from-amber-50 hover:to-yellow-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
          }`}
        >
          <LightBulbIcon className="h-4 w-4" />
          <span>Raccourcis</span>
        </button>
      </div>

      {/* Guide des raccourcis moderne */}
      {showShortcuts && (
        <div className="p-6 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 rounded-2xl border-2 border-amber-200 dark:border-amber-800/50 shadow-xl animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <LightBulbIcon className="h-5 w-5 text-white" />
            </div>
            <h4 className="text-base font-bold text-amber-900 dark:text-amber-200">
              Raccourcis clavier disponibles
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickActions.filter(a => a.shortcut).map(action => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-700 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-105">
                <span className="flex items-center gap-2 font-mono text-sm bg-gradient-to-r from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 text-white dark:text-gray-900 px-3 py-1.5 rounded-lg font-bold shadow-lg">
                  <kbd className="text-xs">⌘</kbd>
                  {action.shortcut}
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate ml-3">{action.title}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-amber-200 dark:border-amber-700">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="text-lg">💡</span>
              Appuyez sur 
              <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-800/50 border border-amber-300 dark:border-amber-600 rounded-lg font-mono text-amber-900 dark:text-amber-200">?</kbd>
              pour afficher/masquer cette aide
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 
'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { 
  DocumentTextIcon, 
  BuildingOffice2Icon, 
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

interface QuickAction {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  bgColor: string
  hoverColor: string
  shortcut?: string
}

const quickActions: QuickAction[] = [
  {
    id: 'devis',
    title: 'Devis',
    icon: DocumentTextIcon,
    href: '/devis',
    color: 'from-blue-500 to-indigo-600',
    bgColor: 'from-blue-50 to-indigo-50',
    hoverColor: 'shadow-blue-500/30',
    shortcut: 'D'
  },
  {
    id: 'chantiers',
    title: 'Chantiers',
    icon: BuildingOffice2Icon,
    href: '/chantiers',
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'from-emerald-50 to-teal-50',
    hoverColor: 'shadow-emerald-500/30',
    shortcut: 'C'
  },
  {
    id: 'clients',
    title: 'Clients',
    icon: UsersIcon,
    href: '/clients',
    color: 'from-purple-500 to-pink-600',
    bgColor: 'from-purple-50 to-pink-50',
    hoverColor: 'shadow-purple-500/30',
    shortcut: 'L'
  },
  {
    id: 'sous-traitants',
    title: 'Sous-traitants',
    icon: UserGroupIcon,
    href: '/sous-traitants',
    color: 'from-orange-500 to-red-600',
    bgColor: 'from-orange-50 to-red-50',
    hoverColor: 'shadow-orange-500/30',
    shortcut: 'S'
  },
  {
    id: 'planning',
    title: 'Planning',
    icon: CalendarIcon,
    href: '/planning',
    color: 'from-indigo-500 to-purple-600',
    bgColor: 'from-indigo-50 to-purple-50',
    hoverColor: 'shadow-indigo-500/30',
    shortcut: 'P'
  },
  {
    id: 'journal',
    title: 'Journal',
    icon: CalendarDaysIcon,
    href: '/journal',
    color: 'from-gray-500 to-slate-600',
    bgColor: 'from-gray-50 to-slate-50',
    hoverColor: 'shadow-gray-500/30',
    shortcut: 'J'
  }
]

export default function QuickActionsWidget() {
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
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div>
      {/* Actions principales - layout horizontal simplifié */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {quickActions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className={`
              group relative overflow-hidden rounded-xl border transition-all duration-200
              bg-gradient-to-br ${action.bgColor} dark:from-gray-700/50 dark:to-gray-800/50
              border-gray-300 dark:border-gray-600
              hover:shadow-lg hover:scale-105 ${action.hoverColor}
            `}
          >
            <div className="relative z-10 p-3 flex flex-col items-center text-center gap-2">
              {/* Icône avec gradient */}
              <div className={`p-2 rounded-lg bg-gradient-to-br ${action.color} shadow-md group-hover:scale-110 transition-transform duration-200`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              
              <h4 className="font-bold text-gray-900 dark:text-white text-xs group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {action.title}
              </h4>

              {/* Badge raccourci simplifié */}
              {action.shortcut && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] bg-gray-900/80 dark:bg-white/80 text-white dark:text-gray-900 px-1.5 py-0.5 rounded font-mono font-bold">
                    ⌘{action.shortcut}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
} 
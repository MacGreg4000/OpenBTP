'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  DocumentTextIcon, 
  ClipboardDocumentListIcon,
  FolderIcon,
  ChartBarIcon,
  EyeIcon,
  CurrencyEuroIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'

interface ChantierActionsProps {
  chantierId: string
  className?: string
}

export default function ChantierActionsModern({ chantierId, className = '' }: ChantierActionsProps) {
  const pathname = usePathname()

  const actions = [
    {
      href: `/chantiers/${chantierId}`,
      icon: EyeIcon,
      label: 'Consulter',
      color: 'from-gray-500 to-gray-600',
      bgHover: 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
      borderColor: 'border-gray-200 dark:border-gray-700',
      iconColor: 'text-gray-600 dark:text-gray-400',
    },
    {
      href: `/chantiers/${chantierId}/commande`,
      icon: CurrencyEuroIcon,
      label: 'Commande',
      color: 'from-blue-500 to-blue-600',
      bgHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      href: `/chantiers/${chantierId}/etats`,
      icon: ChartBarIcon,
      label: 'États',
      color: 'from-indigo-500 to-indigo-600',
      bgHover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20',
      borderColor: 'border-indigo-200 dark:border-indigo-700',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      href: `/chantiers/${chantierId}/documents`,
      icon: FolderIcon,
      label: 'Documents',
      color: 'from-green-500 to-green-600',
      bgHover: 'hover:bg-green-50 dark:hover:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-700',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      href: `/chantiers/${chantierId}/notes`,
      icon: ClipboardDocumentListIcon,
      label: 'Notes',
      color: 'from-purple-500 to-purple-600',
      bgHover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-700',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      href: `/chantiers/${chantierId}/rapports`,
      icon: DocumentTextIcon,
      label: 'Rapports',
      color: 'from-orange-500 to-orange-600',
      bgHover: 'hover:bg-orange-50 dark:hover:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-700',
      iconColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      href: `/chantiers/${chantierId}/reception`,
      icon: ClipboardDocumentCheckIcon,
      label: 'Réception',
      color: 'from-red-500 to-red-600',
      bgHover: 'hover:bg-red-50 dark:hover:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-700',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    {
      href: `/chantiers/${chantierId}/sav`,
      icon: WrenchScrewdriverIcon,
      label: 'SAV',
      color: 'from-pink-500 to-pink-600',
      bgHover: 'hover:bg-pink-50 dark:hover:bg-pink-900/20',
      borderColor: 'border-pink-200 dark:border-pink-700',
      iconColor: 'text-pink-600 dark:text-pink-400',
    },
  ]

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 ${className}`}>
      {actions.map((action) => {
        const Icon = action.icon
        const active = isActive(action.href)
        
        return (
          <Link
            key={action.href}
            href={action.href}
            className={`
              group relative flex flex-col items-center justify-center
              p-4 rounded-xl border-2 transition-all duration-300
              ${active 
                ? `${action.borderColor} bg-gradient-to-br ${action.color.replace('to-', 'to-opacity-10 ')} shadow-lg scale-105` 
                : `border-gray-200 dark:border-gray-700 ${action.bgHover}`
              }
              hover:scale-105 hover:shadow-xl hover:border-opacity-50
            `}
          >
            {/* Indicateur actif */}
            {active && (
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full bg-gradient-to-br ${action.color} animate-pulse`} />
            )}
            
            {/* Glow effect au hover */}
            <div className={`
              absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
              bg-gradient-to-br ${action.color} blur-xl -z-10
            `} style={{ filter: 'blur(20px)' }} />
            
            {/* Icône */}
            <div className={`
              relative mb-2 transition-all duration-300
              ${active ? 'scale-110' : 'group-hover:scale-110'}
            `}>
              <Icon className={`h-7 w-7 ${action.iconColor} ${active ? 'drop-shadow-lg' : ''}`} />
            </div>
            
            {/* Label */}
            <span className={`
              text-xs font-medium text-center transition-colors duration-300
              ${active 
                ? `${action.iconColor} font-bold` 
                : 'text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white'
              }
            `}>
              {action.label}
            </span>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}


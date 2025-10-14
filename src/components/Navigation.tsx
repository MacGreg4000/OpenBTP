'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  HomeIcon, 
  UserGroupIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

export default function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const navigation = [
    { name: 'Accueil', href: '/', icon: HomeIcon },
    { name: 'Chantiers', href: '/chantiers', icon: BuildingOfficeIcon },
    { name: 'Inventaire', href: '/inventory', icon: CubeIcon },
    { name: 'Administratifs', href: '/administratif', icon: DocumentTextIcon },
    // N'afficher le lien vers les utilisateurs que pour les ADMIN et MANAGER
    ...(session?.user?.role && ['ADMIN', 'MANAGER'].includes(session.user.role) 
      ? [{ name: 'Utilisateurs', href: '/utilisateurs', icon: UserGroupIcon }]
      : []
    ),
  ]

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              group flex items-center px-3 py-2 text-sm font-medium rounded-md
              ${isActive
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <item.icon
              className={`
                mr-3 h-6 w-6 flex-shrink-0
                ${isActive
                  ? 'text-gray-500'
                  : 'text-gray-400 group-hover:text-gray-500'
                }
              `}
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
} 
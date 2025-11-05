'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import {
  HomeIcon,
  BuildingOfficeIcon,
  CameraIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  BuildingOfficeIcon as BuildingOfficeIconSolid,
  CameraIcon as CameraIconSolid,
  DocumentTextIcon as DocumentTextIconSolid,
} from '@heroicons/react/24/solid'

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()

  const navItems = [
    {
      path: '/mobile',
      label: 'Accueil',
      icon: HomeIcon,
      iconSolid: HomeIconSolid,
    },
    {
      path: '/mobile/dashboard',
      label: 'Chantier',
      icon: BuildingOfficeIcon,
      iconSolid: BuildingOfficeIconSolid,
      requiresChantier: true,
    },
    {
      path: '/mobile/photos',
      label: 'Photos',
      icon: CameraIcon,
      iconSolid: CameraIconSolid,
      requiresChantier: true,
    },
    {
      path: '/mobile/notes',
      label: 'Notes',
      icon: DocumentTextIcon,
      iconSolid: DocumentTextIconSolid,
      requiresChantier: true,
    },
  ]

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.requiresChantier && !selectedChantier) {
      router.push('/mobile')
      return
    }
    router.push(item.path)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 safe-area-bottom z-50">
      <div className="max-w-md mx-auto grid grid-cols-4 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = isActive ? item.iconSolid : item.icon
          const isDisabled = item.requiresChantier && !selectedChantier

          return (
            <button
              key={item.path}
              onClick={() => handleNavClick(item)}
              disabled={isDisabled}
              className={`flex flex-col items-center py-2 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : isDisabled
                  ? 'text-gray-300'
                  : 'text-gray-600'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}


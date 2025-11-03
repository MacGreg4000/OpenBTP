'use client'

import { useState, useEffect } from 'react'
import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  badgeColor?: string
  gradientColor?: string
  stats?: ReactNode
  actions?: ReactNode
  infoCard?: ReactNode
  compactThreshold?: number
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  badgeColor = 'from-blue-600 via-indigo-600 to-purple-700',
  gradientColor = 'from-blue-600/10 via-indigo-600/10 to-purple-700/10',
  stats,
  actions,
  infoCard,
  compactThreshold = 100
}: PageHeaderProps) {
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsCompact(window.scrollY > compactThreshold)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [compactThreshold])

  // Couleur du texte basée sur badgeColor
  const getTextColor = () => {
    if (badgeColor.includes('indigo') || badgeColor.includes('purple')) return 'text-indigo-600 dark:text-indigo-400'
    if (badgeColor.includes('amber') || badgeColor.includes('orange')) return 'text-amber-600 dark:text-amber-400'
    if (badgeColor.includes('green') || badgeColor.includes('emerald')) return 'text-green-600 dark:text-green-400'
    if (badgeColor.includes('blue')) return 'text-blue-600 dark:text-blue-400'
    return 'text-blue-600 dark:text-blue-400'
  }

  return (
    <div className="sticky top-16 z-40 pb-4">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
          {/* Effet de brillance en arrière-plan */}
          <div className={`absolute inset-0 bg-gradient-to-r ${gradientColor} dark:${gradientColor.replace('/10', '/5')}`}></div>
          
          <div className={`relative z-10 transition-all duration-300 ${isCompact ? 'py-2 px-4' : 'py-3 sm:py-6 px-4'} sm:px-6 lg:px-8`}>
            <div className={`flex flex-row items-center justify-between gap-2 sm:gap-4 transition-all duration-300`}>
              {/* Titre à gauche */}
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0 min-w-0 flex-1">
                {/* Badge icône */}
                <div className={`bg-gradient-to-br ${badgeColor} rounded-lg sm:rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30 transition-all duration-300 ${isCompact ? 'w-6 h-6 sm:w-8 sm:h-8' : 'w-10 h-10 sm:w-14 sm:h-14'}`}>
                  <Icon className={`text-white transition-all duration-300 ${isCompact ? 'h-3 w-3 sm:h-4 sm:w-4' : 'h-5 w-5 sm:h-8 sm:w-8'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className={`font-black ${getTextColor()} flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 transition-all duration-300 ${isCompact ? 'text-xs sm:text-sm md:text-base' : 'text-base sm:text-xl md:text-2xl'}`}>
                    <span className="truncate">{title}</span>
                    {!isCompact && badge && (
                      <span className={`hidden md:inline px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r ${badgeColor}/20 backdrop-blur-sm rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold border border-gray-300/30 dark:border-gray-600/30 whitespace-nowrap`}>
                        {badge}
                      </span>
                    )}
                  </h1>
                  {!isCompact && subtitle && (
                    <p className="hidden sm:block mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium transition-opacity duration-300">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Stats centrées - Masquées sur mobile */}
              {stats && !isCompact && (
                <div className="hidden lg:flex items-center justify-center flex-1 min-w-0">
                  {stats}
                </div>
              )}

              {/* Actions à droite - Toujours visible, compact sur mobile */}
              {actions && (
                <div className="flex-shrink-0">
                  <div className="scale-90 sm:scale-100 origin-right">
                    {actions}
                  </div>
                </div>
              )}
            </div>
            
            {/* Info card (date, etc.) */}
            {!isCompact && infoCard && (
              <div className="mt-4 text-left sm:text-right">
                {infoCard}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

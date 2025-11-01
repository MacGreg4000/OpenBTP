'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
  accentColor?: 'blue' | 'green' | 'yellow' | 'red' | 'indigo' | 'purple' | 'pink' | 'gray';
  href?: string; // Lien optionnel
}

// Helper pour obtenir les classes de couleur
const getColorClasses = (color: KPICardProps['accentColor']) => {
  switch (color) {
    case 'blue': return { border: 'border-blue-500', bgIcon: 'bg-blue-500', textIcon: 'text-white', ring: 'ring-blue-500' };
    case 'green': return { border: 'border-green-500', bgIcon: 'bg-green-500', textIcon: 'text-white', ring: 'ring-green-500' };
    case 'yellow': return { border: 'border-yellow-500', bgIcon: 'bg-yellow-500', textIcon: 'text-white', ring: 'ring-yellow-500' };
    case 'red': return { border: 'border-red-500', bgIcon: 'bg-red-500', textIcon: 'text-white', ring: 'ring-red-500' };
    case 'indigo': return { border: 'border-indigo-500', bgIcon: 'bg-indigo-500', textIcon: 'text-white', ring: 'ring-indigo-500' };
    case 'purple': return { border: 'border-purple-500', bgIcon: 'bg-purple-500', textIcon: 'text-white', ring: 'ring-purple-500' };
    case 'pink': return { border: 'border-pink-500', bgIcon: 'bg-pink-500', textIcon: 'text-white', ring: 'ring-pink-500' };
    default: return { border: 'border-gray-500', bgIcon: 'bg-gray-500', textIcon: 'text-white', ring: 'ring-gray-500' };
  }
};

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className = '',
  loading = false,
  accentColor = 'indigo', // Couleur par défaut
  href
}: KPICardProps) {
  const colors = getColorClasses(accentColor);

  const content = (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 p-4 ${href ? 'cursor-pointer' : ''} ${className}`}>
      {loading ? (
        <div className="w-full space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Bulle ronde avec icône */}
          {icon && (
            <div className={`flex-shrink-0 w-14 h-14 rounded-full ${colors.bgIcon} ${colors.textIcon} flex items-center justify-center shadow-md ring-2 ${colors.ring} ring-offset-2 ring-offset-white dark:ring-offset-gray-800`}>
              <div className="w-7 h-7"> 
                {icon} 
              </div>
            </div>
          )}
          {/* Contenu compact */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">{title}</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-bold text-gray-900 dark:text-white truncate">{value}</p>
              {trend && (
                <p className={`text-xs font-medium flex-shrink-0 ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{subtitle}</p>}
          </div>
        </div>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : content
} 
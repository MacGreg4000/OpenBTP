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

// Helper pour obtenir les classes de couleur modernes avec gradients
const getColorClasses = (color: KPICardProps['accentColor']) => {
  switch (color) {
    case 'blue': return { 
      border: 'border-blue-200 dark:border-blue-700/50', 
      bgIcon: 'bg-gradient-to-br from-blue-500 to-indigo-600', 
      textIcon: 'text-white', 
      bgCard: 'from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20',
      glow: 'hover:shadow-blue-500/20'
    };
    case 'green': return { 
      border: 'border-green-200 dark:border-green-700/50', 
      bgIcon: 'bg-gradient-to-br from-green-500 to-emerald-600', 
      textIcon: 'text-white', 
      bgCard: 'from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/20',
      glow: 'hover:shadow-green-500/20'
    };
    case 'yellow': return { 
      border: 'border-yellow-200 dark:border-yellow-700/50', 
      bgIcon: 'bg-gradient-to-br from-yellow-500 to-orange-600', 
      textIcon: 'text-white', 
      bgCard: 'from-yellow-50/50 to-orange-50/30 dark:from-yellow-950/20 dark:to-orange-950/20',
      glow: 'hover:shadow-yellow-500/20'
    };
    case 'red': return { 
      border: 'border-red-200 dark:border-red-700/50', 
      bgIcon: 'bg-gradient-to-br from-red-500 to-pink-600', 
      textIcon: 'text-white', 
      bgCard: 'from-red-50/50 to-pink-50/30 dark:from-red-950/20 dark:to-pink-950/20',
      glow: 'hover:shadow-red-500/20'
    };
    case 'indigo': return { 
      border: 'border-indigo-200 dark:border-indigo-700/50', 
      bgIcon: 'bg-gradient-to-br from-indigo-500 to-purple-600', 
      textIcon: 'text-white', 
      bgCard: 'from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/20',
      glow: 'hover:shadow-indigo-500/20'
    };
    case 'purple': return { 
      border: 'border-purple-200 dark:border-purple-700/50', 
      bgIcon: 'bg-gradient-to-br from-purple-500 to-fuchsia-600', 
      textIcon: 'text-white', 
      bgCard: 'from-purple-50/50 to-fuchsia-50/30 dark:from-purple-950/20 dark:to-fuchsia-950/20',
      glow: 'hover:shadow-purple-500/20'
    };
    case 'pink': return { 
      border: 'border-pink-200 dark:border-pink-700/50', 
      bgIcon: 'bg-gradient-to-br from-pink-500 to-rose-600', 
      textIcon: 'text-white', 
      bgCard: 'from-pink-50/50 to-rose-50/30 dark:from-pink-950/20 dark:to-rose-950/20',
      glow: 'hover:shadow-pink-500/20'
    };
    default: return { 
      border: 'border-gray-200 dark:border-gray-700/50', 
      bgIcon: 'bg-gradient-to-br from-gray-500 to-gray-600', 
      textIcon: 'text-white', 
      bgCard: 'from-gray-50/50 to-gray-100/30 dark:from-gray-800/20 dark:to-gray-900/20',
      glow: 'hover:shadow-gray-500/20'
    };
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
    <div className={`bg-gradient-to-br ${colors.bgCard} bg-white dark:bg-gray-800 rounded-xl shadow-lg ${colors.glow} hover:shadow-2xl border-2 ${colors.border} hover:scale-105 transition-all duration-300 p-3 group relative overflow-hidden ${href ? 'cursor-pointer' : ''} ${className}`}>
      {/* Effet de brillance au survol */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative z-10">
        {loading ? (
          <div className="w-full space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-3/4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse w-1/2"></div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {/* Icône avec gradient moderne */}
            {icon && (
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${colors.bgIcon} ${colors.textIcon} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <div className="w-5 h-5"> 
                  {icon} 
                </div>
              </div>
            )}
            {/* Contenu moderne */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider truncate">{title}</h3>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <p className="text-xl font-black text-gray-900 dark:text-white truncate">{value}</p>
                {trend && (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${trend.isPositive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                )}
              </div>
              {subtitle && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate font-medium">{subtitle}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : content
} 
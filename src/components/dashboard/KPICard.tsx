'use client'

import { ReactNode } from 'react'

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
}

// Helper pour obtenir les classes de couleur
const getColorClasses = (color: KPICardProps['accentColor']) => {
  switch (color) {
    case 'blue': return { border: 'border-blue-500', bgIcon: 'bg-blue-500', textIcon: 'text-white' };
    case 'green': return { border: 'border-green-500', bgIcon: 'bg-green-500', textIcon: 'text-white' };
    case 'yellow': return { border: 'border-yellow-500', bgIcon: 'bg-yellow-500', textIcon: 'text-white' };
    case 'red': return { border: 'border-red-500', bgIcon: 'bg-red-500', textIcon: 'text-white' };
    case 'indigo': return { border: 'border-indigo-500', bgIcon: 'bg-indigo-500', textIcon: 'text-white' };
    case 'purple': return { border: 'border-purple-500', bgIcon: 'bg-purple-500', textIcon: 'text-white' };
    case 'pink': return { border: 'border-pink-500', bgIcon: 'bg-pink-500', textIcon: 'text-white' };
    default: return { border: 'border-gray-500', bgIcon: 'bg-gray-500', textIcon: 'text-white' };
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
  accentColor = 'indigo' // Couleur par défaut
}: KPICardProps) {
  const colors = getColorClasses(accentColor);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl flex ${colors.border} border-l-4 overflow-hidden ${className}`}>
      {loading ? (
        <div className="w-full p-5 space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
          {subtitle && <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full"></div>}
        </div>
      ) : (
        <>
          {icon && (
            <div className={`p-5 flex items-center justify-center ${colors.bgIcon} ${colors.textIcon}`}>
              <div className="w-8 h-8"> 
                {icon} 
              </div>
            </div>
          )}
          <div className="p-5 flex-1">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
            <div className="flex items-baseline mt-1">
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              {trend && (
                <p className={`ml-2 text-xs font-medium ${trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </p>
              )}
            </div>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </>
      )}
    </div>
  )
} 
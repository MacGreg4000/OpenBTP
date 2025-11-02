'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon, 
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  EyeIcon,
  CurrencyEuroIcon,
  ClipboardDocumentCheckIcon,
  ArrowUturnLeftIcon
} from '@heroicons/react/24/outline'

interface ChantierHeaderProps {
  chantierId: string
  chantier: {
    nomChantier: string
    numeroIdentification?: string | null
    etatChantier: string
  }
}

export function ChantierHeader({ chantierId, chantier }: ChantierHeaderProps) {
  const pathname = usePathname();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Active le mode compact après 100px de scroll
      const scrollThreshold = 100;
      setIsCompact(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Calculer la taille de police en fonction de la longueur du titre
  const getTitleSize = (title: string) => {
    if (title.length > 40) return 'text-lg';
    if (title.length > 30) return 'text-xl';
    if (title.length > 20) return 'text-2xl';
    return 'text-2xl';
  };

  const actions = [
    {
      href: `/chantiers/${chantierId}`,
      icon: EyeIcon,
      label: 'Consulter',
      gradient: 'from-gray-600 via-gray-700 to-gray-800',
      glow: 'from-gray-400 to-gray-600',
      shadow: 'shadow-gray-500/50',
      hoverShadow: 'hover:shadow-gray-500/30',
      isActive: pathname === `/chantiers/${chantierId}`
    },
    {
      href: `/chantiers/${chantierId}/commande`,
      icon: CurrencyEuroIcon,
      label: 'Commande',
      gradient: 'from-blue-600 via-blue-700 to-indigo-800',
      glow: 'from-blue-400 to-indigo-600',
      shadow: 'shadow-blue-500/50',
      hoverShadow: 'hover:shadow-blue-500/30',
      isActive: pathname.includes('/commande')
    },
    {
      href: `/chantiers/${chantierId}/etats`,
      icon: ChartBarIcon,
      label: 'États',
      gradient: 'from-indigo-600 via-indigo-700 to-purple-800',
      glow: 'from-indigo-400 to-purple-600',
      shadow: 'shadow-indigo-500/50',
      hoverShadow: 'hover:shadow-indigo-500/30',
      isActive: pathname.includes('/etats')
    },
    {
      href: `/chantiers/${chantierId}/documents`,
      icon: DocumentDuplicateIcon,
      label: 'Documents',
      gradient: 'from-green-600 via-green-700 to-emerald-800',
      glow: 'from-green-400 to-emerald-600',
      shadow: 'shadow-green-500/50',
      hoverShadow: 'hover:shadow-green-500/30',
      isActive: pathname.includes('/documents')
    },
    {
      href: `/chantiers/${chantierId}/notes`,
      icon: ClipboardDocumentListIcon,
      label: 'Notes',
      gradient: 'from-purple-600 via-purple-700 to-pink-800',
      glow: 'from-purple-400 to-pink-600',
      shadow: 'shadow-purple-500/50',
      hoverShadow: 'hover:shadow-purple-500/30',
      isActive: pathname.includes('/notes')
    },
    {
      href: `/chantiers/${chantierId}/rapports`,
      icon: DocumentTextIcon,
      label: 'Rapports',
      gradient: 'from-orange-600 via-orange-700 to-red-800',
      glow: 'from-orange-400 to-red-600',
      shadow: 'shadow-orange-500/50',
      hoverShadow: 'hover:shadow-orange-500/30',
      isActive: pathname.includes('/rapports')
    },
    {
      href: `/chantiers/${chantierId}/reception`,
      icon: ClipboardDocumentCheckIcon,
      label: 'Réception',
      gradient: 'from-red-600 via-red-700 to-rose-800',
      glow: 'from-red-400 to-rose-600',
      shadow: 'shadow-red-500/50',
      hoverShadow: 'hover:shadow-red-500/30',
      isActive: pathname.includes('/reception')
    },
  ];

  return (
    <div className="relative bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 dark:from-gray-900 dark:via-blue-900/5 dark:to-purple-900/5 overflow-visible">
      {/* Effet de fond animé */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.03),rgba(0,0,0,0))]" />
      
      <div className={`relative mx-auto px-4 sm:px-6 lg:px-8 overflow-visible transition-all duration-300 ${isCompact ? 'py-2' : 'py-6'}`}>
        {/* Container flex pour titre + boutons sur la même ligne - effet flottant */}
        <div className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-300 ${isCompact ? 'p-2' : 'p-5 hover:-translate-y-1'}`}>
          
          <div className="relative flex flex-col lg:flex-row items-center gap-4">
            {/* Titre du chantier */}
            <div className={`flex-shrink-0 lg:absolute lg:left-4 transition-all duration-300 ${isCompact ? 'lg:left-2' : ''}`}>
              <h1 className={`${isCompact ? 'text-sm' : getTitleSize(chantier.nomChantier)} font-black text-blue-600 dark:text-blue-400 break-words text-center lg:text-left transition-all duration-300`}>
                {chantier.nomChantier}
              </h1>
              {chantier.numeroIdentification && !isCompact && (
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1 flex items-center gap-2 justify-center lg:justify-start">
                  <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                  ID: {chantier.numeroIdentification}
                </p>
              )}
              {/* Bouton Retour aux chantiers */}
              {!isCompact && (
                <Link 
                  href="/chantiers"
                  className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-all duration-200 hover:shadow-md border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
                >
                  <ArrowUturnLeftIcon className="h-3.5 w-3.5" />
                  <span>Retour aux chantiers</span>
                </Link>
              )}
            </div>
            
            {/* Navigation moderne avec cards flottantes - centrée */}
            <nav className={`flex flex-wrap gap-3 justify-center flex-1 lg:mx-auto transition-all duration-300 ${isCompact ? 'gap-2' : ''}`}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`group relative flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${
                    isCompact 
                      ? `min-w-[50px] px-2 py-1.5 hover:-translate-y-0.5` 
                      : `min-w-[80px] px-4 py-3 hover:-translate-y-1`
                  } ${
                    action.isActive 
                      ? `bg-gradient-to-br ${action.gradient} text-white shadow-lg ${action.shadow} scale-105` 
                      : `bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg`
                  }`}
                >
                  {/* Fond coloré transparent au hover - sans blur ni glow */}
                  <div 
                    className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none ${action.isActive ? `bg-gradient-to-br ${action.gradient} opacity-100` : `bg-gradient-to-br ${action.glow} opacity-0 group-hover:opacity-20`}`}
                  />
                  
                  {/* Badge actif - discret */}
                  {action.isActive && (
                    <div className={`absolute -top-0.5 -right-0.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md z-20 transition-all duration-300 ${isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />
                  )}
                  
                  <div className={`relative z-10 flex flex-col items-center transition-all duration-300 ${isCompact ? 'gap-1' : 'gap-1.5'}`}>
                    <div className={`rounded-lg transition-all duration-300 ${isCompact ? 'p-1' : 'p-2'} ${action.isActive ? 'bg-white/20 shadow-inner' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
                      <Icon className={`transition-all duration-300 ${isCompact ? 'h-4 w-4' : 'h-5 w-5'} ${action.isActive ? 'text-white drop-shadow-lg' : 'text-gray-600 dark:text-gray-300'}`} />
                    </div>
                    {!isCompact && (
                      <span className={`text-[10px] font-bold transition-all duration-300 leading-tight ${action.isActive ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {action.label}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
          </div>
        </div>
      </div>
    </div>
  )
}

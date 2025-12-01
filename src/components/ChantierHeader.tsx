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
  ChevronLeftIcon
} from '@heroicons/react/24/outline'

interface ChantierHeaderProps {
  chantierId: string
  chantier: {
    nomChantier: string
    etatChantier: string
    numeroIdentification?: string | null
  }
}

export function ChantierHeader({ chantierId, chantier }: ChantierHeaderProps) {
  const pathname = usePathname();
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    // Détecter si on est sur mobile
    const checkMobile = () => {
      // Forcer le mode compact sur mobile
      if (window.innerWidth < 768) {
        setIsCompact(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          // Active le mode compact après 100px de scroll (seulement sur desktop)
          if (window.innerWidth >= 768) {
            const scrollY = window.scrollY;
            // Hystérésis : seuil différent pour activer (100px) et désactiver (50px)
            // Cela évite les vibrations autour du seuil
            if (!isCompact && scrollY > 100) {
              setIsCompact(true);
            } else if (isCompact && scrollY < 50) {
              setIsCompact(false);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', checkMobile);
    };
  }, [isCompact]);
  
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
      gradient: 'from-sky-500 via-sky-600 to-cyan-700',
      glow: 'from-sky-400 to-cyan-600',
      shadow: 'shadow-sky-500/50',
      hoverShadow: 'hover:shadow-sky-500/30',
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

  const currentAction = actions.find((action) => action.isActive) ?? actions[0];
  const ChantierIcon = currentAction.icon;

  const getStatutLabel = (etat: string) => {
    switch (etat) {
      case 'EN_COURS':
        return 'En cours';
      case 'TERMINE':
        return 'Terminé';
      case 'A_VENIR':
        return 'À venir';
      case 'EN_PREPARATION':
      default:
        return 'En préparation';
    }
  };

  // Tronquer le nom du chantier en mode compact (max 12 caractères + "...")
  const getTruncatedTitle = (title: string) => {
    if (title.length <= 12) return title;
    return title.substring(0, 12) + '...';
  };

  return (
    <div className="relative w-full overflow-visible">
      {/* Effet de fond animé */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 dark:from-gray-900 dark:via-blue-900/5 dark:to-purple-900/5 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.08),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.03),rgba(0,0,0,0))]" />
      
      <div className={`relative w-full overflow-visible transition-[padding] duration-300 ease-out will-change-[padding] ${isCompact ? 'py-2' : 'py-6'}`}>
        {/* Container flex pour titre + boutons sur la même ligne - effet flottant */}
        <div className={`relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl hover:shadow-3xl transition-[padding,transform] duration-300 ease-out will-change-[padding,transform] ${isCompact ? 'p-2' : 'p-5 hover:-translate-y-1'}`}>
          
          {/* Desktop: grille avec 3 colonnes */}
          <div className="hidden md:grid relative grid-cols-[auto_1fr_auto] items-center gap-3 w-full">
            <div className={`flex items-center gap-3 ${isCompact ? 'gap-2' : ''}`}>
              <Link
                href="/chantiers"
                className={`group relative inline-flex items-center justify-center rounded-full border border-emerald-200/60 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all ${isCompact ? 'w-8 h-8' : 'w-10 h-10'}`}
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-100/70 via-emerald-200/60 to-teal-200/60 dark:from-emerald-900/30 dark:via-emerald-800/20 dark:to-teal-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronLeftIcon className="relative h-4 w-4" />
              </Link>

              <div className={`inline-flex items-center gap-4 border border-white/50 dark:border-emerald-900/40 bg-white/85 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/15 backdrop-blur-sm ${isCompact ? 'px-4 py-2 rounded-2xl' : 'px-5 py-3 rounded-3xl'}`}>
                <div className={`flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/40 ${isCompact ? 'w-9 h-9' : 'w-11 h-11'}`}>
                  <ChantierIcon className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'} drop-shadow-md`} />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1
                    className={`${isCompact ? 'text-base' : getTitleSize(chantier.nomChantier)} font-bold text-gray-900 dark:text-white flex items-center gap-3 transition-all duration-300 whitespace-nowrap`}
                    title={chantier.nomChantier}
                  >
                    {getTruncatedTitle(chantier.nomChantier)}
                    {chantier.numeroIdentification && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200 ${isCompact ? 'hidden lg:inline-flex' : ''}`}>
                        {chantier.numeroIdentification}
                      </span>
                    )}
                  </h1>
                  {chantier.numeroIdentification && (
                    <p className={`text-xs text-emerald-700/80 dark:text-emerald-200/80 flex items-center gap-2 transition-opacity ${isCompact ? 'mt-1 lg:hidden' : 'mt-1'}`}>
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      ID : {chantier.numeroIdentification}
                    </p>
                  )}
                  <p className={`text-xs text-emerald-700/80 dark:text-emerald-200/80 transition-opacity ${isCompact ? 'mt-1 hidden lg:block' : 'mt-1'}`}>
                    Statut : {getStatutLabel(chantier.etatChantier)}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation moderne avec cards flottantes - centrée */}
            <div className="w-full flex justify-center">
              <nav className={`flex flex-nowrap gap-3 justify-center transition-all duration-300 ${isCompact ? 'gap-2' : ''}`}>
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

            {/* Placeholder pour équilibrer la grille - même taille que la gauche */}
            <div className={`flex items-center gap-3 ${isCompact ? 'gap-2' : ''} opacity-0 pointer-events-none select-none`}>
              <div className={`${isCompact ? 'w-8 h-8' : 'w-10 h-10'}`} />
              <div className={`inline-flex items-center gap-4 ${isCompact ? 'px-4 py-2' : 'px-5 py-3'}`}>
                <div className={`${isCompact ? 'w-9 h-9' : 'w-11 h-11'}`} />
                <span className={`${isCompact ? 'text-base' : getTitleSize(chantier.nomChantier)} font-bold whitespace-nowrap`}>
                  {getTruncatedTitle(chantier.nomChantier)}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile: disposition flexible avec icônes à côté du titre */}
          <div className="md:hidden flex flex-col gap-3">
            {/* Ligne 1: Bouton retour + Titre */}
            <div className="flex items-start gap-2">
              <Link
                href="/chantiers"
                className="group relative inline-flex items-center justify-center rounded-full border border-emerald-200/60 dark:border-emerald-900/40 bg-white/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-200 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all w-8 h-8 flex-shrink-0"
              >
                <span className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-100/70 via-emerald-200/60 to-teal-200/60 dark:from-emerald-900/30 dark:via-emerald-800/20 dark:to-teal-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <ChevronLeftIcon className="relative h-4 w-4" />
              </Link>

              <div className="flex-1 inline-flex items-center gap-3 border border-white/50 dark:border-emerald-900/40 bg-white/85 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/15 backdrop-blur-sm px-3 py-2 rounded-2xl min-w-0">
                <div className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/40 w-9 h-9 flex-shrink-0">
                  <ChantierIcon className="h-4 w-4 drop-shadow-md" />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <h1
                    className="text-base font-bold text-gray-900 dark:text-white transition-all duration-300 truncate"
                    title={chantier.nomChantier}
                  >
                    {chantier.nomChantier}
                  </h1>
                  {chantier.numeroIdentification && (
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80 flex items-center gap-2 mt-1">
                      <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      ID : {chantier.numeroIdentification}
                    </p>
                  )}
                  <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80 mt-1">
                    Statut : {getStatutLabel(chantier.etatChantier)}
                  </p>
                </div>
              </div>
            </div>

            {/* Ligne 2+: Navigation avec icônes compactes qui peuvent se mettre sur plusieurs lignes */}
            <nav className="flex flex-wrap gap-2 justify-start">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`group relative flex flex-col items-center justify-center rounded-xl transition-all duration-300 min-w-[44px] px-2 py-1.5 ${
                      action.isActive 
                        ? `bg-gradient-to-br ${action.gradient} text-white shadow-lg ${action.shadow} scale-105` 
                        : `bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg`
                    }`}
                  >
                    {/* Fond coloré transparent au hover */}
                    <div 
                      className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none ${action.isActive ? `bg-gradient-to-br ${action.gradient} opacity-100` : `bg-gradient-to-br ${action.glow} opacity-0 group-hover:opacity-20`}`}
                    />
                    
                    {/* Badge actif - discret */}
                    {action.isActive && (
                      <div className="absolute -top-0.5 -right-0.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md z-20 transition-all duration-300 w-2 h-2" />
                    )}
                    
                    <div className="relative z-10 flex flex-col items-center gap-1">
                      <div className={`rounded-lg transition-all duration-300 p-1 ${action.isActive ? 'bg-white/20 shadow-inner' : 'bg-gray-100 dark:bg-gray-700/50'}`}>
                        <Icon className={`transition-all duration-300 h-4 w-4 ${action.isActive ? 'text-white drop-shadow-lg' : 'text-gray-600 dark:text-gray-300'}`} />
                      </div>
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

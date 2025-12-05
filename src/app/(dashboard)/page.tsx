'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BuildingOfficeIcon, 
  ChartBarIcon,
  BellAlertIcon,
  PlayIcon,
  CurrencyEuroIcon,
  PencilIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

// Components
import UserNotepad from '@/components/dashboard/UserNotepad'
import KPICard from '@/components/dashboard/KPICard'
import ChantiersStatsChart from '@/components/dashboard/ChantiersStatsChart'
import BonsRegieWidget from '@/components/dashboard/BonsRegieWidget'
import DocumentsExpiresWidget from '@/components/dashboard/DocumentsExpiresWidget'
import ReceptionsEnCoursWidget from '@/components/dashboard/ReceptionsEnCoursWidget'
import QuickActionsWidget from '@/components/dashboard/QuickActionsWidget'
import RecentEtatsList from '@/components/dashboard/RecentEtatsList'
import MetresEnAttenteWidget from '@/components/dashboard/MetresEnAttenteWidget'
import RecentSAVWidget from '@/components/dashboard/RecentSAVWidget'

// Types
// (Types inutilisés supprimés)


// Fonctions utilitaires
const formatEuros = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount)
}

async function getDashboardData() {
  try {
    // Utiliser l'API au lieu de Prisma directement côté client
    const response = await fetch('/api/dashboard/stats', {
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des données')
    }
    
    const data = await response.json()
    return {
      ...data,
      loading: false
    }
  } catch (error) {
    console.error('Erreur lors du chargement des données:', error)
    return {
      kpis: { totalChantiers: 0, chantiersEnCours: 0, chiffreAffaires: 0, montantEtatsAvancementMoisPrecedent: 0 },
      chantiersByCategory: { enPreparation: 0, enCours: 0, termines: 0 },
      chantiersMap: [],
      loading: false
    }
  }
}


export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Active le mode compact après 100px de scroll
      const scrollThreshold = 100;
      setIsCompact(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [])
  const router = useRouter()
  
  const [dashboardData, setDashboardData] = useState({
    kpis: { totalChantiers: 0, chantiersEnCours: 0, chiffreAffaires: 0, tachesEnAttente: 0, montantEtatsAvancementMoisPrecedent: 0 },
    chantiersByCategory: { enPreparation: 0, enCours: 0, termines: 0 },
    chantiersMap: [],
    loading: true
  })

  // removed unused recentEtats state

  // Affichage replié/déplié du tableau blanc (préférence persistée)
  const [isNotepadOpen, setIsNotepadOpen] = useState<boolean>(true)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard:notepadOpen')
      if (stored !== null) setIsNotepadOpen(stored === '1')
    } catch {}
  }, [])
  const toggleNotepad = () => {
    const next = !isNotepadOpen
    setIsNotepadOpen(next)
    try {
      localStorage.setItem('dashboard:notepadOpen', next ? '1' : '0')
    } catch {}
  }


  // Affichage replié/déplié des suivis importants (préférence persistée)
  const [isSuivisOpen, setIsSuivisOpen] = useState<boolean>(true)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard:suivisOpen')
      if (stored !== null) setIsSuivisOpen(stored === '1')
    } catch {}
  }, [])
  const toggleSuivis = () => {
    const next = !isSuivisOpen
    setIsSuivisOpen(next)
    try {
      localStorage.setItem('dashboard:suivisOpen', next ? '1' : '0')
    } catch {}
  }

  // Affichage replié/déplié des graphiques (préférence persistée)
  const [isGraphiquesOpen, setIsGraphiquesOpen] = useState<boolean>(true)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard:graphiquesOpen')
      if (stored !== null) setIsGraphiquesOpen(stored === '1')
    } catch {}
  }, [])
  const toggleGraphiques = () => {
    const next = !isGraphiquesOpen
    setIsGraphiquesOpen(next)
    try {
      localStorage.setItem('dashboard:graphiquesOpen', next ? '1' : '0')
    } catch {}
  }

  // Affichage replié/déplié de la section SAV (préférence persistée)
  const [isSavOpen, setIsSavOpen] = useState<boolean>(true)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard:savOpen')
      if (stored !== null) setIsSavOpen(stored === '1')
    } catch {}
  }, [])
  const toggleSav = () => {
    const next = !isSavOpen
    setIsSavOpen(next)
    try {
      localStorage.setItem('dashboard:savOpen', next ? '1' : '0')
    } catch {}
  }

  // Gestion de l'authentification côté client
  useEffect(() => {
    if (status === 'loading') return // Attendre le chargement de la session
    
    if (status === 'unauthenticated') {
      console.log('🚫 Utilisateur non authentifié, redirection vers login')
      router.push('/login')
      return
    }
    
    if (status === 'authenticated' && session?.user) {
      console.log('✅ Utilisateur authentifié:', session.user.email)
      // Charger les données du dashboard
      getDashboardData().then(setDashboardData)

      // Charger les 10-15 derniers états d'avancement
      fetch('/api/dashboard/evolution', { cache: 'no-store' })
        .then(()=> fetch('/api/planning/chantiers', { cache: 'no-store' })) // placeholder pour garder appel serveur actif
        .catch(()=>undefined)
    }
  }, [status, session, router])

  // Afficher un loading pendant la vérification de la session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  // Afficher un loading pendant la redirection
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirection...</p>
        </div>
      </div>
    )
  }

  const { kpis } = dashboardData

  // Calculs des statistiques pour le planning
  // removed unused planningStats

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* En-tête flottant avec effet compact au scroll */}
      <div className="sticky top-20 z-40 pb-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-1 overflow-hidden">
            {/* Effet de brillance en arrière-plan */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-700/10 dark:from-blue-600/5 dark:via-indigo-600/5 dark:to-purple-700/5"></div>
            
            <div className={`relative z-10 transition-all duration-300 ${isCompact ? 'py-2 px-4' : 'py-6 px-4'} sm:px-6 lg:px-8`}>
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-300`}>
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Badge icône */}
                  <div className={`bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl border-2 border-white/30 transition-all duration-300 ${isCompact ? 'w-8 h-8' : 'w-14 h-14'}`}>
                    <ChartBarIcon className={`text-white transition-all duration-300 ${isCompact ? 'h-4 w-4' : 'h-8 w-8'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className={`font-black text-blue-600 dark:text-blue-400 flex flex-col sm:flex-row sm:items-center gap-2 transition-all duration-300 ${isCompact ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'}`}>
                      <span className="truncate">Tableau de bord</span>
                      {!isCompact && (
                        <span className="px-3 py-1 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-700/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-blue-600/30 dark:border-blue-400/30 text-blue-700 dark:text-blue-300 whitespace-nowrap">
                          Dashboard
                        </span>
                      )}
                    </h1>
                    {!isCompact && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-medium transition-opacity duration-300">
                        👋 Bienvenue {session?.user?.name}, voici un aperçu de votre activité
                      </p>
                    )}
                  </div>
              </div>
              {!isCompact && (
                <div className="text-left sm:text-right">
                  <div className="px-4 py-2 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-700/10 backdrop-blur-sm rounded-xl border border-blue-600/20 dark:border-blue-400/20 shadow-lg">
                    <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">Aujourd'hui</div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Container principal moderne */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-8 space-y-10">
            
            {/* Section: Actions rapides - simplifiée */}
            <section aria-labelledby="actions-title">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 id="actions-title" className="text-xl font-black text-gray-900 dark:text-white">
                    Actions rapides
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Accès direct aux fonctionnalités</p>
                </div>
              </div>
              <QuickActionsWidget />
            </section>

            {/* Section: Mon Espace de Travail moderne */}
            <section aria-labelledby="notepad-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <PencilIcon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <h2 id="notepad-title" className="text-xl font-black text-gray-900 dark:text-white">
                      Mon Espace de Travail
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Notes et mémos personnels</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleNotepad}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    isNotepadOpen
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
                  }`}
                  aria-expanded={isNotepadOpen}
                  aria-controls="dashboard-notepad"
                >
                  {isNotepadOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {/* Tableau blanc avec notes et tâches */}
              {isNotepadOpen && (
                <div id="dashboard-notepad">
                  <UserNotepad userId={session?.user?.id || 'anonymous'} />
                </div>
              )}
            </section>

            {/* Section: Derniers SAV */}
            <section aria-labelledby="sav-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <h2 id="sav-title" className="text-xl font-black text-gray-900 dark:text-white">
                      Derniers SAV
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">10 derniers tickets encodés</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSav}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    isSavOpen
                      ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
                  }`}
                  aria-expanded={isSavOpen}
                  aria-controls="dashboard-sav"
                >
                  {isSavOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {isSavOpen && (
                <div className="grid grid-cols-1 gap-6" id="dashboard-sav">
                  <RecentSAVWidget />
                </div>
              )}
            </section>

            {/* Graphiques: Répartition + États récents moderne */}
            <section aria-labelledby="charts-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ChartBarIcon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <h2 id="charts-title" className="text-xl font-black text-gray-900 dark:text-white">
                      Statistiques des états d'avancements
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Analyse visuelle de vos activités</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleGraphiques}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    isGraphiquesOpen
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
                  }`}
                  aria-expanded={isGraphiquesOpen}
                  aria-controls="dashboard-graphiques"
                >
                  {isGraphiquesOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {isGraphiquesOpen && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="dashboard-graphiques">
                <div className="h-[28rem]">
                  <ChantiersStatsChart />
                </div>
                <div className="h-[28rem]">
                  <RecentEtatsList />
                </div>
              </div>
              )}
            </section>

            {/* Section: Suivis Importants moderne */}
            <section aria-labelledby="suivis-importants-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <BellAlertIcon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <h2 id="suivis-importants-title" className="text-xl font-black text-gray-900 dark:text-white">
                      Suivis Importants
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alertes et éléments nécessitant votre attention</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggleSuivis}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    isSuivisOpen
                      ? 'bg-gradient-to-r from-red-500 to-orange-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 border-2 border-red-200 dark:border-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
                  }`}
                  aria-expanded={isSuivisOpen}
                  aria-controls="dashboard-suivis"
                >
                  {isSuivisOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {isSuivisOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8" id="dashboard-suivis">
                <div className="h-80 overflow-hidden">
                  <BonsRegieWidget />
                </div>
                <div className="h-80 overflow-hidden">
                  <ReceptionsEnCoursWidget />
                </div>
                <div className="h-80 overflow-hidden">
                  <DocumentsExpiresWidget />
                </div>
                <div className="h-80 overflow-hidden md:col-span-2 lg:col-span-1">
                  <MetresEnAttenteWidget />
                </div>
              </div>
              )}
            </section>

            {/* Section: Indicateurs Clés - en bas du dashboard */}
            <section aria-labelledby="kpi-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <ChartBarIcon className="h-5 w-5 text-white"/>
                </div>
                <div>
                  <h2 id="kpi-title" className="text-xl font-black text-gray-900 dark:text-white">
                    Indicateurs Clés
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Vue d'ensemble de vos activités</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                  title="Total Chantiers" 
                  value={kpis.totalChantiers} 
                  icon={<BuildingOfficeIcon className="w-full h-full" />} 
                  accentColor="blue"
                  href="/chantiers"
                />
                <KPICard 
                  title="Chantiers en cours" 
                  value={kpis.chantiersEnCours} 
                  icon={<PlayIcon className="w-full h-full" />} 
                  accentColor="green"
                />
                <KPICard 
                  title="Chiffre d'affaires à venir" 
                  value={formatEuros(kpis.chiffreAffaires)} 
                  icon={<CurrencyEuroIcon className="w-full h-full" />} 
                  accentColor="purple"
                />
                <KPICard 
                  title="États Avancement (mois préc.)" 
                  value={formatEuros(kpis.montantEtatsAvancementMoisPrecedent)} 
                  icon={<ChartBarIcon className="w-full h-full" />} 
                  accentColor="indigo"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 
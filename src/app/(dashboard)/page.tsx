'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { 
  BuildingOfficeIcon, 
  ChartBarIcon,
  BellAlertIcon,
  PlayIcon,
  CurrencyEuroIcon,
  ClipboardDocumentListIcon,
  PencilIcon,
  CalendarIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
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

// Types
// (Types inutilisés supprimés)

interface Chantier {
  id: string
  title: string
  start: string
  end: string | null
  client: string
  etat: string
  adresse?: string
  montant?: number
  dureeEnJours?: number
}

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
      kpis: { totalChantiers: 0, chantiersEnCours: 0, chiffreAffaires: 0, tachesEnAttente: 0 },
      chantiersByCategory: { enPreparation: 0, enCours: 0, termines: 0 },
      chantiersMap: [],
      loading: false
    }
  }
}

async function fetchChantiersPlanning() {
  try {
    console.log('🔄 Chargement du planning...')
    const response = await fetch('/api/planning/chantiers')
    console.log('📡 Réponse API planning:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Erreur API planning:', response.status, errorText)
      throw new Error(`Erreur ${response.status}: ${errorText}`)
    }
    
    const data = await response.json()
    console.log('✅ Données planning reçues:', data.length, 'chantiers')
    return data
  } catch (err) {
    console.error('❌ Erreur fetchChantiersPlanning:', err)
    return []
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [dashboardData, setDashboardData] = useState({
    kpis: { totalChantiers: 0, chantiersEnCours: 0, chiffreAffaires: 0, tachesEnAttente: 0 },
    chantiersByCategory: { enPreparation: 0, enCours: 0, termines: 0 },
    chantiersMap: [],
    loading: true
  })

  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [planningLoading, setPlanningLoading] = useState(true)
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

  // Affichage replié/déplié du planning (préférence persistée)
  const [isPlanningOpen, setIsPlanningOpen] = useState<boolean>(true)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dashboard:planningOpen')
      if (stored !== null) setIsPlanningOpen(stored === '1')
    } catch {}
  }, [])
  const togglePlanning = () => {
    const next = !isPlanningOpen
    setIsPlanningOpen(next)
    try {
      localStorage.setItem('dashboard:planningOpen', next ? '1' : '0')
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
      // Charger les données du planning
      fetchChantiersPlanning().then(data => {
        console.log('📅 Données du planning chargées:', data)
        setChantiers(data)
        setPlanningLoading(false)
      }).catch(error => {
        console.error('❌ Erreur lors du chargement du planning:', error)
        setPlanningLoading(false)
      })

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

  const { kpis, chantiersByCategory, loading } = dashboardData

  // Calculs des statistiques pour le planning
  // removed unused planningStats

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      {/* En-tête moderne avec gradients élégants */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 shadow-2xl relative overflow-hidden">
        {/* Effet de brillance en arrière-plan */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Badge icône */}
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl border border-white/30">
                <ChartBarIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  Tableau de bord
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold border border-white/30">
                    Dashboard
                  </span>
                </h1>
                <p className="mt-1 text-sm text-blue-100 font-medium">
                  👋 Bienvenue {session?.user?.name}, voici un aperçu de votre activité
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                <div className="text-xs font-semibold text-blue-100 uppercase tracking-wide mb-1">Aujourd'hui</div>
                <div className="text-sm font-bold text-white">
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Container principal moderne */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-white via-gray-50/50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="p-8 space-y-10">
            
            {/* Section: KPI moderne */}
            <section aria-labelledby="kpi-title">
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
                  title="En cours" 
                  value={kpis.chantiersEnCours} 
                  icon={<PlayIcon className="w-full h-full" />} 
                  accentColor="green"
                />
                <KPICard 
                  title="CA Total" 
                  value={formatEuros(kpis.chiffreAffaires)} 
                  icon={<CurrencyEuroIcon className="w-full h-full" />} 
                  accentColor="purple"
                />
                <KPICard 
                  title="Tâches Admin" 
                  value={kpis.tachesEnAttente} 
                  icon={<ClipboardDocumentListIcon className="w-full h-full" />} 
                  accentColor="yellow"
                />
              </div>
            </section>

            {/* Section: Actions rapides - simplifiée */}
            <section aria-labelledby="actions-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
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

            {/* Section: Aperçu et planning moderne */}
            <section aria-labelledby="overview-title" className="border-t-2 border-gray-200/50 dark:border-gray-700/50 pt-10">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <CalendarIcon className="h-5 w-5 text-white"/>
                  </div>
                  <div>
                    <h2 id="overview-title" className="text-xl font-black text-gray-900 dark:text-white">
                      Aperçu & Planning
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Visualisation des chantiers actifs</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={togglePlanning}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                    isPlanningOpen
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-gray-600 dark:hover:to-gray-600'
                  }`}
                  aria-expanded={isPlanningOpen}
                  aria-controls="dashboard-planning"
                >
                  {isPlanningOpen ? (
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
              
              {/* Planning plein largeur moderne */}
              {isPlanningOpen && (
              <div className="grid grid-cols-1 gap-6" id="dashboard-planning">
                <div className="col-span-1">
                  <div className="bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 h-[48rem] flex flex-col overflow-hidden">
                    <div className="px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 flex-shrink-0 flex items-center justify-end">
                      <Link 
                        href="/planning" 
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 font-semibold text-sm transition-all duration-200"
                      >
                        Planning complet
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-800/50 dark:to-gray-900">
                      {planningLoading ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mb-4 animate-pulse">
                            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Chargement du planning...</span>
                        </div>
                      ) : chantiers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center shadow-xl mb-4">
                            <CalendarIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun chantier planifié</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Commencez par créer votre premier chantier</p>
                          <Link
                            href="/chantiers/nouveau"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 font-semibold transition-all duration-200"
                          >
                            <BuildingOfficeIcon className="w-5 h-5" />
                            Créer un chantier
                          </Link>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col">
                          {/* Légende moderne avec badges */}
                          <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 rounded-xl border border-amber-200 dark:border-amber-800/50">
                              <div className="w-3 h-3 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full shadow-lg"></div>
                              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">En préparation</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-800/50">
                              <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg"></div>
                              <span className="text-xs font-bold text-blue-800 dark:text-blue-300">En cours</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                              <div className="w-3 h-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full shadow-lg"></div>
                              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Terminé</span>
                            </div>
                            <div className="ml-auto px-4 py-2 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-200 dark:border-gray-600">
                              <span className="text-sm font-bold text-gray-900 dark:text-white">{chantiers.length} chantier{chantiers.length > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          
                          {/* Mini-Gantt basé sur les dates réelles, centré sur aujourd'hui */}
                          <div className="space-y-3 flex-1 overflow-y-auto">
                            {(() => {
                              // Filtrer les chantiers actifs (En préparation + En cours) et prendre les 10 premiers
                              const chantiersActifs = chantiers.filter(chantier => 
                                chantier.etat === 'En préparation' || chantier.etat === 'En cours'
                              ).slice(0, 10)
                              
                              if (chantiersActifs.length === 0) {
                                return (
                                  <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center shadow-xl mb-4">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <p className="text-base font-semibold text-gray-900 dark:text-white mb-2">Aucun chantier actif</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tous les chantiers sont terminés</p>
                                  </div>
                                )
                              }
                              
                              // Échelle temporelle dynamique
                              const parsed = chantiersActifs.map(c => ({
                                ...c,
                                _start: new Date(c.start),
                                _end: c.end ? new Date(c.end) : new Date(new Date(c.start).getTime() + (45 * 24 * 60 * 60 * 1000))
                              }))
                              const minStart = new Date(Math.min(...parsed.map(c => c._start.getTime())))
                              const maxEnd = new Date(Math.max(...parsed.map(c => c._end.getTime())))
                              const totalMs = Math.max(1, maxEnd.getTime() - minStart.getTime())
                              const today = new Date()
                              const toPercent = (d: Date) => {
                                const p = ((d.getTime() - minStart.getTime()) / totalMs) * 100
                                return Math.max(0, Math.min(100, p))
                              }
                              const todayLeft = toPercent(today)

                              // Mapping pour garder "aujourd'hui" au centre (50%)
                              const mapToViewport = (percent: number) => Math.max(0, Math.min(100, percent - todayLeft + 50))

                              const getBarColor = (etat: string) => {
                                switch (etat) {
                                  case 'En cours': return 'bg-gradient-to-r from-blue-500 via-indigo-600 to-blue-600 shadow-lg shadow-blue-500/30'
                                  case 'En préparation': return 'bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-500 shadow-lg shadow-amber-500/30'
                                  case 'Terminé': return 'bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 shadow-lg shadow-emerald-500/30'
                                  default: return 'bg-gradient-to-r from-gray-400 to-gray-500 shadow-lg'
                                }
                              }
                              
                              const getStatusIcon = (etat: string) => {
                                switch (etat) {
                                  case 'En cours': return '🚧'
                                  case 'En préparation': return '⏳'
                                  case 'Terminé': return '✅'
                                  default: return '❓'
                                }
                              }

                              return parsed.map((chantier, idx) => {
                                const leftAbs = toPercent(chantier._start)
                                const rightAbs = toPercent(chantier._end)
                                const left = mapToViewport(leftAbs)
                                const right = mapToViewport(rightAbs)
                                const width = Math.max(1, right - left)

                                return (
                                  <div 
                                    key={chantier.id} 
                                    className={`group p-3 rounded-xl transition-all duration-200 hover:shadow-lg ${
                                      idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-800/50' : 'bg-gray-50/50 dark:bg-gray-850/50'
                                    } hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-900/10`}
                                  >
                                    <div className="flex items-center gap-4">
                                      {/* Badge de statut + Info chantier */}
                                      <div className="w-56 flex-shrink-0 flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-lg ${getBarColor(chantier.etat)} group-hover:scale-110 transition-transform duration-200`}>
                                          {getStatusIcon(chantier.etat)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <Link 
                                            href={`/chantiers/${chantier.id}`}
                                            className="text-sm font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block transition-colors"
                                            title={chantier.title}
                                          >
                                            {chantier.title}
                                          </Link>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate font-medium">
                                            {chantier.client}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Barre Gantt moderne */}
                                      <div className="flex-1 relative h-10 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded-xl shadow-inner overflow-hidden">
                                        {/* Ligne date actuelle positionnée au centre avec style moderne */}
                                        <div className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-red-400 via-red-600 to-red-400 z-10 shadow-lg" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-3 h-3 bg-red-500 rounded-full shadow-lg animate-pulse"></div>
                                        </div>

                                        {/* Barre chantier moderne + tooltip */}
                                        <div className="group/bar relative h-full">
                                          <div
                                            className={`absolute top-1 bottom-1 rounded-xl ${getBarColor(chantier.etat)} hover:scale-105 cursor-pointer transition-all duration-300 z-20 overflow-hidden`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                          >
                                            {/* Effet brillant */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent"></div>
                                            {/* Bordure animée */}
                                            <div className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover/bar:border-white/50 transition-all duration-300"></div>
                                          </div>
                                          {/* Tooltip moderne */}
                                          <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
                                            <div className="bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-xl text-white text-xs rounded-xl px-4 py-3 whitespace-nowrap shadow-2xl border border-gray-700">
                                              <div className="font-bold mb-1">{chantier.title}</div>
                                              <div className="text-gray-300">{chantier.client}</div>
                                              <div className="text-gray-400 mt-1 text-xs">
                                                {chantier._start.toLocaleDateString('fr-FR')} → {chantier._end.toLocaleDateString('fr-FR')}
                                              </div>
                                              {/* Flèche */}
                                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900/95 dark:bg-gray-800/95 rotate-45"></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Dates avec style moderne */}
                                      <div className="w-32 flex-shrink-0 text-right">
                                        <div className="inline-flex flex-col gap-1 bg-white dark:bg-gray-700 rounded-xl px-3 py-2 shadow-lg border border-gray-200 dark:border-gray-600">
                                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                                            {chantier._start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400">→</div>
                                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                                            {chantier._end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                            
                            {chantiers.length > 10 && (
                              <div className="text-center pt-4 mt-4 border-t-2 border-gray-200 dark:border-gray-700">
                                <Link 
                                  href="/planning" 
                                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-105 font-bold text-sm transition-all duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Voir les {chantiers.length - 10} autres chantiers
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
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
                      Graphiques & Statistiques
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
                  <ChantiersStatsChart data={chantiersByCategory} loading={loading} />
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
          </div>
        </div>
      </div>
    </div>
  )
} 
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* En-tête avec dégradé */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">
                Tableau de bord
              </h1>
              <p className="mt-1 text-sm text-blue-100">
                Bienvenue {session?.user?.name}, voici un aperçu de votre activité
              </p>
            </div>
            <div className="text-right">
              <div className="text-blue-100 text-sm">
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

      {/* Container principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="p-8 space-y-8 overflow-hidden">
            
            {/* Section: KPI */}
            <section aria-labelledby="kpi-title">
              <h2 id="kpi-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600"/>
                Indicateurs Clés
              </h2>
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

            {/* Section: Mon Espace de Travail */}
            <section aria-labelledby="notepad-title" className="border-t-2 border-gray-200 dark:border-gray-700 pt-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 id="notepad-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <PencilIcon className="h-6 w-6 mr-2 text-blue-600"/>
                  Mon Espace de Travail
                </h2>
                <button
                  type="button"
                  onClick={toggleNotepad}
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium shadow-sm hover:shadow"
                  aria-expanded={isNotepadOpen}
                  aria-controls="dashboard-notepad"
                >
                  {isNotepadOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4 mr-2" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4 mr-2" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {/* Tableau blanc avec notes et tâches */}
              {isNotepadOpen && (
                <div id="dashboard-notepad" className="mb-6">
                  <UserNotepad userId={session?.user?.id || 'anonymous'} />
                </div>
              )}
              
              {/* Actions rapides horizontales */}
              <div className="bg-gray-50 dark:bg-gray-700/40 rounded-lg border-2 border-gray-200 dark:border-gray-600 p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Actions rapides
                </h3>
                <QuickActionsWidget />
              </div>
            </section>

            {/* Section: Aperçu et planning - version simplifiée */}
            <section aria-labelledby="overview-title" className="border-t-2 border-gray-200 dark:border-gray-700 pt-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="overview-title" className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <CalendarIcon className="h-6 w-6 mr-2 text-blue-600"/>
                  Aperçu & Planning
                </h2>
                <button
                  type="button"
                  onClick={togglePlanning}
                  className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border-2 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium shadow-sm hover:shadow"
                  aria-expanded={isPlanningOpen}
                  aria-controls="dashboard-planning"
                >
                  {isPlanningOpen ? (
                    <>
                      <ChevronUpIcon className="h-4 w-4 mr-2" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDownIcon className="h-4 w-4 mr-2" />
                      Afficher
                    </>
                  )}
                </button>
              </div>
              
              {/* Planning plein largeur */}
              {isPlanningOpen && (
              <div className="grid grid-cols-1 gap-6" id="dashboard-planning">
                <div className="col-span-1">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700 h-[48rem] flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                          <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                          Aperçu des Chantiers
                        </h3>
                        <Link 
                          href="/planning" 
                          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                          Planning complet →
                        </Link>
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto">
                      {planningLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Chargement...</span>
                        </div>
                      ) : chantiers.length === 0 ? (
                        <div className="text-center py-8">
                          <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600 dark:text-gray-400">Aucun chantier planifié</p>
                          <p className="text-xs text-gray-500 mt-2">Debug: {chantiers.length} chantiers chargés</p>
                          <Link
                            href="/chantiers/nouveau"
                            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <BuildingOfficeIcon className="w-4 h-4 mr-2" />
                            Créer un chantier
                          </Link>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col">
                          {/* Légende compacte */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4 pb-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-yellow-500 rounded mr-1"></div>
                              <span>En préparation</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
                              <span>En cours</span>
                            </div>
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                              <span>Terminé</span>
                            </div>
                            <span className="ml-auto">{chantiers.length} chantier{chantiers.length > 1 ? 's' : ''}</span>
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
                                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <p>Aucun chantier en cours ou en préparation</p>
                                    <p className="text-xs mt-2">Debug: {chantiers.length} chantiers total, {chantiersActifs.length} actifs</p>
                                    <p className="text-xs">Statuts disponibles: {chantiers.map(c => c.etat).join(', ')}</p>
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
                                  case 'En cours': return 'bg-blue-500'
                                  case 'En préparation': return 'bg-yellow-500'
                                  case 'Terminé': return 'bg-green-500'
                                  default: return 'bg-gray-400'
                                }
                              }

                              return parsed.map((chantier) => {
                                const leftAbs = toPercent(chantier._start)
                                const rightAbs = toPercent(chantier._end)
                                const left = mapToViewport(leftAbs)
                                const right = mapToViewport(rightAbs)
                                const width = Math.max(1, right - left)

                                return (
                                  <div key={chantier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 p-2 rounded transition-colors">
                                    <div className="flex items-center gap-3">
                                      {/* Info chantier */}
                                      <div className="w-48 flex-shrink-0">
                                        <Link 
                                          href={`/chantiers/${chantier.id}`}
                                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 truncate block"
                                          title={chantier.title}
                                        >
                                          {chantier.title}
                                        </Link>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                          {chantier.client}
                                        </p>
                                      </div>

                                      {/* Barre Gantt basée dates avec infobulle */}
                                      <div className="flex-1 relative h-8 bg-gray-100 dark:bg-gray-600 rounded">
                                        {/* Ligne date actuelle positionnée au centre */}
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '50%' }}></div>

                                        {/* Barre chantier + tooltip */}
                                        <div className="group">
                                          <div
                                            className={`absolute top-1 bottom-1 rounded ${getBarColor(chantier.etat)} opacity-90 hover:opacity-100 cursor-pointer transition-all`}
                                            style={{ left: `${left}%`, width: `${width}%` }}
                                          ></div>
                                          {/* Tooltip */}
                                          <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow">
                                            {chantier.title} • {chantier.client} • {chantier._start.toLocaleDateString('fr-FR')} → {chantier._end.toLocaleDateString('fr-FR')}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Dates */}
                                      <div className="w-28 text-xs text-gray-500 dark:text-gray-400 text-right flex-shrink-0">
                                        <div>{chantier._start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                                        <div>→ {chantier._end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                            
                            {chantiers.length > 10 && (
                              <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                                <Link 
                                  href="/planning" 
                                  className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                >
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

            {/* Graphiques: Répartition + États récents */}
            <section aria-labelledby="charts-title" className="border-t-2 border-gray-200 dark:border-gray-700 pt-8">
              <h2 id="charts-title" className="sr-only">Graphiques</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-[28rem]">
                  <ChantiersStatsChart data={chantiersByCategory} loading={loading} />
                </div>
                <div className="h-[28rem]">
                  <RecentEtatsList />
                </div>
              </div>
            </section>

            {/* Section: Suivis Importants */}
            <section aria-labelledby="suivis-importants-title" className="mt-12">
              <h2 id="suivis-importants-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <BellAlertIcon className="h-6 w-6 mr-2 text-blue-600"/>
                Suivis Importants
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
            </section>
          </div>
        </div>
      </div>
    </div>
  )
} 
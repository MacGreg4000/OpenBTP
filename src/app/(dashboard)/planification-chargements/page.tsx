'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ChevronDownIcon, 
  ChevronRightIcon, 
  PlusIcon, 
  TrashIcon,
  TruckIcon,
  CheckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { Pays, Usine, Chargement } from '@/types/planification'

interface ChargementCumule {
  usineId: string
  usine: Usine
  contenu: string
  semaine: number
  estCharge: boolean
  dateCreation: Date
  dateChargement?: Date
}

interface PaysAvecChargements extends Pays {
  usines: (Usine & {
    chargementsParSemaine: Record<number, Chargement[]>
  })[]
}

export default function PlanificationChargementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [pays, setPays] = useState<PaysAvecChargements[]>([])
  const [loading, setLoading] = useState(true)
  const [paysExpanded, setPaysExpanded] = useState<Record<string, boolean>>({})
  const [usinesExpanded, setUsinesExpanded] = useState<Record<string, boolean>>({})
  const [showAddPays, setShowAddPays] = useState(false)
  const [showAddUsine, setShowAddUsine] = useState<string | null>(null)
  const [showAddChargement, setShowAddChargement] = useState<string | null>(null)
  const [newPays, setNewPays] = useState({ nom: '', code: '', icone: '' })
  const [newUsine, setNewUsine] = useState({ nom: '', paysId: '' })
  const [newChargement, setNewChargement] = useState({ contenu: '', semaine: 1, usineId: '' })

  // Calculer les semaines de l'année
  const getSemainesAnnee = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const semaines = []
    
    for (let i = 0; i < 8; i++) { // 8 semaines à venir
      const date = new Date(now)
      date.setDate(now.getDate() + (i * 7))
      
      // Calculer le numéro de semaine ISO
      const startOfYear = new Date(currentYear, 0, 1)
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7)
      
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Lundi
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6) // Dimanche
      
      semaines.push({
        numero: weekNumber,
        debut: startOfWeek,
        fin: endOfWeek,
        label: `S${weekNumber} (${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1})`
      })
    }
    
    return semaines
  }

  const semainesAnnee = getSemainesAnnee()

  // Vérifier les permissions
  useEffect(() => {
    if (status === 'loading') return // Attendre le chargement de la session
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Charger les données
  const loadData = async () => {
    try {
      const response = await fetch('/api/planification-chargements')
      if (response.ok) {
        const data = await response.json()
        setPays(data)
        
        // Initialiser les états d'expansion
        const paysExpanded: Record<string, boolean> = {}
        const usinesExpanded: Record<string, boolean> = {}
        
        data.forEach((pays: PaysAvecChargements) => {
          paysExpanded[pays.id] = true // Ouvrir par défaut
          pays.usines.forEach(usine => {
            usinesExpanded[usine.id] = true // Ouvrir par défaut
          })
        })
        
        setPaysExpanded(paysExpanded)
        setUsinesExpanded(usinesExpanded)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Toggle expansion pays
  const togglePays = (paysId: string) => {
    setPaysExpanded(prev => ({
      ...prev,
      [paysId]: !prev[paysId]
    }))
  }

  // Toggle expansion usine
  const toggleUsine = (usineId: string) => {
    setUsinesExpanded(prev => ({
      ...prev,
      [usineId]: !prev[usineId]
    }))
  }

  // Ajouter un pays
  const handleAddPays = async () => {
    try {
      const response = await fetch('/api/planification-chargements/pays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPays)
      })
      
      if (response.ok) {
        setNewPays({ nom: '', code: '', icone: '' })
        setShowAddPays(false)
        loadData()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du pays:', error)
    }
  }

  // Ajouter une usine
  const handleAddUsine = async () => {
    try {
      const response = await fetch('/api/planification-chargements/usines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsine)
      })
      
      if (response.ok) {
        setNewUsine({ nom: '', paysId: '' })
        setShowAddUsine(null)
        loadData()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'usine:', error)
    }
  }

  // Ajouter un chargement
  const handleAddChargement = async () => {
    try {
      const response = await fetch('/api/planification-chargements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChargement)
      })
      
      if (response.ok) {
        setNewChargement({ contenu: '', semaine: 1, usineId: '' })
        setShowAddChargement(null)
        loadData()
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du chargement:', error)
    }
  }

  // Marquer comme chargé
  const handleCharger = async (chargementId: string) => {
    try {
      const response = await fetch(`/api/planification-chargements/${chargementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'charger' })
      })
      
      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
    }
  }

  // Reporter
  const handleReporter = async (chargementId: string) => {
    try {
      const response = await fetch(`/api/planification-chargements/${chargementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reporter' })
      })
      
      if (response.ok) {
        loadData()
      }
    } catch (error) {
      console.error('Erreur lors du report:', error)
    }
  }

  // Supprimer
  const handleSupprimer = async (chargementId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce chargement ?')) {
      try {
        const response = await fetch(`/api/planification-chargements/${chargementId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          loadData()
        }
      } catch (error) {
        console.error('Erreur lors de la suppression:', error)
      }
    }
  }

  // Supprimer usine
  const handleSupprimerUsine = async (usineId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette usine ?')) {
      try {
        const response = await fetch(`/api/planification-chargements/usines?id=${usineId}`, {
          method: 'DELETE'
        })
        
        if (response.ok) {
          loadData()
        }
      } catch (error) {
        console.error('Erreur lors de la suppression de l\'usine:', error)
      }
    }
  }

  // Cumuler les chargements par semaine
  const cumulerChargements = (chargements: Chargement[]): ChargementCumule[] => {
    const cumules: ChargementCumule[] = []
    const groupes = chargements.reduce((acc, chargement) => {
      const key = `${chargement.usineId}-${chargement.semaine}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(chargement)
      return acc
    }, {} as Record<string, Chargement[]>)

    Object.values(groupes).forEach(groupe => {
      if (groupe.length > 0) {
        const premier = groupe[0]
        const contenuCumule = groupe.map(c => c.contenu).join(' + ')
        cumules.push({
          usineId: premier.usineId,
          usine: premier.usine!,
          contenu: contenuCumule,
          semaine: premier.semaine,
          estCharge: premier.estCharge,
          dateCreation: premier.dateCreation,
          dateChargement: premier.dateChargement
        })
      }
    })

    return cumules.sort((a, b) => a.semaine - b.semaine)
  }

  // Afficher un message de chargement ou de redirection
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-4">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    {[1, 2].map(j => (
                      <div key={j} className="h-4 bg-gray-200 rounded w-1/2"></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vérifier les permissions avant d'afficher le contenu
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Accès non autorisé</h1>
            <p className="text-gray-600 dark:text-gray-300">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
          </div>
        </div>
      </div>
    )
  }

  // Calculer les statistiques pour les KPIs
  const totalPays = pays.length
  const totalUsines = pays.reduce((total, p) => total + p.usines.length, 0)
  const totalChargements = pays.reduce((total, p) => 
    total + p.usines.reduce((sum, u) => 
      sum + Object.values(u.chargementsParSemaine || {}).flat().length, 0
    ), 0
  )
  const chargementsCharges = pays.reduce((total, p) => 
    total + p.usines.reduce((sum, u) => 
      sum + Object.values(u.chargementsParSemaine || {}).flat().filter(c => c.estCharge).length, 0
    ), 0
  )

  // Stats cards pour le header
  const statsCards = (
    <div className="flex items-center gap-2">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <TruckIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Pays</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalPays}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
            <CheckIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Usines</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalUsines}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center">
            <ArrowRightIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Total</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalChargements}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <CheckIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Chargés</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{chargementsCharges}</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Planification des Chargements"
        subtitle="Gérez vos chargements par pays et usine avec report automatique"
        icon={TruckIcon}
        badgeColor="from-amber-600 via-orange-600 to-red-700"
        gradientColor="from-amber-600/10 via-orange-600/10 to-red-700/10"
        stats={statsCards}
        actions={
          <button
            onClick={() => setShowAddPays(true)}
            className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
          >
            <PlusIcon className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Ajouter un pays</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Modal ajouter pays */}
        {showAddPays && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Ajouter un pays</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={newPays.nom}
                    onChange={(e) => setNewPays({ ...newPays, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Espagne"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={newPays.code}
                    onChange={(e) => setNewPays({ ...newPays, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ES"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icône</label>
                  <input
                    type="text"
                    value={newPays.icone}
                    onChange={(e) => setNewPays({ ...newPays, icone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="🇪🇸"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddPays(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPays}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Liste des pays */}
        <div className="space-y-4">
          {pays.map((pays) => (
            <div key={pays.id} className="bg-white rounded-lg shadow border border-gray-200">
              {/* En-tête pays */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => togglePays(pays.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {paysExpanded[pays.id] ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500"/>
                    ) : (
                      <ChevronRightIcon className="h-5 w-5 text-gray-500"/>
                    )}
                    <span className="text-2xl">{pays.icone}</span>
                    <h2 className="text-xl font-semibold text-gray-900">{pays.nom}</h2>
                    <span className="text-sm text-gray-500">({pays.code})</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setNewUsine({ nom: '', paysId: pays.id })
                      setShowAddUsine(pays.id)
                    }}
                    className="inline-flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-1" />
                    Ajouter usine
                  </button>
                </div>
              </div>

              {/* Contenu pays */}
              {paysExpanded[pays.id] && (
                <div className="border-t border-gray-200">
                  <div className="p-4 space-y-4">
                    {pays.usines.map((usine) => (
                      <div key={usine.id} className="bg-gray-50 rounded-lg p-4">
                        {/* En-tête usine */}
                        <div 
                          className="flex items-center justify-between mb-3 cursor-pointer"
                          onClick={() => toggleUsine(usine.id)}
                        >
                          <div className="flex items-center gap-2">
                            {usinesExpanded[usine.id] ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500"/>
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-500"/>
                            )}
                            <h3 className="font-medium text-gray-900">{usine.nom}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setNewChargement({ contenu: '', semaine: 1, usineId: usine.id })
                                setShowAddChargement(usine.id)
                              }}
                              className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            >
                              <PlusIcon className="h-3 w-3 mr-1" />
                              Ajouter
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleSupprimerUsine(usine.id)
                              }}
                              className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Tableau des chargements */}
                        {usinesExpanded[usine.id] && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-medium text-gray-700">Usine</th>
                                  {semainesAnnee.slice(0, 4).map((semaine) => (
                                    <th key={semaine.numero} className="text-center py-2 px-3 font-medium text-gray-700">
                                      <div className="text-xs">{semaine.label}</div>
                                    </th>
                                  ))}
                                  <th className="text-center py-2 px-3 font-medium text-gray-700">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(usine.chargementsParSemaine).map(([semaine, chargements]) => {
                                  const cumules = cumulerChargements(chargements)
                                  return cumules.map((cumule, index) => (
                                    <tr key={`${semaine}-${index}`} className="border-b border-gray-100">
                                      <td className="py-2 px-3 text-gray-900">{usine.nom}</td>
                                      {semainesAnnee.slice(0, 4).map((semaineAnnee) => (
                                        <td key={semaineAnnee.numero} className="py-2 px-3 text-center">
                                          {cumule.semaine === semaineAnnee.numero ? (
                                            <div className="flex items-center justify-center gap-1">
                                              {cumule.estCharge ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                                  ✅ {cumule.contenu}
                                                </span>
                                              ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                                                  ⏳ {cumule.contenu}
                                                </span>
                                              )}
                                            </div>
                                          ) : (
                                            <span className="text-gray-300">-</span>
                                          )}
                                        </td>
                                      ))}
                                      <td className="py-2 px-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                          {!cumule.estCharge && (
                                            <>
                                              <button
                                                onClick={() => handleCharger(chargements[0].id)}
                                                className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                                title="Marquer comme chargé"
                                              >
                                                <CheckIcon className="h-3 w-3" />
                                              </button>
                                              <button
                                                onClick={() => handleReporter(chargements[0].id)}
                                                className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                                title="Reporter à la semaine suivante"
                                              >
                                                <ArrowRightIcon className="h-3 w-3" />
                                              </button>
                                            </>
                                          )}
                                          <button
                                            onClick={() => handleSupprimer(chargements[0].id)}
                                            className="inline-flex items-center px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                            title="Supprimer"
                                          >
                                            <TrashIcon className="h-3 w-3" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Modal ajouter usine */}
        {showAddUsine && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Ajouter une usine</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'usine</label>
                  <input
                    type="text"
                    value={newUsine.nom}
                    onChange={(e) => setNewUsine({ ...newUsine, nom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tau"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddUsine(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddUsine}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal ajouter chargement */}
        {showAddChargement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Ajouter un chargement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contenu</label>
                  <input
                    type="text"
                    value={newChargement.contenu}
                    onChange={(e) => setNewChargement({ ...newChargement, contenu: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="10T ou CMD-1234 ou 5T CMD-56"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Semaine</label>
                  <select
                    value={newChargement.semaine}
                    onChange={(e) => setNewChargement({ ...newChargement, semaine: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {semainesAnnee.slice(0, 4).map((semaine) => (
                      <option key={semaine.numero} value={semaine.numero}>
                        {semaine.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddChargement(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddChargement}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

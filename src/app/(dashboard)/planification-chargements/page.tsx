'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon, 
  TrashIcon,
  TruckIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { Pays, Usine, Chargement } from '@/types/planification'
import { useNotification } from '@/hooks/useNotification'
import { useConfirmation } from '@/components/modals/confirmation-modal'

interface UsineAvecChargements extends Usine {
  chargements: Chargement[]
}

// Fonction pour obtenir le numéro de semaine ISO 8601 correct
function getWeekNumber(date: Date): { week: number; year: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week: weekNo, year: d.getUTCFullYear() }
}

// Fonction pour obtenir le lundi d'une semaine donnée
function getMondayOfWeek(weekNumber: number, year: number): Date {
  const jan4 = new Date(year, 0, 4)
  const jan4DayOfWeek = jan4.getDay() || 7
  const jan4Monday = new Date(jan4)
  jan4Monday.setDate(jan4.getDate() - jan4DayOfWeek + 1)
  const targetMonday = new Date(jan4Monday)
  targetMonday.setDate(jan4Monday.getDate() + (weekNumber - 1) * 7)
  return targetMonday
}

// Fonction pour formater une semaine
function formatWeek(weekNumber: number, year: number): string {
  const monday = getMondayOfWeek(weekNumber, year)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  
  return `S${weekNumber} (${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}/${year})`
}

export default function PlanificationChargementsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showNotification, NotificationComponent } = useNotification()
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation()
  
  const [usines, setUsines] = useState<UsineAvecChargements[]>([])
  const [pays, setPays] = useState<Pays[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(() => getWeekNumber(new Date()))
  const [showAddUsineModal, setShowAddUsineModal] = useState(false)
  const [showAddPaysModal, setShowAddPaysModal] = useState(false)
  const [showAddChargementModal, setShowAddChargementModal] = useState(false)
  const [selectedUsineForChargement, setSelectedUsineForChargement] = useState<string | null>(null)
  const [selectedWeekForChargement, setSelectedWeekForChargement] = useState<{ week: number; year: number } | null>(null)
  
  const [newPays, setNewPays] = useState({ nom: '', code: '', icone: '' })
  const [newUsine, setNewUsine] = useState({ nom: '', paysId: '' })
  const [newChargement, setNewChargement] = useState({ contenu: '', usineId: '', weekNumber: 1, year: new Date().getFullYear() })

  // Calculer les 8 prochaines semaines à partir de la semaine actuelle
  const getWeeksToDisplay = () => {
    const weeks: Array<{ week: number; year: number; label: string; isPast: boolean }> = []
    const today = new Date()
    const todayWeek = getWeekNumber(today)
    
    for (let i = 0; i < 8; i++) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + (i * 7))
      const { week, year } = getWeekNumber(targetDate)
      const label = formatWeek(week, year)
      const isPast = year < todayWeek.year || (year === todayWeek.year && week < todayWeek.week)
      
      weeks.push({ week, year, label, isPast })
    }
    
    return weeks
  }

  const weeks = getWeeksToDisplay()

  // Vérifier les permissions
  useEffect(() => {
    if (status === 'loading') return
    
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      router.push('/dashboard')
      return
    }
  }, [session, status, router])

  // Charger les données
  const loadData = async () => {
    try {
      setLoading(true)
      
      // Charger les pays
      const paysResponse = await fetch('/api/planification-chargements/pays')
      if (paysResponse.ok) {
        const paysData = await paysResponse.json()
        setPays(paysData)
      }
      
      // Charger les usines avec leurs chargements
      const response = await fetch('/api/planification-chargements')
      if (response.ok) {
        const data = await response.json()
        // Transformer les données en structure plate
        const allUsines: UsineAvecChargements[] = []
        data.forEach((pays: Pays & { usines: UsineAvecChargements[] }) => {
          pays.usines.forEach(usine => {
            allUsines.push({
              ...usine,
              pays,
              chargements: []
            })
          })
        })
        
        // Charger tous les chargements et les associer aux usines
        for (const usine of allUsines) {
          // Les chargements sont déjà dans la structure retournée
          const paysData = data.find((p: Pays & { usines: any[] }) => 
            p.usines.some(u => u.id === usine.id)
          )
          if (paysData) {
            const usineData = paysData.usines.find((u: any) => u.id === usine.id)
            if (usineData && usineData.chargementsParSemaine) {
              const chargements: Chargement[] = []
              Object.values(usineData.chargementsParSemaine).forEach((chargementsArray: any) => {
                chargements.push(...chargementsArray)
              })
              usine.chargements = chargements
            }
          }
        }
        
        setUsines(allUsines)
      }
    } catch (error) {
      console.error('Erreur lors du chargement:', error)
      showNotification('Erreur', 'Impossible de charger les données', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) {
      loadData()
    }
  }, [session])

  // Ajouter un pays
  const handleAddPays = async () => {
    if (!newPays.nom || !newPays.code) {
      showNotification('Erreur', 'Veuillez remplir tous les champs', 'error')
      return
    }
    
    try {
      const response = await fetch('/api/planification-chargements/pays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPays)
      })
      
      if (response.ok) {
        showNotification('Succès', 'Pays ajouté avec succès', 'success')
        setNewPays({ nom: '', code: '', icone: '' })
        setShowAddPaysModal(false)
        loadData()
      } else {
        showNotification('Erreur', 'Erreur lors de l\'ajout du pays', 'error')
      }
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur', 'Erreur lors de l\'ajout du pays', 'error')
    }
  }

  // Ajouter une usine
  const handleAddUsine = async () => {
    if (!newUsine.nom || !newUsine.paysId) {
      showNotification('Erreur', 'Veuillez remplir tous les champs', 'error')
      return
    }
    
    try {
      const response = await fetch('/api/planification-chargements/usines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsine)
      })
      
      if (response.ok) {
        showNotification('Succès', 'Usine ajoutée avec succès', 'success')
        setNewUsine({ nom: '', paysId: '' })
        setShowAddUsineModal(false)
        loadData()
      } else {
        showNotification('Erreur', 'Erreur lors de l\'ajout de l\'usine', 'error')
      }
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur', 'Erreur lors de l\'ajout de l\'usine', 'error')
    }
  }

  // Ajouter un chargement
  const handleAddChargement = async () => {
    if (!newChargement.contenu || !newChargement.usineId) {
      showNotification('Erreur', 'Veuillez remplir tous les champs', 'error')
      return
    }
    
    try {
      const response = await fetch('/api/planification-chargements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newChargement,
          semaine: newChargement.weekNumber
        })
      })
      
      if (response.ok) {
        showNotification('Succès', 'Chargement ajouté avec succès', 'success')
        setNewChargement({ contenu: '', usineId: '', weekNumber: 1, year: new Date().getFullYear() })
        setShowAddChargementModal(false)
        setSelectedUsineForChargement(null)
        setSelectedWeekForChargement(null)
        loadData()
      } else {
        showNotification('Erreur', 'Erreur lors de l\'ajout du chargement', 'error')
      }
    } catch (error) {
      console.error('Erreur:', error)
      showNotification('Erreur', 'Erreur lors de l\'ajout du chargement', 'error')
    }
  }

  // Marquer comme chargé
  const handleMarquerCharge = async (chargementId: string, contenu: string) => {
    showConfirmation({
      title: 'Confirmer le chargement',
      message: `Voulez-vous marquer ce chargement comme effectué ?\n\n"${contenu}"`,
      type: 'info',
      confirmText: 'Marquer comme chargé',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/planification-chargements/${chargementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'charger' })
          })
          
          if (response.ok) {
            showNotification('Succès', 'Chargement marqué comme effectué', 'success')
            loadData()
          }
        } catch (error) {
          console.error('Erreur:', error)
          showNotification('Erreur', 'Erreur lors de la mise à jour', 'error')
        }
      }
    })
  }

  // Reporter à la semaine suivante
  const handleReporter = async (chargementId: string) => {
    showConfirmation({
      title: 'Reporter le chargement',
      message: 'Voulez-vous reporter ce chargement à la semaine suivante ?',
      type: 'warning',
      confirmText: 'Reporter',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/planification-chargements/${chargementId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reporter' })
          })
          
          if (response.ok) {
            showNotification('Succès', 'Chargement reporté', 'success')
            loadData()
          }
        } catch (error) {
          console.error('Erreur:', error)
          showNotification('Erreur', 'Erreur lors du report', 'error')
        }
      }
    })
  }

  // Supprimer un chargement
  const handleSupprimer = async (chargementId: string) => {
    showConfirmation({
      title: 'Supprimer le chargement',
      message: 'Êtes-vous sûr de vouloir supprimer ce chargement ?',
      type: 'error',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/planification-chargements/${chargementId}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            showNotification('Succès', 'Chargement supprimé', 'success')
            loadData()
          }
        } catch (error) {
          console.error('Erreur:', error)
          showNotification('Erreur', 'Erreur lors de la suppression', 'error')
        }
      }
    })
  }

  // Supprimer une usine
  const handleSupprimerUsine = async (usineId: string) => {
    showConfirmation({
      title: 'Supprimer l\'usine',
      message: 'Êtes-vous sûr de vouloir supprimer cette usine et tous ses chargements ?',
      type: 'error',
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/planification-chargements/usines?id=${usineId}`, {
            method: 'DELETE'
          })
          
          if (response.ok) {
            showNotification('Succès', 'Usine supprimée', 'success')
            loadData()
          }
        } catch (error) {
          console.error('Erreur:', error)
          showNotification('Erreur', 'Erreur lors de la suppression', 'error')
        }
      }
    })
  }

  // Obtenir les chargements d'une usine pour une semaine donnée
  const getChargementsForWeek = (usine: UsineAvecChargements, week: number, year: number): Chargement[] => {
    return usine.chargements.filter(c => c.semaine === week)
  }

  // Affichage du chargement
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-[1600px] mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                  <div className="space-y-2">
                    {[1, 2].map(j => (
                      <div key={j} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
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

  // Vérifier les permissions
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

  // Stats
  const totalUsines = usines.length
  const totalChargements = usines.reduce((sum, u) => sum + u.chargements.length, 0)
  const chargementsCharges = usines.reduce((sum, u) => sum + u.chargements.filter(c => c.estCharge).length, 0)
  const chargementsEnAttente = totalChargements - chargementsCharges

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <TruckIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Usines</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{totalUsines}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <CheckIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Chargés</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{chargementsCharges}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
        <div className="flex items-center gap-2">
          <XMarkIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          <div>
            <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">En attente</div>
            <div className="text-sm font-black text-gray-900 dark:text-white">{chargementsEnAttente}</div>
          </div>
        </div>
      </div>
    </div>
  )

  // Renderer pour les modaux
  const renderModals = () => {
    return (
      <>
        {/* Modal Ajouter Pays */}
        {showAddPaysModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Ajouter un pays</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du pays *</label>
                  <input
                    type="text"
                    value={newPays.nom}
                    onChange={(e) => setNewPays({ ...newPays, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Espagne"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Code pays *</label>
                  <input
                    type="text"
                    value={newPays.code}
                    onChange={(e) => setNewPays({ ...newPays, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="ES"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Icône (emoji)</label>
                  <input
                    type="text"
                    value={newPays.icone}
                    onChange={(e) => setNewPays({ ...newPays, icone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="🇪🇸"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddPaysModal(false)
                    setNewPays({ nom: '', code: '', icone: '' })
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddPays}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajouter Usine */}
        {showAddUsineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Ajouter une usine</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom de l'usine *</label>
                  <input
                    type="text"
                    value={newUsine.nom}
                    onChange={(e) => setNewUsine({ ...newUsine, nom: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Tau"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pays *</label>
                  <select
                    value={newUsine.paysId}
                    onChange={(e) => setNewUsine({ ...newUsine, paysId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="">Sélectionner un pays</option>
                    {pays.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.icone} {p.nom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddUsineModal(false)
                    setNewUsine({ nom: '', paysId: '' })
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddUsine}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ajouter Chargement */}
        {showAddChargementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Ajouter un chargement</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Usine</label>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                    {usines.find(u => u.id === selectedUsineForChargement)?.nom}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Semaine</label>
                  <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white font-medium">
                    {selectedWeekForChargement && formatWeek(selectedWeekForChargement.week, selectedWeekForChargement.year)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contenu *</label>
                  <input
                    type="text"
                    value={newChargement.contenu}
                    onChange={(e) => setNewChargement({ ...newChargement, contenu: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
                    placeholder="Ex: Carrelage 20 tonnes"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddChargementModal(false)
                    setNewChargement({ contenu: '', usineId: '', weekNumber: 1, year: new Date().getFullYear() })
                    setSelectedUsineForChargement(null)
                    setSelectedWeekForChargement(null)
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleAddChargement}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-amber-50/20 to-orange-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Planification des Chargements"
        subtitle="Gérez les chargements de vos usines par semaine"
        icon={TruckIcon}
        badgeColor="from-amber-600 via-orange-600 to-red-700"
        gradientColor="from-amber-600/10 via-orange-600/10 to-red-700/10"
        stats={statsCards}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddPaysModal(true)}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Ajouter un pays</span>
            </button>
            <button
              onClick={() => setShowAddUsineModal(true)}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-amber-600 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Ajouter une usine</span>
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Planning en grille */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-600/10 via-orange-600/10 to-red-700/10 dark:from-amber-600/5 dark:via-orange-600/5 dark:to-red-700/5">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm z-10 min-w-[200px]">
                    Usine / Pays
                  </th>
                  {weeks.map(({ week, year, label, isPast }) => (
                    <th
                      key={`${week}-${year}`}
                      className={`px-3 py-3 text-center text-xs font-semibold border-r border-gray-200 dark:border-gray-700 min-w-[150px] ${
                        isPast 
                          ? 'text-gray-500 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/50' 
                          : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {label}
                      {isPast && <div className="text-[9px] text-red-500 dark:text-red-400">Passée</div>}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white min-w-[100px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {usines.length === 0 ? (
                  <tr>
                    <td colSpan={weeks.length + 2} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <TruckIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">Aucune usine configurée</p>
                      <p className="text-sm mt-1">Ajoutez une usine pour commencer la planification</p>
                    </td>
                  </tr>
                ) : (
                  usines.map((usine) => (
                    <tr key={usine.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 border-r border-gray-200 dark:border-gray-700 sticky left-0 bg-white dark:bg-gray-800 z-10">
                        <div className="font-medium text-gray-900 dark:text-white">{usine.nom}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {usine.pays?.icone} {usine.pays?.nom}
                        </div>
                      </td>
                      {weeks.map(({ week, year, isPast }) => {
                        const chargements = getChargementsForWeek(usine, week, year)
                        return (
                          <td
                            key={`${week}-${year}`}
                            className={`px-2 py-2 border-r border-gray-200 dark:border-gray-700 ${
                              isPast ? 'bg-gray-50/30 dark:bg-gray-900/30' : ''
                            }`}
                          >
                            {chargements.length > 0 ? (
                              <div className="space-y-1">
                                {chargements.map((chargement) => (
                                  <div
                                    key={chargement.id}
                                    className={`text-xs px-2 py-1 rounded transition-all ${
                                      chargement.estCharge
                                        ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-500 opacity-60 cursor-default'
                                        : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 cursor-pointer hover:shadow-md'
                                    }`}
                                    onClick={() => {
                                      if (!chargement.estCharge && !isPast) {
                                        handleMarquerCharge(chargement.id, chargement.contenu)
                                      }
                                    }}
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className={`truncate ${chargement.estCharge ? 'line-through' : ''}`}>
                                        {chargement.contenu}
                                      </span>
                                      {chargement.estCharge ? (
                                        <CheckIcon className="h-3 w-3 flex-shrink-0 text-green-600 dark:text-green-500" />
                                      ) : (
                                        <div className="flex gap-0.5 flex-shrink-0">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleReporter(chargement.id)
                                            }}
                                            className="hover:bg-orange-200 dark:hover:bg-orange-800/50 rounded p-0.5"
                                            title="Reporter"
                                          >
                                            <ChevronRightIcon className="h-3 w-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleSupprimer(chargement.id)
                                            }}
                                            className="hover:bg-red-200 dark:hover:bg-red-800/50 rounded p-0.5"
                                            title="Supprimer"
                                          >
                                            <TrashIcon className="h-3 w-3" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUsineForChargement(usine.id)
                                  setSelectedWeekForChargement({ week, year })
                                  setNewChargement({ 
                                    contenu: '', 
                                    usineId: usine.id, 
                                    weekNumber: week, 
                                    year 
                                  })
                                  setShowAddChargementModal(true)
                                }}
                                className="w-full py-2 text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded transition-colors"
                                disabled={isPast}
                              >
                                <PlusIcon className="h-4 w-4 mx-auto" />
                              </button>
                            )}
                          </td>
                        )
                      })}
                      <td className="px-2 py-3 text-center">
                        <button
                          onClick={() => handleSupprimerUsine(usine.id)}
                          className="inline-flex items-center px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
                          title="Supprimer l'usine"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {renderModals()}
      
      <NotificationComponent />
      {ConfirmationModalComponent}
    </div>
    </>
  )
}

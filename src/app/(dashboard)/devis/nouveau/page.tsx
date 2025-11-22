'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import type { Identifier } from 'dnd-core'
import type { XYCoord } from 'react-dnd'
import { 
  PlusIcon, 
  TrashIcon,
  BarsArrowUpIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { PageHeader } from '@/components/PageHeader'
import { useConfirmation } from '@/components/modals/confirmation-modal'

interface Client {
  id: string
  nom: string
  email: string
}

interface Chantier {
  chantierId: string
  nomChantier: string
  clientId: string
  clientNom: string
}

interface LigneDevis {
  id: string
  type: string
  article: string
  description: string
  unite: string
  quantite: number
  prixUnitaire: number
  remise: number
  total: number
}

// Fonction de normalisation des unités pour gérer les variations de casse
function normalizeUnite(unite: string | null | undefined): string {
  if (!unite) return ''
  
  const uniteLower = unite.toLowerCase().trim()
  
  // Mapping des variations vers les valeurs standardisées
  const uniteMap: Record<string, string> = {
    'mct': 'Mct',
    'm²': 'M2',
    'm2': 'M2',
    'm³': 'M3',
    'm3': 'M3',
    'heures': 'Heures',
    'heure': 'Heures',
    'h': 'Heures',
    'pièces': 'Pièces',
    'piece': 'Pièces',
    'pieces': 'Pièces',
    'p': 'Pièces',
    'u': 'Pièces',
    'fft': 'Fft',
    'forfait': 'Fft',
    'f': 'Fft'
  }
  
  return uniteMap[uniteLower] || unite
}

export default function NouveauDevisPage() {
  const router = useRouter()
  const [typeDevis, setTypeDevis] = useState<'DEVIS' | 'AVENANT'>('DEVIS')
  const [reference, setReference] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedChantierId, setSelectedChantierId] = useState('')
  const [observations, setObservations] = useState('')
  const [tauxTVA, setTauxTVA] = useState(21) // 0%, 6%, ou 21%
  const [remiseGlobale, setRemiseGlobale] = useState(0)
  const [lignes, setLignes] = useState<LigneDevis[]>([])
  const [saving, setSaving] = useState(false)
  const [infosGeneralesExpanded, setInfosGeneralesExpanded] = useState(true)
  const { showConfirmation, ConfirmationModalComponent } = useConfirmation()

  useEffect(() => {
    loadClients()
    loadChantiers()
  }, [])

  // Quand on change de type, on reset les sélections
  useEffect(() => {
    setSelectedClientId('')
    setSelectedChantierId('')
  }, [typeDevis])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = (await response.json()) as Client[] | { clients?: Client[] }
        const clientsData = Array.isArray(data) ? data : data.clients ?? []
        setClients(clientsData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des clients:', error)
    }
  }

  const loadChantiers = async () => {
    try {
      // Demander tous les chantiers sans filtre de statut, avec pagination élevée
      const response = await fetch('/api/chantiers?etat=Tous les états&pageSize=1000')
      if (response.ok) {
        const data = (await response.json()) as {
          chantiers?: Array<{
            chantierId?: string
            nomChantier?: string
            clientId?: string | null
            clientNom?: string | null
          }>
        }
        // L'API retourne un objet { chantiers: [], meta: {} }
        const chantiersList = data.chantiers ?? []
        const chantiersData = chantiersList.map((c) => ({
          chantierId: c.chantierId ?? '',
          nomChantier: c.nomChantier ?? 'Chantier sans nom',
          clientId: c.clientId ?? '',
          clientNom: c.clientNom ?? 'Client inconnu'
        }))
        setChantiers(chantiersData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
    }
  }

  // Quand on sélectionne un chantier (pour avenant), on déduit le client
  const handleChantierChange = (chantierId: string) => {
    setSelectedChantierId(chantierId)
    const chantier = chantiers.find(c => c.chantierId === chantierId)
    if (chantier) {
      setSelectedClientId(chantier.clientId)
    }
  }

  const addLigne = () => {
    const newLigne: LigneDevis = {
      id: `new-${Date.now()}`,
      type: 'QP',
      article: '',
      description: '',
      unite: 'Pièces',
      quantite: 1,
      prixUnitaire: 0,
      remise: 0,
      total: 0
    }
    setLignes([...lignes, newLigne])
  }

  const addSectionLigne = (type: 'TITRE' | 'SOUS_TITRE') => {
    const newLigne: LigneDevis = {
      id: `new-${Date.now()}`,
      type,
      article: type === 'TITRE' ? 'ARTICLE_TITRE' : 'ARTICLE_SOUS_TITRE',
      description: type === 'TITRE' ? 'TITRE DE SECTION' : 'Sous-titre de section',
      unite: '',
      quantite: 0,
      prixUnitaire: 0,
      remise: 0,
      total: 0
    }
    setLignes([...lignes, newLigne])
  }

  const updateLigne = (id: string, field: keyof LigneDevis, value: LigneDevis[keyof LigneDevis]) => {
    setLignes(lignes.map(ligne => {
      if (ligne.id === id) {
        // Normaliser l'unité si c'est le champ qui est modifié
        const normalizedValue = field === 'unite' && typeof value === 'string' 
          ? normalizeUnite(value) 
          : value
        const updated = { ...ligne, [field]: normalizedValue }
 
         // Recalculer le total pour les lignes QP
         if (ligne.type === 'QP' && (field === 'quantite' || field === 'prixUnitaire' || field === 'remise')) {
          const parseNumericValue = (input: LigneDevis[keyof LigneDevis]) => {
            if (typeof input === 'number') {
              return input
            }
            if (typeof input === 'string') {
              const parsed = Number.parseFloat(input)
              return Number.isNaN(parsed) ? 0 : parsed
            }
            return 0
          }

          const quantite = field === 'quantite' ? parseNumericValue(value) : ligne.quantite
          const prix = field === 'prixUnitaire' ? parseNumericValue(value) : ligne.prixUnitaire
          const remise = field === 'remise' ? parseNumericValue(value) : ligne.remise
          const sousTotal = quantite * prix
          updated.total = sousTotal - (sousTotal * remise / 100)
        }
 
        return updated
      }
      return ligne
    }))
  }

  const deleteLigne = (id: string) => {
    setLignes(lignes.filter(l => l.id !== id))
  }

  const moveLigne = (dragIndex: number, hoverIndex: number) => {
    const dragLigne = lignes[dragIndex]
    const newLignes = [...lignes]
    newLignes.splice(dragIndex, 1)
    newLignes.splice(hoverIndex, 0, dragLigne)
    setLignes(newLignes)
  }

  const calculerTotaux = () => {
    const lignesCalculables = lignes.filter(l => l.type === 'QP')
    const totalHT = lignesCalculables.reduce((sum, l) => sum + l.total, 0)
    const montantRemise = totalHT * (remiseGlobale / 100)
    const totalHTApresRemise = totalHT - montantRemise
    const totalTVA = totalHTApresRemise * (tauxTVA / 100)
    const totalTTC = totalHTApresRemise + totalTVA

    return {
      totalHT,
      montantRemise,
      totalHTApresRemise,
      totalTVA,
      totalTTC
    }
  }

  const handleSave = async () => {
    // Validation selon le type
    if (typeDevis === 'DEVIS' && !selectedClientId) {
      showConfirmation({
        title: 'Client requis',
        message: 'Veuillez sélectionner un client',
        type: 'warning',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
      return
    }

    if (typeDevis === 'AVENANT' && !selectedChantierId) {
      showConfirmation({
        title: 'Chantier requis',
        message: 'Veuillez sélectionner un chantier',
        type: 'warning',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
      return
    }

    if (lignes.length === 0) {
      showConfirmation({
        title: 'Lignes requises',
        message: 'Veuillez ajouter au moins une ligne',
        type: 'warning',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
      return
    }

    try {
      setSaving(true)
      const totaux = calculerTotaux()

      const response = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeDevis,
          reference,
          clientId: selectedClientId,
          chantierId: typeDevis === 'AVENANT' ? selectedChantierId : null,
          observations,
          tauxTVA,
          remiseGlobale,
          montantHT: totaux.totalHTApresRemise,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
          lignes: lignes.map((ligne, index) => ({
            ...ligne,
            unite: normalizeUnite(ligne.unite),
            ordre: index + 1
          }))
        })
      })

      if (response.ok) {
        const devis = await response.json()
        router.push(`/devis/${devis.id}`)
      } else {
        const error = await response.json()
        showConfirmation({
          title: 'Erreur',
          message: error.error || 'Erreur lors de la création du devis',
          type: 'error',
          confirmText: 'OK',
          showCancel: false,
          onConfirm: () => {}
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
      showConfirmation({
        title: 'Erreur',
        message: 'Erreur lors de la création du devis',
        type: 'error',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: () => {}
      })
    } finally {
      setSaving(false)
    }
  }

  const totaux = calculerTotaux()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Nouveau devis"
        subtitle="Créez un nouveau devis ou avenant"
        icon={DocumentTextIcon}
        badgeColor="from-orange-600 via-orange-700 to-red-700"
        gradientColor="from-orange-600/10 via-orange-700/10 to-red-700/10"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="hidden sm:inline">Enregistrement...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span className="hidden sm:inline">Enregistrer</span>
                  <span className="sm:hidden">Sauver</span>
                </>
              )}
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Informations générales */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl rounded-2xl mb-6 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
        <button
          onClick={() => setInfosGeneralesExpanded(!infosGeneralesExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
            Informations générales
          </h2>
          {infosGeneralesExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
        
        {infosGeneralesExpanded && (
          <div className="px-6 pb-6 space-y-6">
        {/* Type de devis : DEVIS ou AVENANT */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-700/50">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Type de document *
          </label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="typeDevis"
                value="DEVIS"
                checked={typeDevis === 'DEVIS'}
                onChange={(e) => setTypeDevis(e.target.value as 'DEVIS' | 'AVENANT')}
                className="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500 focus:ring-2"
              />
              <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                📄 Devis (nouveau chantier)
              </span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="typeDevis"
                value="AVENANT"
                checked={typeDevis === 'AVENANT'}
                onChange={(e) => setTypeDevis(e.target.value as 'DEVIS' | 'AVENANT')}
                className="w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500 focus:ring-2"
              />
              <span className="ml-2 text-sm font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                📋 Avenant (chantier existant)
              </span>
            </label>
          </div>
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {typeDevis === 'DEVIS' 
              ? "Un devis sera converti en commande pour un nouveau chantier lors de son acceptation." 
              : "Un avenant sera ajouté directement dans l'état d'avancement du chantier sélectionné."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Référence */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Référence
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: Carrelage premium app 3"
              className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Identification libre du devis/avenant
            </p>
          </div>

          {/* Client ou Chantier selon le type */}
          {typeDevis === 'DEVIS' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Client *
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
              >
                <option value="">Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Chantier *
              </label>
              <select
                value={selectedChantierId}
                onChange={(e) => handleChantierChange(e.target.value)}
                className="block w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all font-medium"
              >
                <option value="">Sélectionner un chantier</option>
                {chantiers.map((chantier) => (
                  <option key={chantier.chantierId} value={chantier.chantierId}>
                    {chantier.nomChantier} - {chantier.clientNom}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Le client sera automatiquement déduit du chantier
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Taux de TVA
            </label>
            <select
              value={tauxTVA}
              onChange={(e) => setTauxTVA(parseFloat(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="0">0% - Exonération</option>
              <option value="6">6% - Taux réduit</option>
              <option value="21">21% - Taux normal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remise globale (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={remiseGlobale}
              onChange={(e) => setRemiseGlobale(parseFloat(e.target.value) || 0)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Observations
          </label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            placeholder="Observations ou notes..."
          />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-medium">Note :</span> Les conditions générales de vente seront automatiquement ajoutées depuis le template configuré dans les paramètres de l'entreprise.
          </p>
        </div>
          </div>
        )}
      </div>

        {/* Lignes du devis */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6">
          <div className="relative px-6 py-4 bg-gradient-to-br from-orange-600/10 via-orange-700/10 to-red-800/10 dark:from-orange-600/5 dark:via-orange-700/5 dark:to-red-800/5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <h2 className="text-lg font-bold text-orange-900 dark:text-white">Lignes du devis</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => addSectionLigne('TITRE')}
                  className="px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-md transition-colors"
                >
                  Ajouter un titre
                </button>
                <button
                  onClick={() => addSectionLigne('SOUS_TITRE')}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-md transition-colors"
                >
                  Ajouter un sous-titre
                </button>
                <button
                  onClick={addLigne}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Ajouter une ligne
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <DndProvider backend={HTML5Backend}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-8">#</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">Article</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-28">Unité</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">Quantité</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-32">Prix Unit.</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-24">Remise %</th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-28">Total</th>
                    <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lignes.map((ligne, index) => (
                    <LigneDevisRow
                      key={ligne.id}
                      index={index}
                      ligne={ligne}
                      onUpdate={updateLigne}
                      onDelete={deleteLigne}
                      moveLigne={moveLigne}
                    />
                  ))}
                </tbody>
              </table>
            </DndProvider>
          </div>

          {/* Boutons d'ajout en bas du tableau */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-orange-600/10 via-orange-700/10 to-red-800/10 dark:from-orange-600/5 dark:via-orange-700/5 dark:to-red-800/5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => addSectionLigne('TITRE')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-orange-900 dark:text-white bg-white/70 dark:bg-white/10 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-md"
              >
                <span className="text-lg leading-none">T</span>
                Ajouter un titre
              </button>
              <button
                onClick={() => addSectionLigne('SOUS_TITRE')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-orange-900 dark:text-white bg-white/60 dark:bg-white/10 hover:bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-md"
              >
                <span className="text-lg leading-none">t</span>
                Ajouter un sous-titre
              </button>
              <button
                onClick={addLigne}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 dark:from-orange-700 dark:to-red-800 dark:hover:from-orange-600 dark:hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter une ligne
              </button>
            </div>
          </div>

        {lignes.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Aucune ligne ajoutée</p>
            <p className="text-sm mt-1">Cliquez sur "Ajouter une ligne" pour commencer</p>
          </div>
        )}
      </div>

      {/* Totaux */}
      {lignes.filter(l => l.type === 'QP').length > 0 && (
        <div className="flex justify-end">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6 w-full max-w-md">
            <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Récapitulatif</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total HT:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{totaux.totalHT.toFixed(2)} €</span>
              </div>
              {remiseGlobale > 0 && (
                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Remise globale ({remiseGlobale}%):</span>
                  <span className="font-semibold text-orange-700 dark:text-orange-300">-{totaux.montantRemise.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total HT après remise:</span>
                <span className="font-semibold text-gray-900 dark:text-white">{totaux.totalHTApresRemise.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TVA ({tauxTVA}%):</span>
                <span className="font-semibold text-gray-900 dark:text-white">{totaux.totalTVA.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gradient-to-br from-orange-600/10 via-orange-700/10 to-red-800/10 dark:from-orange-600/5 dark:via-orange-700/5 dark:to-red-800/5 rounded-lg border border-orange-200 dark:border-orange-800 mt-4">
                <span className="font-bold text-lg text-gray-900 dark:text-white">Total TTC:</span>
                <span className="font-bold text-2xl text-orange-900 dark:text-white">{totaux.totalTTC.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      {ConfirmationModalComponent}
    </div>
  )
}

// Composant pour une ligne de devis
function LigneDevisRow({ 
  index,
  ligne, 
  onUpdate, 
  onDelete,
  moveLigne
}: { 
  index: number
  ligne: LigneDevis
  onUpdate: (id: string, field: keyof LigneDevis, value: LigneDevis[keyof LigneDevis]) => void
  onDelete: (id: string) => void
  moveLigne: (dragIndex: number, hoverIndex: number) => void
}) {
  const ref = useRef<HTMLTableRowElement>(null)
  const isSectionHeader = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

  type DragItem = { id: string; index: number; type: 'ligne-devis' }

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: Identifier | null}>({
    accept: 'ligne-devis',
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId(),
    }),
    hover(item, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) {
        return
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset() as XYCoord | null
      if (!clientOffset) {
        return
      }
      const hoverClientY = clientOffset.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      moveLigne(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag<DragItem, void, { isDragging: boolean }>({
    type: 'ligne-devis',
    item: () => {
      return { id: ligne.id, index, type: 'ligne-devis' }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0 : 1
  drag(drop(ref))

  if (isSectionHeader) {
    return (
      <tr 
        ref={ref}
        style={{ opacity }}
        data-handler-id={handlerId}
        className={ligne.type === 'TITRE' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}
      >
        <td className="px-3 py-2 whitespace-nowrap cursor-move align-top">
          <BarsArrowUpIcon className="h-5 w-5 text-orange-500 dark:text-orange-300" />
        </td>
        <td colSpan={7} className="px-3 py-2">
          <input
            type="text"
            value={ligne.description}
            onChange={(e) => onUpdate(ligne.id, 'description', e.target.value)}
            className={`w-full px-2 py-1 border-0 focus:ring-1 focus:ring-orange-500 rounded ${
              ligne.type === 'TITRE' 
                ? 'text-base font-bold bg-orange-50 dark:bg-orange-900/20' 
                : 'text-sm font-semibold bg-blue-50 dark:bg-blue-900/20'
            } text-gray-900 dark:text-white`}
            placeholder={ligne.type === 'TITRE' ? 'Titre de section' : 'Sous-titre'}
          />
        </td>
        <td className="px-3 py-2">
          <button
            onClick={() => onDelete(ligne.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId}
      className="hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <td className="px-3 py-2 whitespace-nowrap cursor-move align-top">
        <BarsArrowUpIcon className="h-5 w-5 text-gray-400" />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={ligne.article}
          onChange={(e) => onUpdate(ligne.id, 'article', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
          placeholder="Réf."
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          value={ligne.description}
          onChange={(e) => onUpdate(ligne.id, 'description', e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
          placeholder="Description"
        />
      </td>
      <td className="px-3 py-2">
        <select
          value={normalizeUnite(ligne.unite) || 'Pièces'}
          onChange={(e) => onUpdate(ligne.id, 'unite', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-colors"
        >
          <option value="Mct">Mct</option>
          <option value="M2">M²</option>
          <option value="M3">M³</option>
          <option value="Heures">Heures</option>
          <option value="Pièces">Pièces</option>
          <option value="Fft">Forfait</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={ligne.quantite}
          onChange={(e) => onUpdate(ligne.id, 'quantite', parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 text-sm text-center border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-colors"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={ligne.prixUnitaire}
          onChange={(e) => onUpdate(ligne.id, 'prixUnitaire', parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 text-sm text-right border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-colors"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={ligne.remise}
          onChange={(e) => onUpdate(ligne.id, 'remise', e.target.value)}
          className="w-20 px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
        />
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">
        {ligne.total.toFixed(2)} €
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => onDelete(ligne.id)}
          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}


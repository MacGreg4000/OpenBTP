'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { 
  PlusIcon, 
  TrashIcon,
  ArrowLeftIcon,
  BarsArrowUpIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

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

export default function EditDevisPage() {
  const router = useRouter()
  const params = useParams()
  const devisId = params?.id as string

  const [typeDevis, setTypeDevis] = useState<'DEVIS' | 'AVENANT'>('DEVIS')
  const [reference, setReference] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedChantierId, setSelectedChantierId] = useState('')
  const [observations, setObservations] = useState('')
  const [tauxTVA, setTauxTVA] = useState(21)
  const [remiseGlobale, setRemiseGlobale] = useState(0)
  const [lignes, setLignes] = useState<LigneDevis[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadClients()
    loadChantiers()
    if (devisId) {
      loadDevis()
    }
  }, [devisId])

  const loadClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(Array.isArray(data) ? data : data.clients || [])
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
        const data = await response.json()
        // L'API retourne un objet { chantiers: [], meta: {} }
        const chantiersList = data.chantiers || []
        const chantiersData = chantiersList.map((c: any) => ({
          chantierId: c.chantierId,
          nomChantier: c.nomChantier,
          clientId: c.clientId || '',
          clientNom: c.clientNom || 'Client inconnu'
        }))
        setChantiers(chantiersData)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error)
    }
  }

  const handleChantierChange = (chantierId: string) => {
    setSelectedChantierId(chantierId)
    const chantier = chantiers.find(c => c.chantierId === chantierId)
    if (chantier) {
      setSelectedClientId(chantier.clientId)
    }
  }

  const loadDevis = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/devis/${devisId}`)
      if (response.ok) {
        const devis = await response.json()
        
        // Vérifier que le devis est modifiable
        if (devis.statut !== 'BROUILLON') {
          alert('Seuls les devis en brouillon peuvent être modifiés')
          router.push(`/devis/${devisId}`)
          return
        }

        setTypeDevis(devis.typeDevis || 'DEVIS')
        setReference(devis.reference || '')
        setSelectedClientId(devis.clientId)
        setSelectedChantierId(devis.chantierId || '')
        setObservations(devis.observations || '')
        setTauxTVA(Number(devis.tauxTVA) || 21)
        setRemiseGlobale(Number(devis.remiseGlobale) || 0)
        setLignes(devis.lignes.map((l: any) => ({
          id: l.id,
          type: l.type,
          article: l.article || '',
          description: l.description || '',
          unite: l.unite || '',
          quantite: Number(l.quantite) || 0,
          prixUnitaire: Number(l.prixUnitaire) || 0,
          remise: Number(l.remise) || 0,
          total: Number(l.total) || 0
        })))
      } else {
        alert('Erreur lors du chargement du devis')
        router.push('/devis')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du chargement du devis')
      router.push('/devis')
    } finally {
      setLoading(false)
    }
  }

  const addLigne = () => {
    const newLigne: LigneDevis = {
      id: `new-${Date.now()}`,
      type: 'QP',
      article: '',
      description: '',
      unite: 'U',
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

  const updateLigne = (id: string, field: keyof LigneDevis, value: any) => {
    setLignes(lignes.map(ligne => {
      if (ligne.id === id) {
        const updated = { ...ligne, [field]: value }
        
        // Recalculer le total pour les lignes QP
        if (ligne.type === 'QP' && (field === 'quantite' || field === 'prixUnitaire' || field === 'remise')) {
          const quantite = field === 'quantite' ? parseFloat(value) || 0 : ligne.quantite
          const prix = field === 'prixUnitaire' ? parseFloat(value) || 0 : ligne.prixUnitaire
          const remise = field === 'remise' ? parseFloat(value) || 0 : ligne.remise
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
      alert('Veuillez sélectionner un client')
      return
    }

    if (typeDevis === 'AVENANT' && !selectedChantierId) {
      alert('Veuillez sélectionner un chantier')
      return
    }

    if (lignes.length === 0) {
      alert('Veuillez ajouter au moins une ligne')
      return
    }

    try {
      setSaving(true)
      const totaux = calculerTotaux()

      const response = await fetch(`/api/devis/${devisId}`, {
        method: 'PATCH',
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
            ordre: index + 1
          }))
        })
      })

      if (response.ok) {
        router.push(`/devis/${devisId}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la mise à jour du devis')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la mise à jour du devis')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  const totaux = calculerTotaux()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header léger style backdrop-blur */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Effet de fond subtil avec dégradé orange/red (couleur Devis) - opacité 60% */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/60 via-orange-700/60 to-red-800/60 dark:from-orange-600/30 dark:via-orange-700/30 dark:to-red-800/30"></div>
            
            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push(`/devis/${devisId}`)}
                  className="p-2 bg-white/30 backdrop-blur-sm rounded-lg hover:bg-white/40 transition-all duration-200"
                >
                  <ArrowLeftIcon className="h-5 w-5 text-orange-900 dark:text-white" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                  <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                    <DocumentTextIcon className="w-6 h-6 mr-3 text-orange-900 dark:text-white" />
                    <h1 className="text-xl font-bold text-orange-900 dark:text-white">
                      Modifier le devis
                    </h1>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => router.push(`/devis/${devisId}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-orange-900 dark:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-orange-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-900 dark:border-white"></div>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations générales */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg rounded-2xl p-6 space-y-6 mb-6 border border-gray-200/50 dark:border-gray-700/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-br from-orange-500 to-red-600"></div>
          Informations générales
        </h2>
        
        {/* Type de devis : DEVIS ou AVENANT - En lecture seule en édition */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-600/50 rounded-xl p-4 border border-gray-200/50 dark:border-gray-600/50">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Type de document (non modifiable)
          </label>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-bold shadow-sm bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 text-orange-900 dark:text-orange-300 ring-2 ring-orange-300/50 dark:ring-orange-500/50">
              {typeDevis === 'DEVIS' ? '📄 Devis' : '📋 Avenant'}
            </span>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Le type ne peut pas être modifié après création
            </p>
          </div>
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

        {/* Lignes du devis */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden mb-6">
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
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 w-full max-w-md">
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
  onUpdate: (id: string, field: keyof LigneDevis, value: any) => void
  onDelete: (id: string) => void
  moveLigne: (dragIndex: number, hoverIndex: number) => void
}) {
  const ref = useRef<HTMLTableRowElement>(null)
  const isSectionHeader = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

  const [{ handlerId }, drop] = useDrop({
    accept: 'ligne-devis',
    collect(monitor: any) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: any, monitor: any) {
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
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

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

  const [{ isDragging }, drag] = useDrag({
    type: 'ligne-devis',
    item: () => {
      return { id: ligne.id, index }
    },
    collect: (monitor: any) => ({
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
          value={ligne.unite}
          onChange={(e) => onUpdate(ligne.id, 'unite', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:focus:ring-orange-800 transition-colors"
        >
          <option value="Mct">Mct</option>
          <option value="M2">M²</option>
          <option value="M3">M³</option>
          <option value="Heures">Heures</option>
          <option value="Pièces">Pièces</option>
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


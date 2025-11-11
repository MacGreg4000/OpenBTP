'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  PlusIcon, 
  TrashIcon,
  ArrowLeftIcon,
  ArrowsUpDownIcon
} from '@heroicons/react/24/outline'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Client {
  id: string
  nom: string
  email: string
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

export default function NouveauDevisPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [observations, setObservations] = useState('')
  const [conditionsGenerales, setConditionsGenerales] = useState(`CONDITIONS GÉNÉRALES DE VENTE

1. OBJET
Les présentes Conditions Générales de Vente (CGV) régissent les relations entre [Votre Société] et ses clients.

2. PRIX
Les prix sont indiqués en euros, hors taxes. La TVA sera ajoutée au taux en vigueur.

3. VALIDITÉ
Ce devis est valable 30 jours à compter de sa date d'émission.

4. PAIEMENT
Le règlement s'effectuera selon les conditions suivantes :
- 30% à la commande
- 40% à mi-parcours
- 30% à la livraison

5. EXÉCUTION
Les délais d'exécution sont donnés à titre indicatif et ne constituent pas une obligation de résultat.

6. GARANTIES
Les travaux sont garantis selon les normes en vigueur.`)
  const [remiseGlobale, setRemiseGlobale] = useState(0)
  const [lignes, setLignes] = useState<LigneDevis[]>([])
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadClients()
  }, [])

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      setLignes((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const calculerTotaux = () => {
    const lignesCalculables = lignes.filter(l => l.type === 'QP')
    const totalHT = lignesCalculables.reduce((sum, l) => sum + l.total, 0)
    const montantRemise = totalHT * (remiseGlobale / 100)
    const totalHTApresRemise = totalHT - montantRemise
    const totalTVA = totalHTApresRemise * 0.20
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
    if (!selectedClientId) {
      alert('Veuillez sélectionner un client')
      return
    }

    if (lignes.length === 0) {
      alert('Veuillez ajouter au moins une ligne')
      return
    }

    try {
      setSaving(true)
      const totaux = calculerTotaux()

      const response = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          observations,
          conditionsGenerales,
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
        const devis = await response.json()
        router.push(`/devis/${devis.id}`)
      } else {
        const error = await response.json()
        alert(error.error || 'Erreur lors de la création du devis')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la création du devis')
    } finally {
      setSaving(false)
    }
  }

  const totaux = calculerTotaux()

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Nouveau devis</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Créez un nouveau devis client</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">Informations générales</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Client *
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Sélectionner un client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nom}
                </option>
              ))}
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Conditions générales de vente
          </label>
          <textarea
            value={conditionsGenerales}
            onChange={(e) => setConditionsGenerales(e.target.value)}
            rows={8}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 font-mono text-xs"
          />
        </div>
      </div>

      {/* Lignes du devis */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Lignes du devis</h2>
          <div className="flex space-x-2">
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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lignes.map(l => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-8"></th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Article</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unité</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Qté</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Prix U.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Remise %</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Total</th>
                    <th className="w-12"></th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lignes.map((ligne) => (
                    <LigneDevisRow
                      key={ligne.id}
                      ligne={ligne}
                      onUpdate={updateLigne}
                      onDelete={deleteLigne}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </SortableContext>
        </DndContext>

        {lignes.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Aucune ligne ajoutée</p>
            <p className="text-sm mt-1">Cliquez sur "Ajouter une ligne" pour commencer</p>
          </div>
        )}
      </div>

      {/* Totaux */}
      {lignes.filter(l => l.type === 'QP').length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="max-w-md ml-auto space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total HT</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {totaux.totalHT.toFixed(2)} €
              </span>
            </div>
            {remiseGlobale > 0 && (
              <div className="flex justify-between text-sm text-orange-600 dark:text-orange-400">
                <span>Remise globale ({remiseGlobale}%)</span>
                <span>-{totaux.montantRemise.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Total HT après remise</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {totaux.totalHTApresRemise.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {totaux.totalTVA.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-900 dark:text-white">Total TTC</span>
              <span className="text-orange-600 dark:text-orange-400">
                {totaux.totalTTC.toFixed(2)} €
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant pour une ligne de devis
function LigneDevisRow({ 
  ligne, 
  onUpdate, 
  onDelete 
}: { 
  ligne: LigneDevis
  onUpdate: (id: string, field: keyof LigneDevis, value: any) => void
  onDelete: (id: string) => void
}) {
  const isSectionHeader = ligne.type === 'TITRE' || ligne.type === 'SOUS_TITRE'

  if (isSectionHeader) {
    return (
      <tr className={ligne.type === 'TITRE' ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}>
        <td className="px-3 py-2">
          <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 cursor-move" />
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
    <tr>
      <td className="px-3 py-2">
        <ArrowsUpDownIcon className="h-4 w-4 text-gray-400 cursor-move" />
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
        <input
          type="text"
          value={ligne.unite}
          onChange={(e) => onUpdate(ligne.id, 'unite', e.target.value)}
          className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
          placeholder="U"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={ligne.quantite}
          onChange={(e) => onUpdate(ligne.id, 'quantite', e.target.value)}
          className="w-20 px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="0.01"
          value={ligne.prixUnitaire}
          onChange={(e) => onUpdate(ligne.id, 'prixUnitaire', e.target.value)}
          className="w-24 px-2 py-1 text-sm text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
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


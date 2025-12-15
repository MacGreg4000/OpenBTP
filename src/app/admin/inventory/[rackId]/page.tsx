'use client'

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RackWithEmplacements } from '@/types/inventory'
import { Breadcrumb } from '@/components/Breadcrumb'

export default function RackDetailPage(props: { params: Promise<{ rackId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const [rack, setRack] = useState<RackWithEmplacements | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [selectedEmplacement, setSelectedEmplacement] = useState<string | null>(null)
  const [materiauData, setMateriauData] = useState({
    nom: '',
    description: '',
    quantite: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Charger les détails du rack
  useEffect(() => {
    const loadRack = async () => {
      try {
        const response = await fetch(`/api/inventory/racks`)
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const racks: Array<RackWithEmplacements> = await response.json()
        const currentRack = racks.find((r) => r.id === params.rackId)
        
        if (!currentRack) {
          throw new Error('Rack non trouvé')
        }
        
        setRack(currentRack)
      } catch (err) {
        setError('Erreur lors du chargement du rack')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    loadRack()
  }, [params.rackId])

  // Ajouter un matériau
  const handleAddMateriau = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedEmplacement) {
      setFormError('Veuillez sélectionner un emplacement')
      return
    }
    
    setFormError(null)
    setSubmitting(true)
    try {
      // Créer le matériau avec conversion de la quantité en nombre
      const requestData = {
        ...materiauData,
        quantite: materiauData.quantite === '' ? 0 : parseFloat(materiauData.quantite),
        emplacementId: selectedEmplacement
      }
      
      // Créer le matériau
      const response = await fetch('/api/inventory/materiaux', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'ajout du matériau')
      }
      
      // Recharger les données du rack
      const rackResponse = await fetch(`/api/inventory/racks`)
      if (!rackResponse.ok) {
        throw new Error('Erreur lors du rechargement des données')
      }
      const racks: Array<RackWithEmplacements> = await rackResponse.json()
      const updatedRack = racks.find((r) => r.id === params.rackId)
      
      if (!updatedRack) {
        throw new Error('Rack non trouvé')
      }
      
      setRack(updatedRack)
      
      // Réinitialiser le formulaire
      setMateriauData({
        nom: '',
        description: '',
        quantite: ''
      })
      setSelectedEmplacement(null)
    } catch (err) {
      setError('Erreur lors de l\'ajout du matériau')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  // Gérer la sélection d'un emplacement
  const handleEmplacementSelect = (emplacementId: string) => {
    setSelectedEmplacement(emplacementId === selectedEmplacement ? null : emplacementId)
  }

  // Visualisation du rack
  const renderRackVisualization = () => {
    if (!rack) return null
    
    const preview = []
    
    // En-têtes des colonnes
    const colHeaders = []
    for (let col = 1; col <= rack.colonnes; col++) {
      colHeaders.push(
        <th key={`col-${col}`} className="p-2 border text-center">{col}</th>
      )
    }
    preview.push(
      <tr key="col-headers">
        <th></th>
        {colHeaders}
      </tr>
    )
    
    // Lignes du rack
    for (let ligne = 1; ligne <= rack.lignes; ligne++) {
      const rowCells = []
      for (let col = 1; col <= rack.colonnes; col++) {
        // Trouver l'emplacement correspondant
        const emplacement = rack.emplacements.find(
          e => e.ligne === ligne && e.colonne === col
        )
        
        if (!emplacement) {
          rowCells.push(
            <td key={`cell-${ligne}-${col}`} className="p-2 border text-center bg-gray-200">
              N/A
            </td>
          )
          continue
        }
        
        // Déterminer la classe CSS en fonction du statut
        let cellClass = "p-2 border text-center cursor-pointer "
        
        if (emplacement.id === selectedEmplacement) {
          cellClass += "bg-blue-500 text-white"
        } else if (emplacement.statut === 'occupé') {
          cellClass += "bg-red-500 text-white"
        } else {
          cellClass += "bg-green-100 hover:bg-green-200"
        }
        
        // Contenu de la cellule
        const content = emplacement.materiaux.length > 0 
          ? emplacement.materiaux[0].nom 
          : String.fromCharCode(64 + ligne) + col
        
        rowCells.push(
          <td 
            key={`cell-${ligne}-${col}`} 
            className={cellClass}
            onClick={() => emplacement.statut !== 'occupé' && handleEmplacementSelect(emplacement.id)}
            title={emplacement.statut === 'occupé' 
              ? `Occupé: ${emplacement.materiaux[0]?.nom || 'Materiau inconnu'}` 
              : `Emplacement ${String.fromCharCode(64 + ligne)}${col} - Cliquez pour sélectionner`
            }
          >
            {content}
          </td>
        )
      }
      
      preview.push(
        <tr key={`row-${ligne}`}>
          <th className="p-2 border text-center">{String.fromCharCode(64 + ligne)}</th>
          {rowCells}
        </tr>
      )
    }
    
    return (
      <table className="border-collapse border mt-4 w-full">
        <tbody>
          {preview}
        </tbody>
      </table>
    )
  }

  return (
    <div className="container mx-auto">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Inventaire', href: '/inventory' },
          { label: 'Administration des Racks', href: '/admin/inventory' },
          { label: loading ? 'Chargement...' : rack ? rack.nom : 'Rack non trouvé' }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button 
            onClick={() => router.push('/admin/inventory')}
            className="mr-4 p-2 rounded hover:bg-gray-100"
          >
            ← Retour
          </button>
          <h1 className="text-2xl font-bold">
            {loading ? 'Chargement...' : rack ? `Détails du rack: ${rack.nom}` : 'Rack non trouvé'}
          </h1>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Chargement du rack...</p>
        </div>
      ) : rack ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informations du rack */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow-md rounded p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Informations</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-500">Nom:</span>
                  <p className="font-medium">{rack.nom}</p>
                </div>
                <div>
                  <span className="text-gray-500">Position:</span>
                  <p className="font-medium">{rack.position}</p>
                </div>
                <div>
                  <span className="text-gray-500">Dimensions:</span>
                  <p className="font-medium">{rack.lignes} lignes × {rack.colonnes} colonnes</p>
                </div>
                <div>
                  <span className="text-gray-500">Emplacements:</span>
                  <p className="font-medium">{rack.emplacements.length}</p>
                </div>
                <div>
                  <span className="text-gray-500">Emplacements occupés:</span>
                  <p className="font-medium">
                    {rack.emplacements.filter(e => e.statut === 'occupé').length} / {rack.emplacements.length}
                  </p>
                </div>
              </div>
              
              {/* Ajouter un matériau */}
              <div className="mt-8">
                <h3 className="text-lg font-medium mb-3">Ajouter un matériau</h3>
                {selectedEmplacement ? (
                  <form onSubmit={handleAddMateriau}>
                    {formError && (
                      <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {formError}
                      </div>
                    )}
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="nom" className="block text-sm font-medium text-gray-700">
                          Nom du matériau
                        </label>
                        <input
                          type="text"
                          id="nom"
                          value={materiauData.nom}
                          onChange={(e) => setMateriauData({...materiauData, nom: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          required
                        />
                      </div>
                      <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                          Description
                        </label>
                        <textarea
                          id="description"
                          value={materiauData.description}
                          onChange={(e) => setMateriauData({...materiauData, description: e.target.value})}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          rows={3}
                        />
                      </div>
                      <div>
                        <label htmlFor="quantite" className="block text-sm font-medium text-gray-700">
                          Quantité
                        </label>
                        <input
                          type="number"
                          id="quantite"
                          value={materiauData.quantite}
                          onChange={(e) => setMateriauData({...materiauData, quantite: e.target.value})}
                          placeholder="0,00"
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                          required
                        />
                      </div>
                      
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={submitting}
                          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded disabled:bg-blue-300"
                        >
                          {submitting ? 'Ajout en cours...' : 'Ajouter le matériau'}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-gray-500 text-sm">
                    Sélectionnez un emplacement libre dans la visualisation du rack pour ajouter un matériau.
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Visualisation du rack */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow-md rounded p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Visualisation du rack</h2>
              <div className="overflow-auto">
                {renderRackVisualization()}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-100 border border-gray-300 mr-2"></div>
                  <span className="text-sm">Libre</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 border border-gray-300 mr-2"></div>
                  <span className="text-sm">Occupé</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 border border-gray-300 mr-2"></div>
                  <span className="text-sm">Sélectionné</span>
                </div>
              </div>
            </div>
            
            {/* Liste des matériaux dans ce rack */}
            <div className="bg-white shadow-md rounded p-6">
              <h2 className="text-xl font-semibold mb-4">Matériaux dans ce rack</h2>
              {rack.emplacements.some(e => e.statut === 'occupé') ? (
                <div className="space-y-4">
                  {rack.emplacements
                    .filter(e => e.statut === 'occupé' && e.materiaux.length > 0)
                    .map(e => (
                      <div key={e.id} className="border-b pb-3">
                        <div className="flex justify-between">
                          <h3 className="font-medium">{e.materiaux[0].nom}</h3>
                          <span className="text-blue-500">
                            Position: {String.fromCharCode(64 + e.ligne)}{e.colonne}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{e.materiaux[0].description || 'Aucune description'}</p>
                        <p className="text-sm mt-1">
                          <span className="font-medium">Quantité:</span> {typeof e.materiaux[0].quantite === 'number' ? e.materiaux[0].quantite.toFixed(2) : e.materiaux[0].quantite}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500">Aucun matériau n&apos;a été ajouté à ce rack.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg text-gray-600">Rack non trouvé.</p>
          <Link href="/admin/inventory" className="mt-4 inline-block text-blue-500 hover:underline">
            Retour à la liste des racks
          </Link>
        </div>
      )}
    </div>
  )
} 
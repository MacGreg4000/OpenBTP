'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Materiau } from '@/types/inventory'
import { Breadcrumb } from '@/components/Breadcrumb'

export default function MobileInventoryPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Materiau[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [foundItem, setFoundItem] = useState<Materiau | null>(null)
  
  // Charger les recherches récentes
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentMaterialSearches')
    if (savedSearches) {
      setRecentSearches(JSON.parse(savedSearches))
    }
  }, [])
  
  // Recherche de matériaux
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch(`/api/inventory/materiaux?search=${encodeURIComponent(searchTerm)}`)
      if (!response.ok) {
        throw new Error('Erreur lors de la recherche')
      }
      
      const results = await response.json()
      setSearchResults(results)
      
      // Mettre à jour les recherches récentes
      if (searchTerm.trim() && !recentSearches.includes(searchTerm)) {
        const updatedSearches = [searchTerm, ...recentSearches.slice(0, 4)]
        setRecentSearches(updatedSearches)
        localStorage.setItem('recentMaterialSearches', JSON.stringify(updatedSearches))
      }
    } catch (err) {
      setError('Erreur lors de la recherche')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  
  // Simuler le scan d'un code QR
  const handleScanQR = () => {
    setScanMode(true)
    
    // Simulation: Dans une vraie application, nous utiliserions l'API MediaDevices pour accéder à la caméra
    setTimeout(() => {
      // Simuler un scan réussi
      const simulatedCodes = [
        'MAT-1234567890', // Simulation d'un code matériau
        'RACK-A-1-2',     // Simulation d'un code emplacement
      ]
      
      const randomCode = simulatedCodes[Math.floor(Math.random() * simulatedCodes.length)]
      setScannedCode(randomCode)
      
      // Simuler la recherche basée sur le code scanné
      if (randomCode.startsWith('MAT-')) {
        // Simuler la récupération des détails d'un matériau
        setFoundItem({
          id: '1',
          nom: 'Vis M4 x 30mm',
          description: 'Vis à tête hexagonale en acier inoxydable',
          quantite: 250,
          codeQR: randomCode,
          emplacementId: 'emp123',
          createdAt: new Date(),
          updatedAt: new Date(),
          emplacement: {
            id: 'emp123',
            ligne: 2,
            colonne: 3,
            statut: 'occupé',
            rack: {
              id: 'rack1',
              nom: 'Rack A',
              position: 'Zone 1 - Est'
            }
          }
        })
      } else if (randomCode.startsWith('RACK-')) {
        // Simuler la récupération des détails d'un emplacement
        const [, rackId, ligne, colonne] = randomCode.split('-')
        setFoundItem({
          id: '2',
          nom: 'Écrous M4',
          description: 'Écrous hexagonaux M4 standard',
          quantite: 500,
          codeQR: 'MAT-987654321',
          emplacementId: 'emp456',
          createdAt: new Date(),
          updatedAt: new Date(),
          emplacement: {
            id: 'emp456',
            ligne: parseInt(ligne),
            colonne: parseInt(colonne),
            statut: 'occupé',
            rack: {
              id: 'rack1',
              nom: `Rack ${rackId}`,
              position: 'Zone 1 - Est'
            }
          }
        })
      }
      
      setScanMode(false)
    }, 2000)
  }
  
  const resetScan = () => {
    setScannedCode(null)
    setFoundItem(null)
  }
  
  return (
    <div className="container mx-auto max-w-md">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Inventaire', href: '/inventory' },
          { label: 'Version Mobile' }
        ]}
      />

      <div className="flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-6">Inventaire Mobile</h1>
        
        {/* Barre de recherche */}
        <div className="w-full mb-6">
          <div className="flex">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Rechercher un matériau..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full p-3 pl-10 pr-4 border rounded-l text-lg"
              />
              <svg 
                className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-r text-lg"
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Bouton Scanner QR */}
        <button
          onClick={handleScanQR}
          disabled={scanMode}
          className="w-full bg-gray-800 hover:bg-gray-900 text-white py-4 rounded-lg flex items-center justify-center mb-6 disabled:bg-gray-500"
        >
          <svg 
            className="h-6 w-6 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9h18v12H3z M17 3l-5 6-5-6" />
          </svg>
          {scanMode ? "Scan en cours..." : "Scanner un QR Code"}
        </button>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
            {error}
          </div>
        )}
        
        {/* Affichage du mode scan */}
        {scanMode && (
          <div className="w-full bg-black rounded-lg overflow-hidden mb-6 aspect-square relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse text-white text-lg">
                Positionnez le code QR dans le cadre...
              </div>
            </div>
            <div className="absolute inset-16 border-2 border-blue-500 rounded-lg"></div>
          </div>
        )}
        
        {/* Résultat du scan */}
        {scannedCode && foundItem && !scanMode && (
          <div className="w-full bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">{foundItem.nom}</h2>
              <button 
                onClick={resetScan}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">{foundItem.description}</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-500">Quantité</span>
                <p className="font-medium">{foundItem.quantite}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Code QR</span>
                <p className="font-medium text-xs">{foundItem.codeQR}</p>
              </div>
            </div>
            {foundItem.emplacement && (
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-2">Emplacement</h3>
                <p className="text-blue-500">
                  {foundItem.emplacement.rack?.nom} - 
                  Position: {String.fromCharCode(64 + foundItem.emplacement.ligne)}
                  {foundItem.emplacement.colonne}
                </p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t flex justify-center">
              <button 
                onClick={handleScanQR}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Scanner un autre code
              </button>
            </div>
          </div>
        )}
        
        {/* Résultats de recherche */}
        {!scanMode && !scannedCode && (
          <div className="w-full">
            {loading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="mt-2">Recherche en cours...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Résultats de recherche</h2>
                <div className="space-y-4">
                  {searchResults.map(materiau => (
                    <div key={materiau.id} className="bg-white shadow-md rounded-lg p-4">
                      <h3 className="font-medium">{materiau.nom}</h3>
                      <p className="text-sm text-gray-600">{materiau.description || 'Aucune description'}</p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Quantité:</span> {materiau.quantite}
                      </p>
                      {materiau.emplacement && materiau.emplacement.rack && (
                        <p className="text-sm text-blue-500 mt-1">
                          {materiau.emplacement.rack.nom} - 
                          {String.fromCharCode(64 + materiau.emplacement.ligne)}
                          {materiau.emplacement.colonne}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : searchTerm ? (
              <p className="text-gray-500 text-center py-4">Aucun résultat trouvé pour &quot;{searchTerm}&quot;</p>
            ) : recentSearches.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold mb-4">Recherches récentes</h2>
                <div className="bg-white shadow-md rounded-lg p-4">
                  <ul className="space-y-2">
                    {recentSearches.map((term, index) => (
                      <li key={index}>
                        <button
                          onClick={() => {
                            setSearchTerm(term)
                            handleSearch()
                          }}
                          className="text-blue-500 hover:underline"
                        >
                          {term}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Utilisez la barre de recherche ou scannez un code QR pour trouver des matériaux
              </p>
            )}
          </div>
        )}
        
        {/* Navigation vers version bureau */}
        <div className="mt-10 w-full text-center">
          <Link href="/inventory" className="text-blue-500 hover:text-blue-700">
            Accéder à la version complète →
          </Link>
        </div>
      </div>
    </div>
  )
} 
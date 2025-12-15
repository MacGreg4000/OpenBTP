'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Breadcrumb } from '@/components/Breadcrumb'
import EmplacementQRScanner from '@/components/inventory/EmplacementQRScanner'
import Link from 'next/link'
import { RackWithEmplacements, Materiau } from '@/types/inventory'

// Composant qui utilise useSearchParams
function SearchParamsHandler({ 
  racks, 
  onScanComplete 
}: { 
  racks: RackWithEmplacements[], 
  onScanComplete: (rackId: string, ligne: number, colonne: number, emplacementQrCode: string) => void 
}) {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Vérifier si on a un code QR dans les paramètres d'URL
    const qrCode = searchParams.get('code')
    if (qrCode && racks.length > 0) {
      // Extraire les informations du code QR
      const qrCodeRegex = /^EMP-([a-zA-Z0-9-]+)-(\d+)-(\d+)$/
      const match = qrCode.match(qrCodeRegex)
      
      if (match) {
        const [, rackId, ligneStr, colonneStr] = match
        const ligne = parseInt(ligneStr)
        const colonne = parseInt(colonneStr)
        
        if (!isNaN(ligne) && !isNaN(colonne)) {
          // Traiter le code QR comme s'il avait été scanné
          onScanComplete(rackId, ligne, colonne, qrCode)
        }
      }
    }
  }, [searchParams, racks, onScanComplete])
  
  return null
}

export default function InventoryScannerPage() {
  const router = useRouter()
  const [racks, setRacks] = useState<RackWithEmplacements[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [foundEmplacement, setFoundEmplacement] = useState<{
    id: string
    ligne: number
    colonne: number
    rackNom: string
    rackId: string
    position: string
    qrCodeValue: string
  } | null>(null)
  const [scannedMateriau, setScannedMateriau] = useState<Materiau | null>(null)
  const [processingAction, setProcessingAction] = useState(false)
  
  // Charger tous les racks au démarrage
  useEffect(() => {
    const loadRacks = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/inventory/racks')
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des racks')
        }
        const data = await response.json()
        setRacks(data)
      } catch (err) {
        console.error('Erreur:', err)
        setError('Impossible de charger les données des racks')
      } finally {
        setLoading(false)
      }
    }
    
    loadRacks()
  }, [])
  
  // Gérer le scan d'un QR code
  const handleScanComplete = async (rackId: string, ligne: number, colonne: number, emplacementQrCode: string) => {
    try {
      // Rechercher le rack correspondant
      const rack = racks.find(r => r.id.includes(rackId))
      if (!rack) {
        setError(`Rack non trouvé (ID partiel: ${rackId})`)
        return
      }
      
      // Rechercher l'emplacement dans ce rack
      const emplacement = rack.emplacements.find(e => e.ligne === ligne && e.colonne === colonne)
      if (!emplacement) {
        setError(`Emplacement non trouvé dans le rack ${rack.nom} (${ligne}, ${colonne})`)
        return
      }
      
      // Mémoriser l'emplacement trouvé avec des informations supplémentaires
      const emplacementInfo = {
        ...emplacement,
        rackNom: rack.nom,
        rackId: rack.id,
        position: `${String.fromCharCode(64 + ligne)}${colonne}`,
        qrCodeValue: emplacementQrCode
      }
      
      setFoundEmplacement(emplacementInfo)
      
      // Si l'emplacement contient un matériau, le récupérer
      if (emplacement.statut === 'occupé' && emplacement.materiaux && emplacement.materiaux.length > 0) {
        setScannedMateriau(emplacement.materiaux[0])
      } else {
        setScannedMateriau(null)
      }
      
      // Effacer les erreurs précédentes
      setError(null)
      
    } catch (err) {
      console.error('Erreur lors du traitement du scan:', err)
      setError('Erreur lors du traitement du QR code scanné')
    }
  }
  
  // Retirer un matériau d'un emplacement
  const handleRemoveMaterial = async () => {
    if (!foundEmplacement || !scannedMateriau) return
    
    try {
      setProcessingAction(true)
      setSuccessMessage(null)
      
      // Appel à l'API pour supprimer le matériau
      const response = await fetch(`/api/inventory/materiaux/${scannedMateriau.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de la suppression du matériau')
      }
      
      setSuccessMessage(`Le matériau ${scannedMateriau.nom} a été retiré avec succès de l'emplacement ${foundEmplacement.position}`)
      
      // Réinitialiser pour permettre un nouveau scan
      setFoundEmplacement(null)
      setScannedMateriau(null)
      
      // Rafraîchir les données des racks
      const racksResponse = await fetch('/api/inventory/racks')
      if (racksResponse.ok) {
        const data = await racksResponse.json()
        setRacks(data)
      }
      
    } catch (err) {
      console.error('Erreur:', err)
      setError('Erreur lors de la suppression du matériau')
    } finally {
      setProcessingAction(false)
    }
  }
  
  // Ajouter un nouveau matériau
  const handleAddMaterial = () => {
    if (!foundEmplacement) return
    
    // Rediriger vers la page d'inventaire avec des paramètres pour pré-sélectionner l'emplacement
    router.push(`/inventory?emplacementId=${foundEmplacement.id}&rackId=${foundEmplacement.rackId}`)
  }
  
  // Réinitialiser pour un nouveau scan
  const handleReset = () => {
    setFoundEmplacement(null)
    setScannedMateriau(null)
    setError(null)
  }
  
  return (
    <div className="container mx-auto">
      <Breadcrumb
        items={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Inventaire', href: '/inventory' },
          { label: 'Scanner QR Code' }
        ]}
      />
      
      <Suspense fallback={null}>
        <SearchParamsHandler racks={racks} onScanComplete={handleScanComplete} />
      </Suspense>
      
      <div className="flex flex-col items-center pb-12">
        <h1 className="text-2xl font-bold mb-6">Scanner un QR code d&apos;emplacement</h1>
        
        {successMessage && (
          <div className="w-full max-w-md bg-green-50 text-green-700 p-4 rounded-lg mb-4 border border-green-200">
            {successMessage}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-2">Chargement des données...</p>
          </div>
        ) : error ? (
          <div className="w-full max-w-md bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <p>{error}</p>
            <button 
              onClick={handleReset}
              className="mt-2 text-sm text-red-700 underline"
            >
              Réessayer
            </button>
          </div>
        ) : foundEmplacement ? (
          <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold">{foundEmplacement.rackNom}</h2>
                <p className="text-gray-600">Emplacement {foundEmplacement.position}</p>
              </div>
              <button 
                onClick={handleReset}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {scannedMateriau ? (
              // Affichage des détails du matériau trouvé
              <div className="mb-6">
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium text-blue-800">Matériau trouvé</h3>
                  <p className="text-blue-700 font-bold text-lg">{scannedMateriau.nom}</p>
                  <p className="text-blue-600 mt-1">{scannedMateriau.description || 'Aucune description'}</p>
                  <p className="text-blue-600 mt-1">
                    <span className="font-medium">Quantité:</span> {typeof scannedMateriau.quantite === 'number' ? scannedMateriau.quantite.toFixed(2) : scannedMateriau.quantite}
                  </p>
                </div>
                
                <button
                  onClick={handleRemoveMaterial}
                  disabled={processingAction}
                  className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-md font-medium"
                >
                  {processingAction ? 'Traitement...' : 'Retirer ce matériau'}
                </button>
              </div>
            ) : (
              // Emplacement libre, proposition d'ajout
              <div className="mb-6">
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <h3 className="font-medium text-green-800">Emplacement libre</h3>
                  <p className="text-green-600">Cet emplacement est disponible pour l&apos;ajout d&apos;un nouveau matériau.</p>
                </div>
                
                <button
                  onClick={handleAddMaterial}
                  disabled={processingAction}
                  className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md font-medium"
                >
                  Ajouter un matériau
                </button>
              </div>
            )}
            
            <div className="mt-4 text-center">
              <Link href="/inventory" className="text-blue-600 hover:text-blue-800">
                Retour à l&apos;inventaire
              </Link>
            </div>
          </div>
        ) : (
          <EmplacementQRScanner onScanComplete={handleScanComplete} />
        )}
      </div>
    </div>
  )
} 
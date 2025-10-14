'use client'
import { useState, useRef } from 'react'
// import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { DocumentCheckIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
// import Link from 'next/link'

export default function BonRegiePage() {
  // const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  // Références pour les champs du formulaire
  const signatureRef = useRef<SignatureCanvas>(null)
  
  // États pour les données du formulaire
  const [dates, setDates] = useState('')
  const [client, setClient] = useState('')
  const [nomChantier, setNomChantier] = useState('')
  const [description, setDescription] = useState('')
  const [tempsChantier, setTempsChantier] = useState('')
  const [nombreTechniciens, setNombreTechniciens] = useState('')
  const [materiaux, setMateriaux] = useState('')
  const [nomSignataire, setNomSignataire] = useState('')
  
  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear()
    }
  }
  
  // const resetFormAndSignature = () => {
  //   setDates('')
  //   setClient('')
  //   setNomChantier('')
  //   setDescription('')
  //   setTempsChantier('')
  //   setNombreTechniciens('')
  //   setMateriaux('')
  //   setNomSignataire('')
  //   clearSignature()
  //   setSuccess(false)
  //   window.scrollTo(0, 0)
  // }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Vérifier si la signature est vide
    if (signatureRef.current?.isEmpty()) {
      alert('Veuillez signer le bon de régie')
      return
    }
    
    setLoading(true)
    
    try {
      // Récupérer la signature en tant que données base64 avec une qualité réduite
      const signatureData = signatureRef.current?.toDataURL('image/jpeg', 0.5) || ''
      
      // Préparer les données du bon de régie
      const bonRegieData = {
        dates,
        client,
        nomChantier,
        description,
        tempsChantier: tempsChantier ? parseFloat(tempsChantier) : null,
        nombreTechniciens: nombreTechniciens ? parseInt(nombreTechniciens) : null,
        materiaux: materiaux && materiaux.trim() !== '' ? materiaux : null,
        nomSignataire,
        signature: signatureData,
        dateSignature: new Date().toISOString()
      }
      
      // Envoyer les données au serveur (ENDPOINT MIS A JOUR)
      const response = await fetch('/api/public/bon-regie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bonRegieData)
      })
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'enregistrement du bon de régie')
      }
      
      setSuccess(true)
      
      // Réinitialiser le formulaire
      setDates('')
      setClient('')
      setNomChantier('')
      setDescription('')
      setTempsChantier('')
      setNombreTechniciens('')
      setMateriaux('')
      setNomSignataire('')
      clearSignature()
      
      // Faire défiler la page vers le haut pour voir la notification
      window.scrollTo(0, 0)
    } catch (error) {
      console.error('Erreur:', error)
      alert('Une erreur est survenue lors de l\'enregistrement du bon de régie')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Image
                src="/images/logo.png"
                alt="SECOTECH"
                width={150}
                height={60}
                className="mr-4"
              />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Travaux en Régie
              </h1>
            </div>
          </div>
          
          {success ? (
            <div className="bg-green-50 dark:bg-green-900/30 p-6 rounded-lg text-center mb-6">
              <DocumentCheckIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
                Bon de régie enregistré avec succès!
              </h2>
              <p className="text-green-600 dark:text-green-400 mb-4">
                Le bon de régie a été correctement enregistré dans notre système.
              </p>
            </div>
          ) : null}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <label htmlFor="dates" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date d&apos;intervention
                </label>
                <input
                  type="date"
                  id="dates"
                  value={dates}
                  onChange={(e) => setDates(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="client" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Client
                </label>
                <input
                  type="text"
                  id="client"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="nomChantier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chantier
                </label>
                <input
                  type="text"
                  id="nomChantier"
                  value={nomChantier}
                  onChange={(e) => setNomChantier(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Travail réalisé
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="tempsChantier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Temps sur chantier (h)
                  </label>
                  <input
                    type="number"
                    id="tempsChantier"
                    value={tempsChantier}
                    onChange={(e) => setTempsChantier(e.target.value)}
                    step="0.5"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="nombreTechniciens" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nombre d&apos;ouvriers
                  </label>
                  <input
                    type="number"
                    id="nombreTechniciens"
                    value={nombreTechniciens}
                    onChange={(e) => setNombreTechniciens(e.target.value)}
                    min="1"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="materiaux" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Matériaux utilisés (optionnel)
                </label>
                <textarea
                  id="materiaux"
                  value={materiaux}
                  onChange={(e) => setMateriaux(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Décrivez les matériaux utilisés si applicable..."
                />
              </div>
            </div>
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Signature du responsable sur site
                </label>
                <div className="mt-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden bg-white">
                  <SignatureCanvas
                    ref={signatureRef}
                    canvasProps={{
                      width: 500, height: 200, 
                      className: 'sigCanvas w-full h-auto'
                    }}
                    backgroundColor="rgb(255,255,255)"
                    penColor="rgb(0,0,0)"
                  />
                </div>
                <button 
                  type="button"
                  onClick={clearSignature}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Effacer la signature
                </button>
              </div>
              
              <div>
                <label htmlFor="nomSignataire" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom du signataire
                </label>
                <input
                  type="text"
                  id="nomSignataire"
                  value={nomSignataire}
                  onChange={(e) => setNomSignataire(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer le bon de régie'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 
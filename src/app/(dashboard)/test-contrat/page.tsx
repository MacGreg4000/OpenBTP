'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export default function TestContratPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testGeneration = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Créer un sous-traitant de test
      const testSoustraitant = {
        nom: 'Entreprise Test SARL',
        email: 'test@example.com',
        telephone: '0123456789',
        adresse: '123 Rue de Test, 4000 Liège',
        tva: 'BE0123456789',
        contact: 'Jean Dupont'
      }

      // Créer le sous-traitant en base
      const createResponse = await fetch('/api/sous-traitants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testSoustraitant)
      })

      if (!createResponse.ok) {
        throw new Error('Erreur lors de la création du sous-traitant de test')
      }

      const soustraitant = await createResponse.json()

      // Générer le contrat
      const contratResponse = await fetch(`/api/sous-traitants/${soustraitant.id}/generer-contrat`, {
        method: 'POST'
      })

      if (!contratResponse.ok) {
        const errorData = await contratResponse.json()
        throw new Error(`Erreur lors de la génération du contrat: ${errorData.error}`)
      }

      const contrat = await contratResponse.json()
      setResult(contrat.url)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!session) {
    return <div className="p-8">Veuillez vous connecter pour accéder à cette page.</div>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2 dark:text-white">
        <DocumentTextIcon className="h-8 w-8" />
        Test de génération de contrat professionnel
      </h1>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-medium mb-4 dark:text-white">
          Test du générateur de contrats
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Cette page permet de tester la génération d'un contrat de sous-traitance professionnel 
          avec le nouveau template et le générateur Puppeteer.
        </p>

        <button
          onClick={testGeneration}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Génération en cours...' : 'Générer un contrat de test'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Erreur:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            <strong>Succès!</strong> Contrat généré avec succès.
            <div className="mt-2">
              <a 
                href={result} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Voir le contrat généré
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h3 className="text-lg font-medium mb-4 text-blue-900 dark:text-blue-100">
          Fonctionnalités du nouveau système
        </h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-blue-200">
          <li>Template HTML professionnel avec design moderne</li>
          <li>Logo de l'entreprise intégré</li>
          <li>Signature de l'entreprise pré-remplie</li>
          <li>En-tête et pied de page professionnels</li>
          <li>Génération PDF avec Puppeteer</li>
          <li>Page de signature électronique pour les sous-traitants</li>
          <li>Gestion complète du cycle de vie du contrat</li>
        </ul>
      </div>
    </div>
  )
}

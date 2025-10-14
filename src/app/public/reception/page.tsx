'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClipboardDocumentCheckIcon, 
  KeyIcon,
  ExclamationCircleIcon 
} from '@heroicons/react/24/outline'
import { Button, FormInput } from '@/components/ui'

export default function PublicReceptionPage() {
  const router = useRouter()
  const [codePIN, setCodePIN] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodePIN(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (codePIN.trim().length === 0) {
      setError('Veuillez entrer un code PIN')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/public/reception', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ codePIN }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Code PIN invalide')
      }

      // Rediriger vers la page des remarques avec le code PIN
      router.push(`/public/reception/${codePIN}`)
    } catch (error) {
      console.error('Erreur:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center">
      <div className="max-w-md mx-auto px-5 sm:px-4 py-10 sm:py-16 w-full">
        <div className="text-center mb-8">
          <ClipboardDocumentCheckIcon className="h-16 w-16 mx-auto text-red-500" />
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Accès aux remarques de réception
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 px-4">
            Entrez le code PIN qui vous a été fourni pour accéder aux remarques du chantier.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-5 sm:p-6">
            {error && (
              <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 sm:p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationCircleIcon className="h-5 w-5 text-red-400 dark:text-red-500" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="relative">
                <div className="flex items-center">
                  <div className="absolute left-3 top-8 text-gray-400">
                    <KeyIcon className="h-5 w-5" />
                  </div>
                  <FormInput
                    id="codePIN"
                    name="codePIN"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    label="Code PIN"
                    value={codePIN}
                    onChange={handleChange}
                    required
                    maxLength={6}
                    placeholder="Entrez le code PIN à 6 chiffres"
                    className="pl-10 text-lg py-2 sm:py-3"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 text-base"
                disabled={loading}
                isLoading={loading}
              >
                {loading ? 'Vérification...' : 'Accéder aux remarques'}
              </Button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 px-4">
          <p>Si vous n&apos;avez pas de code PIN, veuillez contacter le responsable du chantier.</p>
        </div>
      </div>
    </div>
  )
} 
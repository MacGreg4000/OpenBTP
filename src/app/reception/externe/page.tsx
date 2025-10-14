'use client'

import React, { Suspense, useEffect } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { useRouter, useSearchParams } from 'next/navigation'

// Composant client qui utilise useSearchParams
const ReceptionRedirect = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pin = searchParams.get('pin')

  useEffect(() => {
    // Si un code PIN est fourni, rediriger vers la page publique avec le code PIN
    if (pin) {
      router.push(`/public/reception/${pin}`)
    } else {
      // Sinon, rediriger vers la page de saisie de code PIN
      router.push('/public/reception')
    }
  }, [pin, router])

  return null
}

// Fallback à afficher pendant le chargement
const LoadingFallback = () => (
  <div className="min-h-screen flex justify-center items-center">
    <ArrowPathIcon className="animate-spin h-10 w-10 text-red-500 mr-2" />
    <span>Redirection en cours...</span>
  </div>
)

export default function ExterneReceptionPage() {
  return (
    <div className="min-h-screen flex justify-center items-center">
      <Suspense fallback={<LoadingFallback />}>
        <ReceptionRedirect />
      </Suspense>
      <LoadingFallback />
    </div>
  )
} 
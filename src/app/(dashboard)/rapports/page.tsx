'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RapportsPage() {
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page des chantiers où les rapports sont accessibles
    router.push('/chantiers')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Redirection vers les chantiers...</p>
      </div>
    </div>
  )
}


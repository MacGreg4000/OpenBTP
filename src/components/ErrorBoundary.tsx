'use client'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error
  reset: () => void
}) {
  useEffect(() => {
    console.error('Erreur:', error)
  }, [error])

  return (
    <div className="p-8">
      <h2>Une erreur est survenue</h2>
      <button onClick={reset}>Réessayer</button>
    </div>
  )
} 
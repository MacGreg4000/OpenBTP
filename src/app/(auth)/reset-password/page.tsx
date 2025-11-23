'use client'
import { useEffect } from 'react'

export default function ResetPasswordPage() {
  // Rediriger immédiatement vers login - cette page ne doit jamais être accessible
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Redirection immédiate sans délai
      window.location.replace('/login')
    }
  }, [])
  
  // Afficher un message minimal pendant la redirection
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <p className="text-gray-600">Redirection vers la page de connexion...</p>
      </div>
    </div>
  )
}

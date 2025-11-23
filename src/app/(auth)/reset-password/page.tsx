'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { EnvelopeIcon } from '@heroicons/react/24/outline'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Rediriger automatiquement vers login si on arrive sur cette page par erreur
  useEffect(() => {
    console.log('⚠️ [ResetPassword] Page accédée, redirection immédiate vers /login')
    // Rediriger immédiatement vers login
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  }, [])
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    
    // Simuler un appel API pour la réinitialisation du mot de passe
    setTimeout(() => {
      setIsSubmitted(true)
      setLoading(false)
    }, 1000)
  }
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
  }
  
  const handleBack = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-900">
      {/* Section gauche avec dégradé */}
      <div className="hidden md:flex md:w-1/2 bg-blue-600 flex-col justify-center items-center p-12 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-blue-600 to-blue-800 opacity-90"></div>
        
        {/* Éléments de flou pour créer du volume */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-300 opacity-20 blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-blue-200 opacity-20 blur-3xl"></div>
        
        {/* Logo et texte */}
        <div className="relative z-10 text-center">
          <div className="mb-8 flex items-center justify-center">
            <svg 
              className="h-16 w-16 text-white" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-6 drop-shadow-md">OpenBTP</h1>
          <p className="text-xl text-white/90 max-w-md drop-shadow-sm">
            Plateforme complète de gestion pour le secteur du bâtiment et des travaux publics
          </p>
        </div>
      </div>

      {/* Section droite avec formulaire */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 md:w-1/2">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
              <svg 
                className="h-12 w-12 text-blue-600 dark:text-blue-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Réinitialisation du mot de passe
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Nous vous enverrons un lien pour réinitialiser votre mot de passe
            </p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Adresse email
                </label>
                <div className="relative mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={handleEmailChange}
                    className="appearance-none block w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white sm:text-sm"
                    placeholder="exemple@entreprise.com"
                  />
                </div>
              </div>
              
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  className="py-2.5 shadow-sm"
                >
                  <EnvelopeIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
                </Button>
              </div>
              
              <div className="text-center mt-4">
                <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Si un compte existe avec l&apos;adresse <span className="font-medium">{email}</span>, nous vous avons envoyé un lien de réinitialisation de mot de passe. Vérifiez votre boîte de réception et vos spams.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={handleBack}
                  className="py-2.5 shadow-sm"
                >
                  Retour à la connexion
                </Button>
              </div>
            </div>
          )}
          
          <div className="mt-6">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              &copy; {new Date().getFullYear()} OpenBTP. Tous droits réservés.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui'
import Link from 'next/link'
import { 
  EyeIcon, 
  EyeSlashIcon, 
  LockClosedIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

function LoginForm() {
  const searchParams = useSearchParams()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Récupérer le callbackUrl depuis les paramètres de l'URL
  const callbackUrl = searchParams?.get('callbackUrl') || '/dashboard'

  // Animation d'entrée
  useEffect(() => {
    setMounted(true)
    
    // Ne pas vérifier la session ici - le middleware gère déjà la redirection
    // Appeler getSession() peut créer une boucle infinie en cas d'erreur CLIENT_FETCH_ERROR
    // Si l'utilisateur est déjà connecté, le middleware le redirigera automatiquement
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      const response = await signIn('credentials', {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        redirect: false,
        callbackUrl: callbackUrl
      })

      console.log('Réponse de connexion:', response)

      if (response?.error) {
        console.log('Erreur de connexion:', response.error)
        setError('Identifiants invalides')
      } else if (response?.ok) {
        console.log('Connexion réussie, redirection vers:', callbackUrl)
        
        // Redirection immédiate sans animation vers le callbackUrl
        window.location.href = callbackUrl
        return // Arrêter l'exécution ici
      } else {
        console.log('Réponse inattendue:', response)
        setError('Une erreur est survenue lors de la connexion')
      }
    } catch (error) {
      console.error('Erreur de connexion:', error)
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Section gauche avec branding moderne */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        {/* Fond avec dégradé et motifs */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 via-transparent to-indigo-600/20"></div>
        
        {/* Motifs géométriques animés */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-400/20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-indigo-400/20 blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full bg-purple-400/10 blur-3xl animate-pulse delay-2000"></div>
        
        {/* Grille de construction en arrière-plan */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>

        {/* Contenu principal */}
        <div className="relative z-10 flex flex-col justify-center items-center p-16 text-center">
          {/* Logo avec animation */}
          <div className={`mb-8 transform transition-all duration-1000 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <BuildingOfficeIcon className="h-16 w-16 text-white mx-auto" />
            </div>
          </div>
          
          {/* Titre et description */}
          <div className={`transform transition-all duration-1000 delay-300 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-5xl font-bold text-white mb-6 drop-shadow-lg">
              Open<span className="text-blue-200">BTP</span>
            </h1>
            <p className="text-xl text-white/90 max-w-lg leading-relaxed drop-shadow-sm">
              La plateforme complète de gestion pour les professionnels du bâtiment et des travaux publics
            </p>
          </div>
          
          {/* Features avec icônes */}
          <div className={`mt-12 grid grid-cols-1 gap-4 transform transition-all duration-1000 delay-500 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {[
              'Gestion des chantiers et projets',
              'Suivi financier en temps réel',
              'Planification et calendrier',
              'Gestion documentaire'
            ].map((feature, index) => (
              <div key={index} className="flex items-center text-white/80 text-sm">
                <CheckCircleIcon className="h-5 w-5 mr-3 text-green-300" />
                {feature}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section droite avec formulaire moderne */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 lg:w-2/5">
        <div className="w-full max-w-md">
          {/* En-tête du formulaire */}
          <div className={`text-center mb-8 transform transition-all duration-1000 delay-200 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="mx-auto w-20 h-20 mb-6 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
              <LockClosedIcon className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Bienvenue !
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Connectez-vous à votre espace de travail
            </p>
          </div>

          {/* Formulaire */}
          <div className={`transform transition-all duration-1000 delay-400 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Message d'erreur amélioré */}
              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 animate-shake">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Champ email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200 hover:border-gray-400"
                    placeholder="votre.email@entreprise.com"
                  />
                </div>
              </div>
              
              {/* Champ mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200 hover:border-gray-400 pr-12"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={togglePasswordVisibility}
                  >
                    {showPassword ? 
                      <EyeSlashIcon className="h-5 w-5" /> : 
                      <EyeIcon className="h-5 w-5" />
                    }
                  </button>
                </div>
              </div>
              
              {/* Options et liens */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:border-gray-700 dark:bg-gray-800"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Se souvenir de moi
                  </label>
                </div>
                <div className="text-sm">
                  <Link href="/reset-password" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200">
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>
              
              {/* Bouton de connexion */}
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={loading}
                  className="py-3 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-semibold"
                >
                  <LockClosedIcon className="h-5 w-5 mr-2" />
                  {loading ? 'Connexion en cours...' : 'Se connecter'}
                </Button>
              </div>
            </form>
            
            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-500">
                &copy; {new Date().getFullYear()} OpenBTP. Tous droits réservés.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                Plateforme sécurisée pour professionnels
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
} 
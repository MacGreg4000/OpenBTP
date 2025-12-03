'use client'
import { signIn } from 'next-auth/react'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
    e.stopPropagation()
    
    console.log('🔐 Tentative de connexion...')
    setLoading(true)
    setError('')

    try {
      const formData = new FormData(e.currentTarget)
      const email = formData.get('email') as string
      const password = formData.get('password') as string

      // Validation côté client
      if (!email || !password) {
        console.error('❌ Champs manquants')
        setError('Veuillez remplir tous les champs')
        setLoading(false)
        return
      }

      console.log('📧 Email:', email ? `${email.substring(0, 3)}***` : 'vide')
      console.log('🔑 Mot de passe:', password ? '***' : 'vide')

      // Détecter si on est sur mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      console.log('📱 Appareil détecté:', isMobile ? 'Mobile' : 'Desktop')
      console.log('🌐 User Agent:', navigator.userAgent)
      console.log('🍪 Cookies disponibles:', document.cookie ? 'Oui' : 'Non')
      console.log('🔗 Callback URL:', callbackUrl)

      const response = await signIn('credentials', {
        email: email.trim(),
        password: password,
        redirect: false,
        callbackUrl: callbackUrl
      })

      console.log('📥 Réponse de connexion:', {
        ok: response?.ok,
        error: response?.error,
        status: response?.status,
        url: response?.url
      })

      if (response?.error) {
        console.error('❌ Erreur de connexion:', response.error)
        
        // Messages d'erreur plus détaillés
        let errorMessage = 'Identifiants invalides. Vérifiez votre email et mot de passe.'
        if (response.error === 'CredentialsSignin') {
          errorMessage = 'Email ou mot de passe incorrect.'
        } else if (response.error.includes('fetch')) {
          errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.'
        } else {
          errorMessage = `Erreur: ${response.error}`
        }
        
        setError(errorMessage)
        setLoading(false)
      } else if (response?.ok) {
        console.log('✅ Connexion réussie, redirection vers:', callbackUrl)
        console.log('🍪 Cookies après connexion:', document.cookie)
        
        // Attendre que le cookie soit bien défini
        const waitTime = isMobile ? 500 : 200
        await new Promise(resolve => setTimeout(resolve, waitTime))
        
        // Vérifier que la session est bien créée avant de rediriger
        let sessionValid = false
        let attempts = 0
        const maxAttempts = 5
        
        while (!sessionValid && attempts < maxAttempts) {
          try {
            const sessionCheck = await fetch('/api/auth/session', { 
              credentials: 'include',
              cache: 'no-store',
              headers: {
                'Cache-Control': 'no-cache'
              }
            })
            
            if (sessionCheck.ok) {
              const sessionData = await sessionCheck.json()
              console.log(`✅ Tentative ${attempts + 1}: Session vérifiée:`, sessionData?.user ? 'Utilisateur connecté' : 'Pas de session')
              
              if (sessionData?.user?.id && sessionData?.user?.email) {
                sessionValid = true
                console.log('✅ Session valide avec ID et email')
                break
              } else {
                console.warn(`⚠️ Tentative ${attempts + 1}: Session incomplète, attente...`)
                await new Promise(resolve => setTimeout(resolve, 200))
                attempts++
              }
            } else {
              console.warn(`⚠️ Tentative ${attempts + 1}: Session check échoué (${sessionCheck.status}), attente...`)
              await new Promise(resolve => setTimeout(resolve, 200))
              attempts++
            }
          } catch (err) {
            console.warn(`⚠️ Tentative ${attempts + 1}: Erreur lors de la vérification de session:`, err)
            await new Promise(resolve => setTimeout(resolve, 200))
            attempts++
          }
        }
        
        if (!sessionValid) {
          console.error('❌ Impossible de valider la session après plusieurs tentatives')
          setError('Erreur lors de la création de la session. Veuillez réessayer.')
          setLoading(false)
          return
        }
        
        // Vérifier une dernière fois les cookies avant redirection
        console.log('🍪 Cookies finaux avant redirection:', document.cookie)
        
        // Redirection avec un petit délai supplémentaire pour s'assurer que tout est prêt
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Redirection vers le callbackUrl
        console.log('🚀 Redirection vers:', callbackUrl)
        window.location.href = callbackUrl
        return // Arrêter l'exécution ici
      } else {
        console.error('⚠️ Réponse inattendue:', response)
        setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.')
        setLoading(false)
      }
    } catch (error) {
      console.error('❌ Erreur de connexion (catch):', error)
      setError('Une erreur est survenue. Vérifiez votre connexion internet et réessayez.')
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
            <form 
              className="space-y-6" 
              onSubmit={handleSubmit}
              noValidate
              autoComplete="on"
            >
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

              {/* Message de débogage (visible uniquement en développement) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800 text-xs">
                  <p className="text-blue-700 dark:text-blue-400 mb-2">
                    💡 Mode débogage: Vérifiez la console pour les logs de connexion
                  </p>
                  <p className="text-blue-600 dark:text-blue-500 text-xs">
                    📱 Si problème sur mobile: Vérifiez les cookies, le réseau, et les logs dans la console
                  </p>
                </div>
              )}

              {/* Message d'aide pour mobile */}
              {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-800 text-xs">
                  <p className="text-amber-700 dark:text-amber-400 font-medium mb-1">
                    📱 Mode mobile détecté
                  </p>
                  <p className="text-amber-600 dark:text-amber-500 text-xs">
                    Si la connexion échoue, vérifiez que les cookies sont activés et que JavaScript est activé dans votre navigateur.
                  </p>
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    inputMode="email"
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200 hover:border-gray-400"
                    placeholder="votre.email@entreprise.com"
                    onKeyDown={(e) => {
                      // Permettre la soumission avec Enter
                      if (e.key === 'Enter') {
                        const form = e.currentTarget.closest('form')
                        if (form) {
                          const passwordInput = form.querySelector('input[name="password"]') as HTMLInputElement
                          if (passwordInput && passwordInput.value) {
                            form.requestSubmit()
                          } else {
                            passwordInput?.focus()
                          }
                        }
                      }
                    }}
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all duration-200 hover:border-gray-400 pr-12"
                    placeholder="••••••••••••"
                    onKeyDown={(e) => {
                      // Soumettre le formulaire avec Enter
                      if (e.key === 'Enter') {
                        const form = e.currentTarget.closest('form')
                        if (form) {
                          form.requestSubmit()
                        }
                      }
                    }}
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
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 shadow-lg hover:shadow-xl transition-all duration-200 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white flex items-center justify-center"
                  onClick={(e) => {
                    // S'assurer que le formulaire se soumet même sur mobile
                    const form = e.currentTarget.closest('form')
                    if (form) {
                      form.requestSubmit()
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Connexion en cours...
                    </>
                  ) : (
                    <>
                      <LockClosedIcon className="h-5 w-5 mr-2" />
                      Se connecter
                    </>
                  )}
                </button>
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
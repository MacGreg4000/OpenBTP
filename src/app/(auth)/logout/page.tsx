'use client'

import { signOut } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { 
  ArrowRightOnRectangleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function LogoutPage() {
  const [status, setStatus] = useState('Déconnexion en cours...')
  const [step, setStep] = useState(1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    const performLogout = async () => {
      try {
        setStatus('Nettoyage des données de session...')
        setStep(1)
        await new Promise(resolve => setTimeout(resolve, 800))
        
        // Supprimer tous les cookies NextAuth
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos) : c
          if (name.trim().includes('next-auth') || name.trim().includes('__Secure-next-auth')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          }
        })

        // Supprimer les éléments du localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.includes('next-auth') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })

        // Supprimer les éléments du sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.includes('next-auth') || key.includes('auth')) {
            sessionStorage.removeItem(key)
          }
        })

        setStatus('Fermeture de la session sécurisée...')
        setStep(2)
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Déconnexion NextAuth
        await signOut({ 
          redirect: false,
          callbackUrl: '/login'
        })

        setStatus('Déconnexion réussie !')
        setStep(3)
        await new Promise(resolve => setTimeout(resolve, 1200))
        
        // Forcer un rechargement complet vers la bonne URL
        const loginUrl = `${window.location.protocol}//${window.location.host}/login`
        window.location.href = loginUrl
        
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error)
        setStatus('Erreur - redirection forcée...')
        setStep(4)
        setTimeout(() => {
          const loginUrl = `${window.location.protocol}//${window.location.host}/login`
          window.location.href = loginUrl
        }, 2000)
      }
    }

    performLogout()
  }, [])

  if (!mounted) {
    return null
  }

  const getStepIcon = () => {
    switch (step) {
      case 1:
      case 2:
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
        )
      case 3:
        return (
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircleIcon className="h-10 w-10 text-green-600" />
          </div>
        )
      case 4:
        return (
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="h-10 w-10 text-red-600" />
          </div>
        )
      default:
        return null
    }
  }

  const getStepColor = () => {
    switch (step) {
      case 1:
      case 2:
        return 'text-blue-600'
      case 3:
        return 'text-green-600'
      case 4:
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Motifs d'arrière-plan */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-indigo-200/20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Container principal */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/20 p-8">
          {/* Icône principale */}
          <div className="text-center mb-6">
            <div className="mb-6">
              {getStepIcon()}
            </div>
            
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-2xl p-4 mb-6">
              <ArrowRightOnRectangleIcon className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Déconnexion en cours
            </h1>
            
            <p className={`text-lg font-medium transition-colors duration-500 ${getStepColor()}`}>
              {status}
            </p>
          </div>

          {/* Barre de progression */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className={`h-2 rounded-full transition-all duration-1000 ${
                step === 3 ? 'bg-green-500' : step === 4 ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ 
                width: `${Math.min(step * 33.33, 100)}%` 
              }}
            />
          </div>

          {/* Étapes */}
          <div className="space-y-3 text-sm">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-3 ${step >= 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              Nettoyage des données de session
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-3 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
              Fermeture de la session sécurisée
            </div>
            <div className={`flex items-center ${step >= 3 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              <div className={`w-2 h-2 rounded-full mr-3 ${step >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              Redirection vers la page de connexion
            </div>
          </div>

          {/* Message de sécurité */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
              🔒 Vos données sont en sécurité. Toutes les sessions actives ont été fermées.
            </p>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              OpenBTP - Plateforme sécurisée
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 
'use client'
import { useState, useEffect, use } from 'react';
import { ChantierHeader } from '@/components/ChantierHeader'
import { useSession } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'

export default function ChantierLayout(
  props: {
    children: React.ReactNode
    params: Promise<{ chantierId: string }>
  }
) {
  const resolvedParams = use(props.params);
  const chantierId = resolvedParams.chantierId;

  const {
    children
  } = props;

  const { status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  
  // Ne pas appliquer le layout du chantier pour la page fullscreen
  const isFullscreenPage = pathname?.includes('/fiches-techniques/fullscreen')
  const [chantier, setChantier] = useState<{ nomChantier?: string; etatChantier?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (!chantierId) return;

    const fetchChantier = async () => {
      try {
        const res = await fetch(`/api/chantiers/${chantierId}`)
        if (!res.ok) {
          throw new Error('Erreur lors de la récupération du chantier')
        }
        const data = await res.json()
        setChantier(data)
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Erreur lors de la récupération du chantier')
        setLoading(false)
      }
    }

    fetchChantier()
  }, [chantierId, status, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-red-500 text-xl">{error}</div>
      </div>
    )
  }

  if (!chantier) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-700 dark:text-gray-300 text-xl">Chantier non trouvé</div>
      </div>
    )
  }

  // Si c'est la page fullscreen, retourner les children directement sans header
  if (isFullscreenPage) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-visible" suppressHydrationWarning>
      {/* ChantierHeader avec position sticky - toujours visible et limité à la largeur du container */}
      <div className="sticky top-16 z-50 bg-gray-50 dark:bg-gray-900 overflow-visible shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <ChantierHeader 
            chantierId={chantierId || ""}
            chantier={{
              nomChantier: chantier.nomChantier,
              etatChantier: chantier.etatChantier
            }} 
          />
        </div>
      </div>
      
      {/* Contenu de la page */}
      <div className="pt-4">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
    </div>
  )
} 
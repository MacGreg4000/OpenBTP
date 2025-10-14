'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'

interface PageProps {
  params: Promise<{
    chantierId: string
    soustraitantId: string
    etatId: string
  }>
}

export default function EtatAvancementSoustraitantPage(props: PageProps) {
  const params = use(props.params);
  const router = useRouter()

  useEffect(() => {
    // Rediriger vers la page nouveau avec l'ID en paramètre
    router.replace(`/chantiers/${params.chantierId}/etats/soustraitants/${params.soustraitantId}/etat/nouveau?etatId=${params.etatId}`)
  }, [params, router])

  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
}

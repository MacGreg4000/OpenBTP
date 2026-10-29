'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import RapportVisiteEditeur from '@/components/rapports/RapportVisiteEditeur'

export default function MobileNouveauRapportPage() {
  const router = useRouter()
  const { selectedChantier } = useSelectedChantier()

  useEffect(() => {
    if (!selectedChantier) router.push('/mobile')
  }, [selectedChantier, router])

  if (!selectedChantier) return null

  return (
    <RapportVisiteEditeur
      chantierId={selectedChantier.chantierId}
      nomChantier={selectedChantier.nomChantier}
      retourHref="/mobile/dashboard"
      apresEnregistrement="/mobile/documents"
    />
  )
}

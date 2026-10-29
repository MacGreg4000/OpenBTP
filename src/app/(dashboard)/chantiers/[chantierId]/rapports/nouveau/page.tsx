'use client'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import RapportVisiteEditeur from '@/components/rapports/RapportVisiteEditeur'

// Création / modification d'un rapport de visite.
// ?rapport=<id> : rapport enregistré ; ?edit=<documentId> : ancien rapport (PDF + métadonnées).
export default function NouveauRapportPage(props: { params: Promise<{ chantierId: string }> }) {
  const { chantierId } = use(props.params)
  const searchParams = useSearchParams()
  const rapportId = searchParams.get('rapport') || undefined
  const ancienDocumentId = rapportId ? undefined : searchParams.get('edit') || undefined

  return (
    <RapportVisiteEditeur
      key={rapportId ?? ancienDocumentId ?? 'nouveau'}
      chantierId={chantierId}
      rapportId={rapportId}
      ancienDocumentId={ancienDocumentId}
      retourHref={`/chantiers/${chantierId}/rapports`}
      apresEnregistrement={`/chantiers/${chantierId}/rapports?refresh=${Date.now()}`}
    />
  )
}

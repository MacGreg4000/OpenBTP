'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { loadProjectFromServer } from '@/lib/metres-plan/projectStorage'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'

const MetrePlanEditor = dynamic(
  () => import('@/components/metres-plan/MetrePlanEditor'),
  { ssr: false }
)

interface MetrePlanMeta {
  id: string
  nom: string
  chantierId?: string | null
  chantier?: {
    chantierId: string
    nomChantier: string
  } | null
}

export default function MetrePlanEditorPage() {
  const params = useParams()
  const id = params?.id as string
  const [meta, setMeta] = useState<MetrePlanMeta | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadProject = useProjectStore((s) => s.loadProject)
  const setPdfBytes = usePdfStore((s) => s.setPdfBytes)

  useEffect(() => {
    if (!id) return

    const init = async () => {
      try {
        // 1. Charger les métadonnées du métré
        const metaRes = await fetch(`/api/metres-plan/${id}`)
        if (!metaRes.ok) throw new Error(`Métré introuvable (${metaRes.status})`)
        const metaData: MetrePlanMeta = await metaRes.json()
        setMeta(metaData)

        // 2. Essayer de charger le fichier .mplan depuis le serveur
        const result = await loadProjectFromServer(id)
        if (result) {
          loadProject(result.project)
          if (result.pdfBytes) {
            setPdfBytes(result.pdfBytes)
          }
        }

        setReady(true)
      } catch (err) {
        console.error('Erreur init éditeur:', err)
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement')
      }
    }

    init()
  }, [id, loadProject, setPdfBytes])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-400 text-lg font-medium mb-3">{error}</p>
          <Link href="/metres-plan" className="text-blue-400 hover:underline text-sm">
            Retour à la liste
          </Link>
        </div>
      </div>
    )
  }

  if (!ready || !meta) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Chargement du métré...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <MetrePlanEditor
        metrePlanId={id}
        chantierId={meta.chantier?.chantierId ?? meta.chantierId ?? undefined}
        chantierNom={meta.chantier?.nomChantier ?? undefined}
      />
    </div>
  )
}

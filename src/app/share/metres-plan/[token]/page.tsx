'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { exportExcel } from '@/lib/metres-plan/exportExcel'
import type { Project } from '@/types/metres-plan'
import JSZip from 'jszip'

interface MetrePlanShare {
  id: string
  nom: string
  createdAt: string
  mplanUrl: string
  pdfUrl: string | null
  fileUrl: string
  chantier?: {
    chantierId: string
    nomChantier: string
  } | null
}

export default function MetrePlanSharePage() {
  const params = useParams()
  const token = params?.token as string

  const [data, setData] = useState<MetrePlanShare | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch(`/api/metres-plan/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `Erreur ${res.status}`)
        }
        return res.json() as Promise<MetrePlanShare>
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erreur inconnue'))
      .finally(() => setLoading(false))
  }, [token])

  const handleDownloadExcel = async () => {
    if (!data) return
    setExporting(true)
    try {
      // Charger le fichier .mplan depuis fileUrl
      const res = await fetch(data.fileUrl)
      if (!res.ok) throw new Error(`Impossible de charger le fichier (${res.status})`)
      const arrayBuf = await res.arrayBuffer()
      const uint8 = new Uint8Array(arrayBuf)

      let project: Project | null = null

      // ZIP (.mplan) ou JSON direct
      if (uint8[0] === 0x50 && uint8[1] === 0x4B) {
        const zip = await JSZip.loadAsync(arrayBuf)
        const projectEntry = zip.file('project.json')
        if (!projectEntry) throw new Error('project.json manquant dans le fichier .mplan')
        const projectJson = await projectEntry.async('string')
        const { version: _, ...p } = JSON.parse(projectJson)
        project = p as Project
      } else {
        const text = new TextDecoder().decode(uint8)
        const { version: _, ...p } = JSON.parse(text)
        project = p as Project
      }

      if (!project) throw new Error('Impossible de lire le projet')
      await exportExcel(project)
    } catch (err) {
      console.error('Export Excel:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'export Excel')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Chargement du métré partagé...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h1>
          <p className="text-gray-500 text-sm">{error ?? 'Ce lien de partage n\'est plus valide.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide">MétréPlan · OpenBTP</p>
            <p className="text-xs text-gray-400">Document partagé en lecture seule</p>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Titre du projet */}
          <div className="p-6 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900">{data.nom}</h1>
            {data.chantier && (
              <p className="text-sm text-gray-500 mt-1">
                Chantier : <span className="font-medium text-gray-700">{data.chantier.nomChantier}</span>
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Créé le {new Date(data.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>

          {/* Avertissement lecture seule */}
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-amber-700">
              Ce document est partagé en lecture seule. Vous pouvez télécharger les données au format Excel.
            </p>
          </div>

          {/* Actions */}
          <div className="p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Téléchargements disponibles</h2>

            <button
              onClick={handleDownloadExcel}
              disabled={exporting}
              className="w-full flex items-center gap-3 px-4 py-3 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl border border-emerald-200 hover:border-emerald-300 transition-colors group"
            >
              <div className="w-9 h-9 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 20h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v11a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-emerald-800">
                  {exporting ? 'Génération en cours...' : 'Télécharger Excel'}
                </p>
                <p className="text-xs text-emerald-600">Bordereau, résumé et détail des mesures</p>
              </div>
              {!exporting && (
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          Partagé via <span className="font-medium text-gray-500">OpenBTP · MétréPlan</span>
        </p>
      </main>
    </div>
  )
}

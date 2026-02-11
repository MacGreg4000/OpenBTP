'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { usePortalI18n } from '../../i18n'
import Image from 'next/image'

interface TacheHistorique {
  id: string
  titre: string
  description: string | null
  dateExecution: string
  dateValidation: string | null
  statut: string
  commentaire: string | null
  photos: { id: string; url: string; type: string }[]
}

export default function MagasinierHistoriquePage() {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [me, setMe] = useState<{ magasinier: { id: string; nom: string } } | null>(null)
  const [taches, setTaches] = useState<TacheHistorique[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await fetch('/api/public/portail/magasinier/me', { credentials: 'include' })
        if (!meRes.ok) {
          router.replace('/public/portail/magasinier')
          return
        }
        setMe(await meRes.json())

        const tRes = await fetch('/api/public/portail/magasinier/taches?vue=historique', {
          credentials: 'include'
        })
        if (tRes.ok) {
          const data = await tRes.json()
          setTaches(Array.isArray(data) ? data : [])
        }
      } catch {
        router.replace('/public/portail/magasinier')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const handleLogout = () => {
    fetch('/api/public/portail/logout', { method: 'POST' })
    router.replace('/public/portail/magasinier')
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100">
      <header className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg">
        <div className="p-4 flex items-center justify-between">
          <button onClick={handleLogout} className="inline-flex items-center text-white/90 hover:text-white">
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            {t('logout')}
          </button>
          <div className="font-semibold">{me?.magasinier?.nom || ''}</div>
          <div className="w-16" />
        </div>
      </header>

      <nav className="flex border-b border-amber-200/50 bg-white/80">
        <button
          onClick={() => router.push('/public/portail/magasinier/taches')}
          className="flex-1 py-3 font-medium text-gray-600 hover:text-amber-600"
        >
          <ClipboardDocumentListIcon className="h-5 w-5 inline mr-2" />
          Mes tâches
        </button>
        <button
          onClick={() => router.push('/public/portail/magasinier/historique')}
          className="flex-1 py-3 font-medium text-amber-700 border-b-2 border-amber-600"
        >
          <ClockIcon className="h-5 w-5 inline mr-2" />
          Historique
        </button>
      </nav>

      <div className="p-4 max-w-lg mx-auto">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Tâches validées</h2>
        <div className="space-y-3">
          {taches.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl p-4 shadow border border-amber-100"
            >
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{t.titre}</h3>
                  {t.description && (
                    <p className="text-sm text-gray-600 mt-0.5">{t.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Exécutée le {formatDate(t.dateExecution)}
                    {t.dateValidation && ` • Validée le ${formatDate(t.dateValidation)}`}
                  </p>
                  {t.commentaire && (
                    <p className="text-sm text-gray-600 mt-2 italic">&quot;{t.commentaire}&quot;</p>
                  )}
                  {t.photos?.length > 0 && (
                    <div className="flex gap-1 mt-2 overflow-x-auto">
                      {t.photos.map((p) => (
                        <div key={p.id} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                          <Image src={p.url} alt="" fill className="object-cover" sizes="64px" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {taches.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-amber-100">
              Aucune tâche validée
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

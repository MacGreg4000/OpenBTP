'use client'

// Registre de toutes les déclarations de sous-traitance envoyées aux clients
// (preuve en cas de contrôle). Filtre par sous-traitant.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import RegistreDeclarations from '@/components/chantier/RegistreDeclarations'

export default function DeclarationsSousTraitancePage() {
  const [soustraitants, setSoustraitants] = useState<{ id: string; nom: string }[]>([])
  const [soustraitantId, setSoustraitantId] = useState('')

  useEffect(() => {
    fetch('/api/soustraitants')
      .then((r) => r.json())
      .then((d) => setSoustraitants(Array.isArray(d) ? d : []))
      .catch(() => setSoustraitants([]))
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Déclarations de sous-traitance"
        subtitle="Registre des déclarations envoyées aux clients"
        icon={EnvelopeIcon}
        badgeColor="from-blue-600 via-indigo-600 to-purple-700"
        gradientColor="from-blue-600/10 via-indigo-600/10 to-purple-700/10"
        leftAction={
          <Link
            href="/sous-traitants/documents"
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
            title="Retour aux documents des sous-traitants"
          >
            <ArrowLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </Link>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex flex-wrap items-center gap-3 text-sm">
          <label className="text-gray-600 dark:text-gray-300" htmlFor="filtre-st">Sous-traitant</label>
          <select
            id="filtre-st"
            value={soustraitantId}
            onChange={(e) => setSoustraitantId(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Tous</option>
            {soustraitants.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
          <span className="text-gray-500 dark:text-gray-400">Les déclarations s’envoient depuis la fiche de chaque chantier.</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <RegistreDeclarations soustraitantId={soustraitantId || undefined} sansCarte />
        </div>
      </div>
    </div>
  )
}

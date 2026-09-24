'use client'

// Lien public de la page Checkinatwork (chantiers + numéros d'enregistrement),
// à partager aux sous-traitants. Régénérer invalide immédiatement l'ancien.

import { useEffect, useState } from 'react'

export default function CheckinLienSettings() {
  const [url, setUrl] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/settings/checkin-token')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUrl(d?.url ?? null))
      .finally(() => setChargement(false))
  }, [])

  const generer = async () => {
    if (url && !confirm("L'ancien lien cessera immédiatement de fonctionner pour tous les sous-traitants. Continuer ?")) {
      return
    }
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/settings/checkin-token', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      setUrl(d.url)
      setMessage('Nouveau lien généré.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setEnCours(false)
    }
  }

  const copier = async () => {
    if (!url) return
    await navigator.clipboard.writeText(url).catch(() => {})
    setMessage('Lien copié.')
  }

  return (
    <div className="space-y-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Page Checkinatwork (sous-traitants)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Liste publique des chantiers en cours, à venir et en préparation, avec leur numéro Checkinatwork
          (champ « Numéro d&apos;identification » de la fiche chantier). Sans connexion : ne partager qu&apos;aux
          sous-traitants.
        </p>
      </div>

      {chargement ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : url ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="flex-1 min-w-0 break-all rounded bg-gray-100 dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-800 dark:text-gray-100">
            {url}
          </code>
          <button type="button" onClick={copier} className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200">
            Copier
          </button>
          <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200">
            Ouvrir
          </a>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucun lien généré pour l&apos;instant.</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generer}
          disabled={enCours}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {url ? 'Régénérer le lien' : 'Générer le lien'}
        </button>
        {message && <span className="text-sm text-gray-600 dark:text-gray-300">{message}</span>}
      </div>
    </div>
  )
}

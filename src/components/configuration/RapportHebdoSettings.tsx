'use client'

// Rapport d'activité hebdomadaire : envoi à la demande (en plus du vendredi midi).

import { useState } from 'react'

export default function RapportHebdoSettings() {
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  const envoyer = async () => {
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/reports/monthly-etats', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      setMessage({ ok: !!d.success, texte: d.message })
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="space-y-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rapport d&apos;activité hebdomadaire</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chaque vendredi à midi, aux administrateurs : états d&apos;avancement de la période en clôture (mois précédent
          jusqu&apos;au 20, mois en cours ensuite), états à facturer, chantiers en cours et à venir, devis, et ce qui reste à
          traiter (métrés, SAV, contrats, numéros Checkinatwork).
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={envoyer}
          disabled={enCours}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {enCours ? 'Envoi…' : 'Recevoir le rapport maintenant'}
        </button>
        {message && <span className={`text-sm ${message.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>{message.texte}</span>}
      </div>
    </div>
  )
}

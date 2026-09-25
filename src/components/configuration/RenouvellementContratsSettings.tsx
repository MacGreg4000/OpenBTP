'use client'

// Renouvellement automatique des contrats-cadres : option, contrats à
// échéance et lancement manuel.

import { useCallback, useEffect, useState } from 'react'

interface Echeance {
  soustraitantId: string
  soustraitant: string
  dateFin: string
  joursRestants: number
  statut: 'A_ENVOYER' | 'RELANCE' | 'EN_ATTENTE' | 'BLOQUE'
  dernierEnvoi?: string
  manquants?: string[]
}

const LIBELLE: Record<Echeance['statut'], string> = {
  A_ENVOYER: 'Sera envoyé',
  RELANCE: 'Relance prévue',
  EN_ATTENTE: 'Envoyé, en attente de signature',
  BLOQUE: 'Bloqué — représentant incomplet',
}

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-BE', { timeZone: 'Europe/Brussels' })

export default function RenouvellementContratsSettings() {
  const [actif, setActif] = useState<boolean | null>(null)
  const [echeances, setEcheances] = useState<Echeance[]>([])
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  const charger = useCallback(async () => {
    const r = await fetch('/api/settings/renouvellement-contrats')
    if (!r.ok) return
    const d = await r.json()
    setActif(d.actif)
    setEcheances(d.echeances)
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const basculer = async () => {
    const nouveau = !actif
    const aEnvoyer = echeances.filter((e) => e.statut === 'A_ENVOYER' || e.statut === 'RELANCE').length
    if (nouveau && !confirm(
      `Activer le renouvellement automatique ? Chaque matin ouvrable à 8h00, les contrats expirant dans les 30 jours seront ` +
      `renvoyés en signature aux sous-traitants${aEnvoyer ? ` (${aEnvoyer} dès demain matin)` : ''}.`
    )) return
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/settings/renouvellement-contrats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: nouveau }),
      })
      if (!r.ok) throw new Error((await r.json())?.error || 'Erreur')
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnCours(false)
    }
  }

  const lancer = async () => {
    const aEnvoyer = echeances.filter((e) => e.statut === 'A_ENVOYER' || e.statut === 'RELANCE').length
    if (!confirm(`Envoyer maintenant ${aEnvoyer} contrat(s) en signature ?`)) return
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/settings/renouvellement-contrats', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      const parties = [`${d.envoyes.length} envoyé(s)`]
      if (d.echecs.length) parties.push(`${d.echecs.length} échec(s)`)
      if (d.bloques.length) parties.push(`${d.bloques.length} bloqué(s)`)
      setMessage({ ok: d.echecs.length === 0, texte: parties.join(', ') + '.' })
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnCours(false)
    }
  }

  if (actif === null) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    )
  }

  const aEnvoyer = echeances.filter((e) => e.statut === 'A_ENVOYER' || e.statut === 'RELANCE').length

  return (
    <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Renouvellement automatique des contrats</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chaque matin ouvrable à 8h00 : tout contrat-cadre signé qui expire dans les 30 jours (ou déjà expiré) d&apos;un
          sous-traitant actif est régénéré avec le template actif et envoyé en signature au représentant. Sans signature,
          relance tous les 7 jours. Récapitulatif envoyé à l&apos;adresse d&apos;alerte.
        </p>
      </div>

      <label className="flex items-center gap-3">
        <input type="checkbox" checked={actif} onChange={basculer} disabled={enCours} className="h-5 w-5" />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {actif ? 'Activé' : 'Désactivé'}
        </span>
      </label>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Contrats à échéance ({echeances.length})
        </h3>
        {echeances.length === 0 ? (
          <p className="mt-1 text-sm text-gray-500">Aucun contrat signé n&apos;expire dans les 30 jours.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {echeances.map((e) => (
              <li key={e.soustraitantId}>
                {e.soustraitant}{' '}
                <span className="text-gray-500">
                  — {e.joursRestants < 0 ? `expiré depuis ${-e.joursRestants} j` : `fin le ${dateFr(e.dateFin)}`}
                </span>{' '}
                <span className={e.statut === 'BLOQUE' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400'}>
                  · {LIBELLE[e.statut]}
                  {e.dernierEnvoi && ` (envoyé le ${dateFr(e.dernierEnvoi)})`}
                  {e.manquants?.length ? ` : ${e.manquants.join(', ')}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={lancer}
          disabled={enCours || aEnvoyer === 0}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          Envoyer maintenant ({aEnvoyer})
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>{message.texte}</span>
        )}
      </div>
    </div>
  )
}

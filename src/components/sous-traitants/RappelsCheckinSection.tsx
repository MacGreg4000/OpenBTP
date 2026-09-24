'use client'

// Fiche sous-traitant — historique des rappels Checkinatwork : date, heure,
// destinataire, statut ; email exact envoyé ; export PDF « Attestation de
// rappels » par période ; envoi manuel pour ce seul sous-traitant.

import { useCallback, useEffect, useState } from 'react'
import { BellAlertIcon, DocumentArrowDownIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Rappel {
  id: number
  dateRappel: string
  createdAt: string
  declencheur: string
  modeTest: boolean
  destinataire: string
  destinataireReel: string | null
  contratReference: string | null
  statut: string
  erreur: string | null
}

interface Detail {
  objet: string
  contenuHtml: string
  destinataire: string
  messageId: string | null
  createdAt: string
  chantiers: { numero: string | null; client: string; chantier: string; adresse: string }[]
}

const dateFr = (iso: string) => iso.split('-').reverse().join('/')
const heure = (d: string) =>
  new Date(d).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })

export default function RappelsCheckinSection({ soustraitantId }: { soustraitantId: string }) {
  const [rappels, setRappels] = useState<Rappel[] | null>(null)
  const [afficherTests, setAfficherTests] = useState(false)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [du, setDu] = useState('')
  const [au, setAu] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const charger = useCallback(async () => {
    const r = await fetch(`/api/sous-traitants/${soustraitantId}/rappels-checkin`)
    const d = r.ok ? await r.json() : { rappels: [] }
    setRappels(d.rappels)
  }, [soustraitantId])

  useEffect(() => {
    charger()
  }, [charger])

  const voir = async (id: number) => {
    const r = await fetch(`/api/rappels-checkin/${id}`)
    if (r.ok) setDetail(await r.json())
  }

  const envoyer = async () => {
    if (!confirm('Envoyer maintenant le rappel à ce sous-traitant (selon le mode des réglages) ?')) return
    setEnvoi(true)
    setMessage(null)
    try {
      const r = await fetch('/api/rappels-checkin/envoyer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soustraitantId }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      if (d.envoyes.length) setMessage({ ok: true, texte: `Rappel envoyé à ${d.envoyes[0].destinataire}.` })
      else if (d.echecs.length) setMessage({ ok: false, texte: `Échec : ${d.echecs[0].erreur}` })
      else if (d.ignores.length) setMessage({ ok: false, texte: d.ignores[0].raison })
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnvoi(false)
    }
  }

  const visibles = (rappels || []).filter((r) => afficherTests || !r.modeTest)
  const nbTests = (rappels || []).filter((r) => r.modeTest).length
  const lienAttestation = `/api/sous-traitants/${soustraitantId}/rappels-checkin/attestation?${new URLSearchParams({
    ...(du ? { du } : {}),
    ...(au ? { au } : {}),
  })}`
  const champ = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-xs text-gray-900 dark:text-white'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <BellAlertIcon className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">
              Rappels Checkinatwork
              {rappels && (
                <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal text-sm">
                  ({rappels.filter((r) => !r.modeTest && r.statut === 'ENVOYE').length} envoyé
                  {rappels.filter((r) => !r.modeTest && r.statut === 'ENVOYE').length > 1 ? 's' : ''})
                </span>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-gray-500">
              du <input type="date" value={du} onChange={(e) => setDu(e.target.value)} className={champ} />
            </label>
            <label className="text-xs text-gray-500">
              au <input type="date" value={au} onChange={(e) => setAu(e.target.value)} className={champ} />
            </label>
            <a
              href={lienAttestation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              title="Sans dates : du premier rappel à aujourd'hui"
            >
              <DocumentArrowDownIcon className="h-3.5 w-3.5" />
              Attestation PDF
            </a>
            <button
              type="button"
              onClick={envoyer}
              disabled={envoi}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {envoi ? 'Envoi…' : 'Envoyer maintenant'}
            </button>
          </div>
        </div>
        {message && (
          <p className={`mt-2 text-sm ${message.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>{message.texte}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        {rappels === null ? (
          <p className="p-6 text-sm text-gray-500">Chargement…</p>
        ) : visibles.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">Aucun rappel envoyé à ce sous-traitant.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/40 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Heure</th>
                <th className="px-4 py-2 text-left">Destinataire</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
              {visibles.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 whitespace-nowrap">{dateFr(r.dateRappel)}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{heure(r.createdAt)}</td>
                  <td className="px-4 py-2">
                    {r.destinataire}
                    {r.modeTest && (
                      <span className="ml-1 rounded bg-gray-200 dark:bg-gray-700 px-1 text-xs">TEST → {r.destinataireReel}</span>
                    )}
                    {r.declencheur === 'MANUEL' && <span className="ml-1 rounded bg-gray-200 dark:bg-gray-700 px-1 text-xs">manuel</span>}
                  </td>
                  <td className="px-4 py-2">
                    {r.statut === 'ENVOYE' ? (
                      <span className="text-green-700 dark:text-green-400">Envoyé</span>
                    ) : (
                      <span className="text-red-600" title={r.erreur || ''}>Échec</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button type="button" onClick={() => voir(r.id)} className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
                      <EyeIcon className="h-3.5 w-3.5" /> Voir l&apos;email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {nbTests > 0 && (
          <label className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500">
            <input type="checkbox" checked={afficherTests} onChange={(e) => setAfficherTests(e.target.checked)} />
            Afficher les {nbTests} envoi{nbTests > 1 ? 's' : ''} de test (jamais repris dans l&apos;attestation)
          </label>
        )}
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setDetail(null)}>
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white dark:bg-gray-800 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-700 px-5 py-3">
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-gray-900 dark:text-white">{detail.objet}</p>
                <p className="text-xs text-gray-500">
                  À {detail.destinataire} — {new Date(detail.createdAt).toLocaleString('fr-BE', { timeZone: 'Europe/Brussels' })}
                  {detail.messageId && <span className="block break-all">Message-ID : {detail.messageId}</span>}
                </p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fermer">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {/* sandbox vide : aucun script ni navigation depuis le contenu affiché */}
              <iframe srcDoc={detail.contenuHtml} sandbox="" title="Email envoyé" className="h-[50vh] w-full rounded border border-gray-200 bg-white" />
              <div>
                <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                  Chantiers communiqués ce jour-là ({detail.chantiers.length})
                </p>
                <ul className="space-y-0.5 text-xs text-gray-700 dark:text-gray-300">
                  {detail.chantiers.map((c, i) => (
                    <li key={i}>
                      <span className="font-mono">{c.numero || '—'}</span> · {c.chantier}
                      {c.client && ` (${c.client})`} · {c.adresse}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

// Registre des déclarations de sous-traitance envoyées : sur la fiche d'un
// chantier (chantierId) ou pour tous les chantiers (page Sous-traitants →
// Déclarations). Chaque envoi est conservé avec le mail exact et les pièces.

import { Fragment, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardDocumentListIcon, PaperClipIcon, EnvelopeIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface Entree {
  id: number
  chantierId: string
  chantierNom: string
  mode: string
  destinataire: string
  soustraitants: { id: string; nom: string; tva: string | null; personnes: string[] }[]
  pieces: { nomFichier: string; libelle: string; personne: string | null; taille: number; url: string }[]
  statut: string
  erreur: string | null
  envoyeParNom: string | null
  createdAt: string
}

const dateHeure = (iso: string) =>
  new Date(iso).toLocaleString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export default function RegistreDeclarations(props: {
  chantierId?: string
  soustraitantId?: string
  /** Change de valeur pour recharger (ex. après un envoi) */
  rafraichir?: number
  /** Masque l'en-tête de carte (page dédiée) */
  sansCarte?: boolean
}) {
  const { chantierId, soustraitantId, rafraichir, sansCarte } = props
  const [entrees, setEntrees] = useState<Entree[]>([])
  const [chargement, setChargement] = useState(true)
  const [ouverte, setOuverte] = useState<number | null>(null)

  const charger = useCallback(() => {
    const q = new URLSearchParams()
    if (chantierId) q.set('chantierId', chantierId)
    if (soustraitantId) q.set('soustraitantId', soustraitantId)
    setChargement(true)
    fetch(`/api/declarations-sous-traitance?${q}`)
      .then((r) => r.json())
      .then((d) => setEntrees(d.entrees || []))
      .catch(() => setEntrees([]))
      .finally(() => setChargement(false))
  }, [chantierId, soustraitantId])

  useEffect(() => {
    charger()
  }, [charger, rafraichir])

  const global = !chantierId

  const contenu = chargement ? (
    <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Chargement…</div>
  ) : entrees.length === 0 ? (
    <div className="p-6 text-sm text-gray-500 dark:text-gray-400">Aucune déclaration envoyée{global ? '' : ' pour ce chantier'}.</div>
  ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <tr>
            <th className="px-4 py-2 w-6" />
            <th className="px-4 py-2">Date</th>
            {global && <th className="px-4 py-2">Chantier</th>}
            <th className="px-4 py-2">Sous-traitants</th>
            <th className="px-4 py-2">Destinataire</th>
            <th className="px-4 py-2">Type</th>
            <th className="px-4 py-2">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {entrees.map((e) => (
            <Fragment key={e.id}>
              <tr
                className="hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer align-top"
                onClick={() => setOuverte(ouverte === e.id ? null : e.id)}
              >
                <td className="px-4 py-3 text-gray-400">
                  {ouverte === e.id ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-900 dark:text-gray-100">{dateHeure(e.createdAt)}</td>
                {global && (
                  <td className="px-4 py-3">
                    <Link
                      href={`/chantiers/${e.chantierId}`}
                      onClick={(ev) => ev.stopPropagation()}
                      className="text-sky-700 dark:text-sky-400 hover:underline"
                    >
                      {e.chantierNom}
                    </Link>
                  </td>
                )}
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{e.soustraitants.map((s) => s.nom).join(', ')}</td>
                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{e.destinataire}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {e.mode === 'DOCUMENTS' ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                      <PaperClipIcon className="h-3.5 w-3.5" /> {e.pieces.length} document{e.pieces.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      Simple demande
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {e.statut === 'ENVOYE' ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">Envoyée</span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" title={e.erreur || ''}>
                      Échec
                    </span>
                  )}
                </td>
              </tr>
              {ouverte === e.id && (
                <tr className="bg-gray-50/60 dark:bg-gray-900/30">
                  <td />
                  <td colSpan={global ? 6 : 5} className="px-4 py-3 space-y-3">
                    {e.erreur && <p className="text-xs text-red-600">Erreur : {e.erreur}</p>}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Personnes déclarées</p>
                        {e.soustraitants.map((s) => (
                          <p key={s.id} className="text-xs text-gray-700 dark:text-gray-300">
                            <strong>{s.nom}</strong> ({s.tva || 'TVA ?'}){s.personnes.length ? ` — ${s.personnes.join(', ')}` : ''}
                          </p>
                        ))}
                      </div>
                      {e.pieces.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Pièces jointes</p>
                          <ul className="space-y-0.5">
                            {e.pieces.map((p, i) => (
                              <li key={i} className="text-xs">
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-sky-700 dark:text-sky-400 hover:underline">
                                  {p.nomFichier}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {e.envoyeParNom && <span>Envoyée par {e.envoyeParNom}</span>}
                      <a
                        href={`/api/declarations-sous-traitance/${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400 hover:underline"
                      >
                        <EnvelopeIcon className="h-4 w-4" /> Voir le mail envoyé
                      </a>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )

  if (sansCarte) return contenu
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          <ClipboardDocumentListIcon className="h-5 w-5 mr-2 text-sky-500" />
          Déclarations de sous-traitance
        </h2>
        {entrees.length > 0 && <span className="text-sm text-gray-500 dark:text-gray-400">{entrees.length}</span>}
      </div>
      {contenu}
    </div>
  )
}

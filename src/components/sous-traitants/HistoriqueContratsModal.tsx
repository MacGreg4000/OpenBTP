'use client'

// Historique des contrats d'un sous-traitant.
//
// Ouverte depuis le tableau des sous-traitants — jusqu'ici, RIEN dans
// l'interface ne montrait qu'un sous-traitant pouvait avoir plusieurs
// contrats. Un contrat régénéré (même par erreur, même pour une simple copie)
// crée toujours un nouvel enregistrement séparé, sans jamais toucher au
// précédent (cf. genererContrat / generateContratSoustraitance) — un contrat
// signé pouvait donc rester invisible derrière un doublon jamais signé,
// pendant des mois dans un cas réel (Soares De Jesus Ilder, depuis juillet).
//
// Le bouton « Renouveler » appelle la même route que l'envoi initial
// (`envoyer-contrat`) : elle ne réutilise un contrat existant que s'il n'est
// PAS encore signé, donc sur un contrat actif déjà signé, elle génère
// naturellement un nouveau contrat aux dates actualisées et l'envoie.

import { useCallback, useEffect, useState } from 'react'
import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { SEUIL_RENOUVELLEMENT_JOURS, type StatutEcheance } from '@/lib/contrats/echeance'

interface ContratHistorique {
  id: string
  url: string
  estSigne: boolean
  dateGeneration: string
  dateSignature: string | null
  dateFin: string | null
  statutEcheance: StatutEcheance
}

interface Props {
  soustraitantId: string
  soustraitantNom: string
  open: boolean
  onClose: () => void
  /** Notifie le parent après un renouvellement réussi, pour rafraîchir la liste. */
  onRenouvele?: () => void
  notifier: (titre: string, message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

const LIBELLE_STATUT: Record<StatutEcheance, { texte: string; classe: string }> = {
  expire: { texte: 'Échéance dépassée', classe: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  proche: { texte: 'Échéance proche', classe: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  ok: { texte: 'Valide', classe: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  inconnu: { texte: 'Échéance inconnue', classe: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
}

export default function HistoriqueContratsModal({
  soustraitantId,
  soustraitantNom,
  open,
  onClose,
  onRenouvele,
  notifier,
}: Props) {
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [contrats, setContrats] = useState<ContratHistorique[]>([])
  const [renouvellement, setRenouvellement] = useState(false)

  const charger = useCallback(() => {
    setChargement(true)
    setErreur(null)
    fetch(`/api/sous-traitants/${soustraitantId}/contrats`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Chargement impossible'))))
      .then((data) => setContrats(data.contrats || []))
      .catch(() => setErreur('Impossible de charger l’historique des contrats.'))
      .finally(() => setChargement(false))
  }, [soustraitantId])

  useEffect(() => {
    if (open) charger()
  }, [open, charger])

  // Même règle que l'API de liste (sous-traitants/route.ts) : le contrat signé
  // le plus RÉCEMMENT SIGNÉ prime, pas simplement le premier signé rencontré
  // dans l'ordre de génération — sinon la modale pourrait mettre en avant un
  // contrat différent de celui affiché dans le tableau.
  const contratActif =
    [...contrats]
      .filter((c) => c.estSigne)
      .sort((a, b) => new Date(b.dateSignature ?? 0).getTime() - new Date(a.dateSignature ?? 0).getTime())[0]
    ?? contrats[0]
  const peutRenouveler = contrats.length > 0

  const renouveler = async () => {
    setRenouvellement(true)
    try {
      const res = await fetch(`/api/sous-traitants/${soustraitantId}/envoyer-contrat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Erreur lors du renouvellement')
      notifier('Contrat renouvelé', 'Un nouveau contrat a été généré et envoyé au sous-traitant.', 'success')
      charger()
      onRenouvele?.()
    } catch (e) {
      notifier('Erreur', e instanceof Error ? e.message : 'Erreur lors du renouvellement', 'error')
    } finally {
      setRenouvellement(false)
    }
  }

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-xl transition-all">
                <div className="flex items-start justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      Historique des contrats
                    </Dialog.Title>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{soustraitantNom}</p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer"
                    className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                  {chargement ? (
                    <div className="flex h-32 items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
                    </div>
                  ) : erreur ? (
                    <p className="py-8 text-center text-sm text-red-600 dark:text-red-400">{erreur}</p>
                  ) : contrats.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Aucun contrat généré pour ce sous-traitant.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contrats.map((c) => {
                        const estLeContratActif = c.id === contratActif?.id
                        const statut = LIBELLE_STATUT[c.statutEcheance]
                        return (
                          <div
                            key={c.id}
                            className={`rounded-lg border p-3 ${
                              estLeContratActif
                                ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10'
                                : 'border-gray-200 dark:border-gray-700'
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              {c.estSigne ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                                  <CheckCircleIcon className="h-3.5 w-3.5" /> Signé
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  <ClockIcon className="h-3.5 w-3.5" /> En attente de signature
                                </span>
                              )}
                              {c.estSigne && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statut.classe}`}>
                                  {c.statutEcheance !== 'ok' && <ExclamationTriangleIcon className="h-3.5 w-3.5" />}
                                  {statut.texte}
                                </span>
                              )}
                              {estLeContratActif && (
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                                  Contrat actif
                                </span>
                              )}
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                              >
                                <DocumentTextIcon className="h-3.5 w-3.5" /> Voir le PDF
                              </a>
                            </div>
                            <dl className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600 dark:text-gray-300">
                              <div>
                                <dt className="text-gray-400 dark:text-gray-500">Généré le</dt>
                                <dd>{formatDate(c.dateGeneration)}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400 dark:text-gray-500">Signé le</dt>
                                <dd>{formatDate(c.dateSignature)}</dd>
                              </div>
                              <div>
                                <dt className="text-gray-400 dark:text-gray-500">Fin de contrat</dt>
                                <dd>{formatDate(c.dateFin)}</dd>
                              </div>
                            </dl>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 px-5 py-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Renouveler génère un nouveau contrat (dates actualisées, échéance à {SEUIL_RENOUVELLEMENT_JOURS} jours)
                    et l’envoie par email au sous-traitant.
                  </p>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      onClick={renouveler}
                      disabled={renouvellement || !peutRenouveler}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <ArrowPathIcon className={`h-4 w-4 ${renouvellement ? 'animate-spin' : ''}`} />
                      {renouvellement ? 'Renouvellement…' : 'Renouveler'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

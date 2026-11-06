'use client'

// Fiche sous-traitant — volet repliable « Infos Checkinatwork » : pour chaque
// ouvrier actif, nom, numéro d'entreprise et numéro national (ou Limosa pour un
// travailleur détaché), avec un bouton copier pour l'encodage.

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckIcon, ChevronDownIcon, ClipboardDocumentIcon, IdentificationIcon } from '@heroicons/react/24/outline'
import { formaterNumeroEntreprise, formaterNumeroNational } from '@/lib/soustraitants/identifiants'

interface LigneOuvrier {
  id: string
  nom: string
  prenom: string
  numeroNational: string | null
  numeroEntreprise: string | null
  entreprisePropre: boolean
  limosa: { documentId: string; numero: string | null; dateFin: string | null; expire: boolean } | null
}

const dateFr = (iso: string) => iso.split('-').reverse().join('/')

function Copier({ valeur }: { valeur: string }) {
  const [ok, setOk] = useState(false)
  const copier = async () => {
    try {
      await navigator.clipboard.writeText(valeur)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : rien à faire
    }
  }
  return (
    <button
      type="button"
      onClick={copier}
      className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
      title="Copier"
      aria-label={`Copier ${valeur}`}
    >
      {ok ? <CheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardDocumentIcon className="h-4 w-4" />}
    </button>
  )
}

function Valeur({ texte, copie, lien }: { texte: string | null; copie?: string | null; lien: string }) {
  if (!texte) {
    return (
      <Link href={lien} className="text-orange-600 dark:text-orange-400 hover:underline text-xs font-medium">
        à compléter
      </Link>
    )
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-mono text-sm">{texte}</span>
      <Copier valeur={copie || texte} />
    </span>
  )
}

export default function CheckinatworkSection({ soustraitantId }: { soustraitantId: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [ouvriers, setOuvriers] = useState<LigneOuvrier[] | null>(null)
  const [erreur, setErreur] = useState(false)

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`/api/sous-traitants/${soustraitantId}/checkinatwork`)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setOuvriers(d.ouvriers)
    } catch {
      setErreur(true)
    }
  }, [soustraitantId])

  useEffect(() => {
    charger()
  }, [charger])

  const incomplet = (o: LigneOuvrier) =>
    !o.numeroEntreprise || (o.limosa ? !o.limosa.numero || o.limosa.expire : !o.numeroNational)
  const nbIncomplets = (ouvriers || []).filter(incomplet).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-700/50 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <IdentificationIcon className="w-5 h-5" />
            </div>
            <span className="font-semibold text-lg text-gray-900 dark:text-white">
              Infos Checkinatwork
              {ouvriers && (
                <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal text-sm">
                  ({ouvriers.length} homme{ouvriers.length > 1 ? 's' : ''}
                  {nbIncomplets > 0 && (
                    <span className="text-orange-600 dark:text-orange-400">
                      {' '}· {nbIncomplets} à compléter
                    </span>
                  )}
                  )
                </span>
              )}
            </span>
          </div>
          <ChevronDownIcon
            className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${ouvert ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {ouvert && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {erreur ? (
            <p className="p-6 text-sm text-red-600">Impossible de charger les ouvriers.</p>
          ) : ouvriers === null ? (
            <p className="p-6 text-sm text-gray-500">Chargement…</p>
          ) : ouvriers.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">Aucun ouvrier actif pour ce sous-traitant.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {ouvriers.map((o) => {
                const lien = `/sous-traitants/${soustraitantId}/ouvriers/${o.id}`
                return (
                  <li
                    key={o.id}
                    className="grid gap-x-6 gap-y-1.5 px-6 py-3 text-gray-700 dark:text-gray-300 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {o.nom.toUpperCase()} {o.prenom}
                      </span>
                      <Copier valeur={`${o.nom} ${o.prenom}`.trim()} />
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-gray-400 sm:hidden w-24 shrink-0">Entreprise</span>
                      <Valeur
                        texte={o.numeroEntreprise ? formaterNumeroEntreprise(o.numeroEntreprise) : null}
                        copie={o.numeroEntreprise}
                        lien={`${lien}/edit`}
                      />
                      {o.entreprisePropre && (
                        <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 text-[11px] text-gray-500" title="Numéro propre à l'ouvrier">
                          propre
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                      {o.limosa ? (
                        <>
                          <span className="text-xs text-gray-400 w-24 sm:w-auto shrink-0">Limosa n°</span>
                          <Valeur texte={o.limosa.numero} lien={`${lien}/documents`} />
                          {o.limosa.dateFin && (
                            <span
                              className={`text-xs ${o.limosa.expire ? 'text-red-600 font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                              {o.limosa.expire ? 'expiré le ' : "jusqu'au "}
                              {dateFr(o.limosa.dateFin)}
                            </span>
                          )}
                          {!o.limosa.dateFin && o.limosa.expire && (
                            <span className="text-xs text-red-600 font-medium">archivé</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-gray-400 w-24 sm:w-auto shrink-0">N° national</span>
                          <Valeur
                            texte={o.numeroNational ? formaterNumeroNational(o.numeroNational) : null}
                            copie={o.numeroNational}
                            lien={`${lien}/edit`}
                          />
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

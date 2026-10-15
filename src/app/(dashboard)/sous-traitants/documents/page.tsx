'use client'

// Documents des sous-traitants : une ligne par personne, une colonne par type
// de document — ✓ valide, ! expire sous 30 jours, ✗ expiré ou manquant
// (exigé), — non exigé. Documents exigés réglables par société.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { TYPES_DOCUMENT_OUVRIER, TYPES_DOCUMENT_SOCIETE, documentsRequisParDefaut } from '@/lib/documents/types'

type Statut = 'ok' | 'bientot' | 'expire' | 'manquant' | 'absent'
interface Cellule {
  statut: Statut
  requis: boolean
  url?: string
  dateExpiration?: string | null
}
interface Ouvrier {
  id: string
  nom: string
  prenom: string
  poste: string
  documents: Record<string, Cellule>
  manquants: number
  alertes: number
}
interface Societe {
  id: string
  nom: string
  tva: string | null
  actif: boolean
  requisOuvrier: string[]
  requisSociete: string[]
  contratSigne: { statut: Statut; dateFin: string | null }
  documentsSociete: Record<string, Cellule>
  ouvriers: Ouvrier[]
}

const dateFr = (d?: string | null) => (d ? d.split('-').reverse().join('/') : '')
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const STYLE: Record<Statut, string> = {
  ok: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  bientot: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  expire: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  manquant: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  absent: 'text-gray-300 dark:text-gray-600',
}
const SYMBOLE: Record<Statut, string> = { ok: '✓', bientot: '!', expire: '✗', manquant: '✗', absent: '—' }

function titreCellule(c: Cellule, libelle: string) {
  if (c.statut === 'ok') return `${libelle} : valide${c.dateExpiration ? ` jusqu'au ${dateFr(c.dateExpiration)}` : ''}`
  if (c.statut === 'bientot') return `${libelle} : expire le ${dateFr(c.dateExpiration)}`
  if (c.statut === 'expire') return `${libelle} : expiré le ${dateFr(c.dateExpiration)}`
  if (c.statut === 'manquant') return `${libelle} : manquant (exigé)`
  return `${libelle} : non exigé`
}

function Pastille({ c, libelle, href }: { c: Cellule; libelle: string; href?: string }) {
  const contenu = (
    <span
      title={titreCellule(c, libelle)}
      className={`inline-flex min-w-[2rem] items-center justify-center rounded px-1.5 py-0.5 text-xs font-bold ${STYLE[c.statut]}`}
    >
      {SYMBOLE[c.statut]}
      {(c.statut === 'bientot' || c.statut === 'expire') && c.dateExpiration && (
        <span className="ml-1 font-normal">{dateFr(c.dateExpiration).slice(0, 5)}</span>
      )}
    </span>
  )
  if (c.url) return <a href={c.url} target="_blank" rel="noopener noreferrer">{contenu}</a>
  if (href) return <Link href={href}>{contenu}</Link>
  return contenu
}

function ReglageRequis({ st, onEnregistre }: { st: Societe; onEnregistre: () => void }) {
  const [ouvrier, setOuvrier] = useState<string[]>(st.requisOuvrier)
  const [societe, setSociete] = useState<string[]>(st.requisSociete)
  const [enCours, setEnCours] = useState(false)
  const basculer = (liste: string[], set: (v: string[]) => void, code: string) =>
    set(liste.includes(code) ? liste.filter((c) => c !== code) : [...liste, code])
  const enregistrer = async (parDefaut = false) => {
    setEnCours(true)
    await fetch(`/api/sous-traitants/${st.id}/documents-requis`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parDefaut ? { ouvrier: null } : { ouvrier, societe }),
    })
    setEnCours(false)
    onEnregistre()
  }
  return (
    <div className="mt-3 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-900/40 md:grid-cols-2">
      <div>
        <p className="mb-2 font-semibold text-gray-900 dark:text-white">Exigés pour chaque personne</p>
        {TYPES_DOCUMENT_OUVRIER.map((t) => (
          <label key={t.code} className="flex items-center gap-2 py-0.5 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={ouvrier.includes(t.code)} onChange={() => basculer(ouvrier, setOuvrier, t.code)} />
            {t.libelle}
          </label>
        ))}
        <p className="mt-2 text-xs text-gray-500">
          Par défaut : {documentsRequisParDefaut(st.tva).map((c) => TYPES_DOCUMENT_OUVRIER.find((t) => t.code === c)?.court).join(', ')}
          {' '}(selon le pays du n° de TVA).
        </p>
      </div>
      <div>
        <p className="mb-2 font-semibold text-gray-900 dark:text-white">Exigés pour la société</p>
        {TYPES_DOCUMENT_SOCIETE.map((t) => (
          <label key={t.code} className="flex items-center gap-2 py-0.5 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={societe.includes(t.code)} onChange={() => basculer(societe, setSociete, t.code)} />
            {t.libelle}
          </label>
        ))}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={enCours} onClick={() => enregistrer()} className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50">
            Enregistrer
          </button>
          <button type="button" disabled={enCours} onClick={() => enregistrer(true)} className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-700 dark:border-gray-600 dark:text-gray-200">
            Revenir au défaut (personnes)
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DocumentsSousTraitantsPage() {
  const [societes, setSocietes] = useState<Societe[] | null>(null)
  const [recherche, setRecherche] = useState('')
  const [problemesSeuls, setProblemesSeuls] = useState(false)
  const [inactifs, setInactifs] = useState(false)
  const [reglage, setReglage] = useState<string | null>(null)
  const [synchro, setSynchro] = useState<string | null>(null)

  const synchroniserNas = async () => {
    setSynchro('Synchronisation…')
    const r = await fetch('/api/sous-traitants/conformite/miroir-nas', { method: 'POST' })
    const d = await r.json().catch(() => ({}))
    setSynchro(r.ok ? `NAS : ${d.copies} document(s) copié(s)${d.echecs ? `, ${d.echecs} échec(s)` : ''}.` : d.error || 'Erreur')
  }

  const charger = useCallback(async () => {
    const r = await fetch(`/api/sous-traitants/conformite${inactifs ? '?inactifs=1' : ''}`)
    const d = r.ok ? await r.json() : { societes: [] }
    setSocietes(d.societes)
  }, [inactifs])

  useEffect(() => {
    charger()
  }, [charger])

  const filtrees = useMemo(() => {
    if (!societes) return []
    const q = normaliser(recherche.trim())
    return societes
      .map((st) => {
        const nomSte = normaliser(st.nom)
        let ouvriers = st.ouvriers
        if (q && !nomSte.includes(q)) ouvriers = ouvriers.filter((o) => normaliser(`${o.prenom} ${o.nom}`).includes(q))
        if (problemesSeuls) ouvriers = ouvriers.filter((o) => o.manquants > 0 || o.alertes > 0)
        return { ...st, ouvriers }
      })
      .filter((st) => (q ? normaliser(st.nom).includes(q) || st.ouvriers.length > 0 : true))
      .filter((st) => !problemesSeuls || st.ouvriers.length > 0 || st.contratSigne.statut !== 'ok')
  }, [societes, recherche, problemesSeuls])

  const totaux = useMemo(() => {
    const personnes = (societes || []).flatMap((s) => s.ouvriers)
    return {
      personnes: personnes.length,
      aCorriger: personnes.filter((o) => o.manquants > 0).length,
      bientot: personnes.filter((o) => o.alertes > 0).length,
    }
  }, [societes])

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents des sous-traitants</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {totaux.personnes} personnes · <span className="text-red-600">{totaux.aCorriger} avec documents manquants ou expirés</span>
            {' '}· <span className="text-amber-600">{totaux.bientot} avec un document qui expire sous 30 jours</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une personne ou une société…"
            className="w-72 rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={problemesSeuls} onChange={(e) => setProblemesSeuls(e.target.checked)} />
            À corriger seulement
          </label>
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={inactifs} onChange={(e) => setInactifs(e.target.checked)} />
            Sous-traitants inactifs
          </label>
          <button
            type="button"
            onClick={synchroniserNas}
            className="rounded-md border border-gray-300 px-3 py-2 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
            title="Recopier sur le NAS les documents qui n'y sont pas encore (administrateurs)"
          >
            Synchroniser le NAS
          </button>
          {synchro && <span className="text-gray-600 dark:text-gray-300">{synchro}</span>}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
        {(['ok', 'bientot', 'manquant', 'absent'] as Statut[]).map((s) => (
          <span key={s} className="flex items-center gap-1">
            <span className={`inline-flex min-w-[1.5rem] justify-center rounded px-1 font-bold ${STYLE[s]}`}>{SYMBOLE[s]}</span>
            {s === 'ok' ? 'valide' : s === 'bientot' ? 'expire sous 30 jours' : s === 'manquant' ? 'manquant ou expiré (exigé)' : 'non exigé'}
          </span>
        ))}
        <span>· Cliquer sur une case ouvre le document, ou le dossier de la personne pour en ajouter un.</span>
      </div>

      {societes === null ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : filtrees.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun résultat.</p>
      ) : (
        <div className="space-y-6">
          {filtrees.map((st) => {
            // Colonnes : types exigés + types présents chez au moins une personne
            const colonnes = TYPES_DOCUMENT_OUVRIER.filter(
              (t) => st.requisOuvrier.includes(t.code) || st.ouvriers.some((o) => o.documents[t.code]?.statut !== 'absent')
            )
            const docsSte = TYPES_DOCUMENT_SOCIETE.filter(
              (t) => st.requisSociete.includes(t.code) || st.documentsSociete[t.code]?.statut !== 'absent'
            )
            return (
              <section key={st.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 bg-gray-50 px-5 py-3 dark:border-gray-700 dark:bg-gray-700/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={`/sous-traitants/${st.id}`} className="text-lg font-semibold text-gray-900 hover:underline dark:text-white">
                        {st.nom}
                      </Link>
                      {st.tva && <span className="text-xs text-gray-500">{st.tva}</span>}
                      {!st.actif && <span className="rounded bg-gray-200 px-1.5 text-xs text-gray-600 dark:bg-gray-600 dark:text-gray-200">inactif</span>}
                      <span className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                        Contrat-cadre
                        <Pastille
                          c={{ statut: st.contratSigne.statut, requis: true, dateExpiration: st.contratSigne.dateFin }}
                          libelle="Contrat-cadre signé"
                        />
                      </span>
                      {docsSte.map((t) => (
                        <span key={t.code} className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300">
                          {t.court}
                          <Pastille c={st.documentsSociete[t.code]} libelle={t.libelle} />
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <button type="button" onClick={() => setReglage(reglage === st.id ? null : st.id)} className="text-blue-600 hover:underline dark:text-blue-400">
                        Documents exigés
                      </button>
                      <Link href={`/sous-traitants/${st.id}/ouvriers`} className="text-blue-600 hover:underline dark:text-blue-400">
                        Personnes
                      </Link>
                    </div>
                  </div>
                  {reglage === st.id && (
                    <ReglageRequis
                      st={st}
                      onEnregistre={() => {
                        setReglage(null)
                        charger()
                      }}
                    />
                  )}
                </div>

                {st.ouvriers.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-500">Aucune personne enregistrée.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          <th className="px-4 py-2 text-left">Personne</th>
                          {colonnes.map((t) => (
                            <th key={t.code} className="px-2 py-2 text-center" title={t.libelle}>
                              {t.court}
                              {st.requisOuvrier.includes(t.code) && <span className="text-red-500">*</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {st.ouvriers.map((o) => (
                          <tr key={o.id} className={o.manquants ? 'bg-red-50/40 dark:bg-red-900/10' : ''}>
                            <td className="whitespace-nowrap px-4 py-2">
                              <Link href={`/sous-traitants/${st.id}/ouvriers/${o.id}/documents`} className="font-medium text-gray-900 hover:underline dark:text-white">
                                {o.prenom} {o.nom}
                              </Link>
                              <span className="ml-2 text-xs text-gray-500">{o.poste}</span>
                            </td>
                            {colonnes.map((t) => (
                              <td key={t.code} className="px-2 py-2 text-center">
                                <Pastille
                                  c={o.documents[t.code]}
                                  libelle={t.libelle}
                                  href={`/sous-traitants/${st.id}/ouvriers/${o.id}/documents`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

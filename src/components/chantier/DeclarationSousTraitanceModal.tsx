'use client'

// Modale « Déclaration de sous-traitance » de la fiche chantier : type d'envoi
// (simple demande / avec documents), sous-traitants actifs à cocher,
// destinataire. En mode « avec documents », les pièces sont choisies par le
// serveur (documents en vigueur exigés de chaque personne active) et l'aperçu
// signale ce qui manque avant l'envoi.

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ordonnerEnArbre } from '@/lib/soustraitants/arbre'
import {
  XMarkIcon, EnvelopeIcon, PaperClipIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, CheckCircleIcon,
} from '@heroicons/react/24/outline'

type Mode = 'simple' | 'documents'

interface SousTraitant { id: string; nom: string; tva?: string | null; parentId?: string | null }
interface Contact { id: string; prenom: string; nom: string; email: string | null }
interface Manque { personne: string | null; libelle: string; raison: 'manquant' | 'expire' | 'fichier_introuvable' }
interface Apercu {
  id: string
  nom: string
  personnes: string[]
  pieces: { personne: string | null; libelle: string; nomFichier: string; taille: number }[]
  manques: Manque[]
}

const RAISONS: Record<Manque['raison'], string> = {
  manquant: 'manquant',
  expire: 'expiré',
  fichier_introuvable: 'fichier introuvable',
}

const mo = (octets: number) => `${(octets / 1048576).toFixed(1)} Mo`

export default function DeclarationSousTraitanceModal(props: {
  chantierId: string
  nomChantier: string
  clientId?: string | null
  contactId?: string | null
  onClose: () => void
}) {
  const { chantierId, nomChantier, clientId, contactId, onClose } = props
  const [mode, setMode] = useState<Mode>('simple')
  const [soustraitants, setSoustraitants] = useState<SousTraitant[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [destinataireType, setDestinataireType] = useState<'contact' | 'libre'>('contact')
  const [contactChoisi, setContactChoisi] = useState('')
  const [emailLibre, setEmailLibre] = useState('')
  const [apercu, setApercu] = useState<Apercu[]>([])
  const [tailleMax, setTailleMax] = useState(20 * 1048576)
  const [chargementApercu, setChargementApercu] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [zip, setZip] = useState(true)

  useEffect(() => {
    fetch('/api/soustraitants?activeOnly=1')
      .then((r) => r.json())
      .then((data) => setSoustraitants(Array.isArray(data) ? data.filter((s: { actif?: boolean }) => s.actif !== false) : []))
      .catch(() => toast.error('Erreur lors du chargement des sous-traitants'))
      .finally(() => setChargement(false))
    if (clientId) {
      fetch(`/api/clients/${clientId}/contacts`)
        .then((r) => r.json())
        .then((data: Contact[]) => {
          const avecEmail = (Array.isArray(data) ? data : []).filter((c) => c.email)
          setContacts(avecEmail)
          // Contact du chantier présélectionné
          if (contactId && avecEmail.some((c) => c.id === contactId)) setContactChoisi(contactId)
          if (!avecEmail.length) setDestinataireType('libre')
        })
        .catch(() => setDestinataireType('libre'))
    } else {
      setDestinataireType('libre')
    }
  }, [clientId, contactId])

  // Aperçu des pièces jointes (mode documents)
  useEffect(() => {
    if (mode !== 'documents' || !selection.length) {
      setApercu([])
      return
    }
    let annule = false
    setChargementApercu(true)
    const t = setTimeout(() => {
      fetch(`/api/chantiers/${chantierId}/declaration-sous-traitance?soustraitants=${selection.join(',')}`)
        .then((r) => r.json())
        .then((data) => {
          if (annule) return
          setApercu(data.societes || [])
          if (data.tailleMax) setTailleMax(data.tailleMax)
        })
        .catch(() => !annule && toast.error("Erreur lors de l'aperçu des documents"))
        .finally(() => !annule && setChargementApercu(false))
    }, 250)
    return () => {
      annule = true
      clearTimeout(t)
    }
  }, [mode, selection, chantierId])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    const liste = q ? soustraitants.filter((s) => s.nom.toLowerCase().includes(q) || (s.tva || '').toLowerCase().includes(q)) : soustraitants
    return ordonnerEnArbre(liste)
  }, [soustraitants, recherche])

  // Cocher un sous-traitant principal coche aussi ses rattachés (décochables un par un)
  const basculer = (id: string) =>
    setSelection((sel) => {
      if (sel.includes(id)) return sel.filter((x) => x !== id)
      const rattaches = soustraitants.filter((s) => s.parentId === id && !sel.includes(s.id)).map((s) => s.id)
      return [...sel, id, ...rattaches]
    })
  const estRattacheVisible = (s: SousTraitant) => !!s.parentId && filtres.some((x) => x.id === s.parentId)

  const tailleTotale = apercu.reduce((t, s) => t + s.pieces.reduce((u, p) => u + p.taille, 0), 0)
  const nbPieces = apercu.reduce((t, s) => t + s.pieces.length, 0)
  const tropLourd = mode === 'documents' && tailleTotale > tailleMax

  const destinataire =
    destinataireType === 'contact' ? contacts.find((c) => c.id === contactChoisi)?.email || '' : emailLibre.trim()

  const envoyer = async () => {
    if (!selection.length) return toast.error('Cochez au moins un sous-traitant')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinataire)) return toast.error('Choisissez un destinataire valide')
    setEnvoi(true)
    try {
      const res = await fetch(`/api/chantiers/${chantierId}/declaration-sous-traitance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, soustraitantIds: selection, destinataireEmail: destinataire, zip }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi")
      toast.success(
        mode === 'documents'
          ? `Déclaration envoyée à ${destinataire} avec ${data.attachmentsCount} document${data.attachmentsCount > 1 ? 's' : ''}${data.zip ? ' (fichier ZIP)' : ''}`
          : `Déclaration envoyée à ${destinataire}`
      )
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'envoi")
    } finally {
      setEnvoi(false)
    }
  }

  const carteMode = (valeur: Mode, titre: string, texte: string, Icone: typeof EnvelopeIcon) => (
    <label
      className={`flex-1 flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
        mode === valeur
          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <input type="radio" name="mode" className="mt-1 text-sky-600 focus:ring-sky-500" checked={mode === valeur} onChange={() => setMode(valeur)} />
      <div>
        <div className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <Icone className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          {titre}
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{texte}</p>
      </div>
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => !envoi && onClose()} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* En-tête */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Déclaration de sous-traitance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{nomChantier}</p>
          </div>
          <button onClick={onClose} disabled={envoi} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Type d'envoi */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Type d&apos;envoi</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {carteMode('simple', 'Simple mail de demande', 'Demande de déclaration avec le nom et le n° d’entreprise de chaque sous-traitant.', EnvelopeIcon)}
              {carteMode('documents', 'Mail avec documents', 'Joint automatiquement les documents en vigueur de la société et de chaque personne active.', PaperClipIcon)}
            </div>
          </div>

          {/* 2. Sous-traitants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sous-traitants actifs</h3>
              {selection.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
                  {selection.length} sélectionné{selection.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="relative mb-2">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un sous-traitant…"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
              {chargement ? (
                <div className="p-4 text-sm text-gray-500">Chargement…</div>
              ) : filtres.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">Aucun sous-traitant</div>
              ) : (
                filtres.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 py-2 pr-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${estRattacheVisible(s) ? 'pl-9' : 'pl-3'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selection.includes(s.id)}
                      onChange={() => basculer(s.id)}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">
                      {estRattacheVisible(s) && <span className="text-gray-400 mr-1">↳</span>}
                      {s.nom}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{s.tva || 'TVA ?'}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Aperçu des documents joints */}
          {mode === 'documents' && selection.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Documents joints</h3>
                {!chargementApercu && (
                  <span className={`text-xs font-medium ${tropLourd ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}>
                    {nbPieces} fichier{nbPieces > 1 ? 's' : ''} · {mo(tailleTotale)} / {mo(tailleMax)} max
                  </span>
                )}
              </div>
              {chargementApercu ? (
                <div className="text-sm text-gray-500">Calcul des documents…</div>
              ) : (
                <div className="space-y-3">
                  {apercu.map((s) => (
                    <div key={s.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{s.nom}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {s.personnes.length} personne{s.personnes.length > 1 ? 's' : ''} · {s.pieces.length} fichier{s.pieces.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      {s.personnes.length === 0 && (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Aucune personne active encodée pour ce sous-traitant.</p>
                      )}
                      {s.manques.length === 0 && s.personnes.length > 0 ? (
                        <p className="mt-2 text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                          <CheckCircleIcon className="h-4 w-4" /> Tous les documents exigés sont en ordre
                        </p>
                      ) : (
                        s.manques.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {s.manques.map((m, i) => (
                              <li key={i} className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1">
                                <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0" />
                                <span>
                                  {m.personne ? `${m.personne} — ` : 'Société — '}
                                  {m.libelle} : {RAISONS[m.raison]}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )
                      )}
                    </div>
                  ))}
                  {nbPieces > 1 && (
                    <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={zip}
                        onChange={(e) => setZip(e.target.checked)}
                        className="mt-0.5 rounded text-sky-600 focus:ring-sky-500"
                      />
                      <span>
                        Regrouper les {nbPieces} documents dans <strong>un seul fichier ZIP</strong>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">Un dossier par société, puis par personne.</span>
                      </span>
                    </label>
                  )}
                  {tropLourd && (
                    <p className="text-sm text-red-600">
                      Trop de pièces jointes pour un seul mail : envoyez les sous-traitants en plusieurs fois.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Destinataire */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Destinataire</h3>
            <div className="flex gap-4 mb-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  checked={destinataireType === 'contact'}
                  onChange={() => setDestinataireType('contact')}
                  disabled={!contacts.length}
                  className="text-sky-600 focus:ring-sky-500"
                />
                Contact du client
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="radio"
                  checked={destinataireType === 'libre'}
                  onChange={() => setDestinataireType('libre')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                Autre adresse
              </label>
            </div>
            {destinataireType === 'contact' ? (
              <select
                value={contactChoisi}
                onChange={(e) => setContactChoisi(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Sélectionner un contact…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom} ({c.email})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="email"
                value={emailLibre}
                onChange={(e) => setEmailLibre(e.target.value)}
                placeholder="email@client.be"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            )}
          </div>
        </div>

        {/* Pied */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={envoi}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={envoyer}
            disabled={envoi || !selection.length || !destinataire || tropLourd || (mode === 'documents' && chargementApercu)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <EnvelopeIcon className="h-5 w-5" />
            {envoi ? 'Envoi…' : 'Envoyer la déclaration'}
          </button>
        </div>
      </div>
    </div>
  )
}

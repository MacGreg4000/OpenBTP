'use client'

// Photos et fichiers joints à un état d'avancement client. Ajout par bouton ou
// glisser-déposer ; retrait possible tant que l'état n'est pas finalisé. Les
// pièces se joignent au mail d'envoi de l'état (case à cocher dans la modale).

import { useCallback, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { PaperClipIcon, PhotoIcon, DocumentIcon, TrashIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline'

export interface PieceJointe {
  id: number
  nom: string
  url: string
  mime: string
  taille: number
  ajoutePar: string | null
  createdAt: string
}

const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.mp4,.mov'

export const tailleLisible = (o: number) =>
  o >= 1048576 ? `${(o / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`

const estImage = (p: PieceJointe) => p.mime.startsWith('image/') && !/hei[cf]/.test(p.mime)

export default function PiecesJointesEtat({ chantierId, etatId }: { chantierId: string; etatId: string }) {
  const [pieces, setPieces] = useState<PieceJointe[]>([])
  const [estFinalise, setEstFinalise] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [survol, setSurvol] = useState(false)
  const [apercu, setApercu] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const base = `/api/chantiers/${chantierId}/etats-avancement/${etatId}/pieces-jointes`

  const charger = useCallback(() => {
    fetch(base)
      .then((r) => r.json())
      .then((d) => {
        setPieces(d.pieces || [])
        setEstFinalise(!!d.estFinalise)
      })
      .catch(() => setPieces([]))
      .finally(() => setChargement(false))
  }, [base])

  useEffect(() => {
    charger()
  }, [charger])

  const televerser = async (fichiers: FileList | File[]) => {
    const liste = Array.from(fichiers)
    if (!liste.length) return
    setEnvoi(true)
    try {
      const fd = new FormData()
      liste.forEach((f) => fd.append('fichiers', f))
      const res = await fetch(base, { method: 'POST', body: fd })
      const d = await res.json()
      if (d.pieces?.length) {
        setPieces((p) => [...p, ...d.pieces])
        toast.success(`${d.pieces.length} fichier${d.pieces.length > 1 ? 's' : ''} ajouté${d.pieces.length > 1 ? 's' : ''}`)
      }
      for (const e of d.erreurs || []) toast.error(e)
      if (!res.ok && !d.erreurs?.length) toast.error(d.error || "Erreur lors de l'ajout")
    } catch {
      toast.error("Erreur lors de l'ajout")
    } finally {
      setEnvoi(false)
    }
  }

  const supprimer = async (p: PieceJointe) => {
    if (!confirm(`Retirer « ${p.nom} » de cet état ?`)) return
    const res = await fetch(`${base}/${p.id}`, { method: 'DELETE' })
    if (res.ok) setPieces((l) => l.filter((x) => x.id !== p.id))
    else toast.error((await res.json().catch(() => ({}))).error || 'Erreur lors du retrait')
  }

  const images = pieces.filter(estImage)
  const autres = pieces.filter((p) => !estImage(p))

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border overflow-hidden transition-colors ${
        survol ? 'border-sky-400 ring-2 ring-sky-200 dark:ring-sky-800' : 'border-gray-200 dark:border-gray-700'
      }`}
      onDragOver={(e) => {
        e.preventDefault()
        setSurvol(true)
      }}
      onDragLeave={() => setSurvol(false)}
      onDrop={(e) => {
        e.preventDefault()
        setSurvol(false)
        if (e.dataTransfer.files?.length) televerser(e.dataTransfer.files)
      }}
    >
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
          <PaperClipIcon className="h-5 w-5 mr-2 text-sky-500" />
          Photos et fichiers
          {pieces.length > 0 && <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({pieces.length})</span>}
        </h2>
        <div className="flex items-center gap-3">
          <span className="hidden md:inline text-xs text-gray-500 dark:text-gray-400">Glissez des fichiers ici · joignables au mail d&apos;envoi</span>
          <input
            ref={input}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) televerser(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => input.current?.click()}
            disabled={envoi}
            className="inline-flex items-center gap-2 px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 transition-colors"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {envoi ? 'Envoi…' : 'Ajouter'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {chargement ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
        ) : pieces.length === 0 ? (
          <button
            onClick={() => input.current?.click()}
            className="w-full py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-sky-400 hover:text-sky-600 transition-colors flex flex-col items-center gap-2"
          >
            <PhotoIcon className="h-8 w-8" />
            Aucune pièce jointe — cliquez ou glissez des photos, PDF, plans…
          </button>
        ) : (
          <div className="space-y-4">
            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {images.map((p) => (
                  <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900">
                    <img src={p.url} alt={p.nom} loading="lazy" className="w-full h-full object-cover cursor-zoom-in" onClick={() => setApercu(p.url)} />
                    {!estFinalise && (
                      <button
                        onClick={() => supprimer(p)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Retirer"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {autres.length > 0 && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                {autres.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                    <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-sm text-sky-700 dark:text-sky-400 hover:underline">
                      {p.nom}
                    </a>
                    <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{tailleLisible(p.taille)}</span>
                    {!estFinalise && (
                      <button onClick={() => supprimer(p)} className="text-gray-400 hover:text-red-600" title="Retirer">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {estFinalise && (
              <p className="text-xs text-gray-500 dark:text-gray-400">État finalisé : on peut encore ajouter des pièces, mais plus en retirer.</p>
            )}
          </div>
        )}
      </div>

      {apercu && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setApercu(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white" onClick={() => setApercu(null)}>
            <XMarkIcon className="h-6 w-6" />
          </button>
          <img src={apercu} alt="" className="max-w-full max-h-[90vh] object-contain" />
        </div>
      )}
    </div>
  )
}

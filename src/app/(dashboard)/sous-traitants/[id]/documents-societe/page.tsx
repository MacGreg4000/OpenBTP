'use client'

// Documents de la SOCIÉTÉ sous-traitante (extrait BCE, attestations ONSS /
// fiscale, assurance RC, statuts…) : ajout, correction (type, date, précision)
// et archivage — jamais de suppression, l'historique reste consultable.

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PlusIcon, ArrowDownTrayIcon, ArrowLeftIcon, ExclamationCircleIcon, BuildingOfficeIcon,
  PencilSquareIcon, ArchiveBoxIcon, ChevronDownIcon, ChevronRightIcon, EyeIcon,
} from '@heroicons/react/24/outline'
import ApercuDocument from '@/components/documents/ApercuDocument'
import PageHeader from '@/components/PageHeader'
import SelectField from '@/components/ui/SelectField'
import { TYPES_DOCUMENT_SOCIETE, libelleType } from '@/lib/documents/types'

interface DocumentSociete {
  id: string
  type: string
  nom: string
  url: string
  dateExpiration: string | null
  precision: string | null
  archive: boolean
  archiveLe: string | null
  createdAt: string
}

const champ =
  'mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
const btnSecondaire =
  'px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50'
const btnPrimaire =
  'px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-500 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50'

const dateFr = (d: string) => format(new Date(d), 'dd/MM/yyyy', { locale: fr })

function Modale({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">{titre}</h3>
        {children}
      </div>
    </div>
  )
}

/** Champs communs ajout / modification */
function ChampsDocument(p: {
  type: string; setType: (v: string) => void
  precision: string; setPrecision: (v: string) => void
  date: string; setDate: (v: string) => void
}) {
  return (
    <>
      <SelectField label="Type de document" id="type" name="type" required value={p.type} onChange={(e) => p.setType(e.target.value)} className="mt-1">
        <option value="">Sélectionner un type</option>
        {TYPES_DOCUMENT_SOCIETE.map((t) => (
          <option key={t.code} value={t.code}>{t.libelle}</option>
        ))}
      </SelectField>
      <div>
        <label htmlFor="precision" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Précision (facultatif)</label>
        <input id="precision" value={p.precision} onChange={(e) => p.setPrecision(e.target.value)} maxLength={60} placeholder="2026, 2e trimestre, page 2…" className={champ} />
      </div>
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date d&apos;expiration</label>
        <input id="date" type="date" value={p.date} onChange={(e) => p.setDate(e.target.value)} className={champ} />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Laisser vide si le document n&apos;expire pas.</p>
      </div>
    </>
  )
}

function ModaleAjout({ onClose, onUpload, enCours }: { onClose: () => void; onUpload: (fd: FormData) => Promise<void>; enCours: boolean }) {
  const [type, setType] = useState('')
  const [precision, setPrecision] = useState('')
  const [date, setDate] = useState('')
  const [fichier, setFichier] = useState<File | null>(null)
  return (
    <Modale titre="Ajouter un document de société">
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!fichier) return
          const fd = new FormData()
          fd.append('file', fichier)
          fd.append('type', type)
          fd.append('precision', precision)
          fd.append('dateExpiration', date)
          await onUpload(fd)
        }}
      >
        <ChampsDocument type={type} setType={setType} precision={precision} setPrecision={setPrecision} date={date} setDate={setDate} />
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fichier *</label>
          <input
            id="file"
            type="file"
            required
            accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
            onChange={(e) => setFichier(e.target.files?.[0] || null)}
            className="mt-1 block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Un document du même type déjà en vigueur sera archivé (conservé).</p>
        </div>
        <div className="mt-5 flex justify-end space-x-3">
          <button type="button" onClick={onClose} disabled={enCours} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={enCours || !type || !fichier} className={btnPrimaire}>{enCours ? 'Envoi...' : 'Envoyer'}</button>
        </div>
      </form>
    </Modale>
  )
}

function ModaleEdition({ doc, onClose, onSave, enCours }: {
  doc: DocumentSociete; onClose: () => void; enCours: boolean
  onSave: (v: { type: string; precision: string; dateExpiration: string }) => Promise<void>
}) {
  const [type, setType] = useState(doc.type)
  const [precision, setPrecision] = useState(doc.precision || '')
  const [date, setDate] = useState(doc.dateExpiration ? doc.dateExpiration.slice(0, 10) : '')
  return (
    <Modale titre="Modifier le document">
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate" title={doc.nom}>{doc.nom}</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          await onSave({ type, precision, dateExpiration: date })
        }}
      >
        <ChampsDocument type={type} setType={setType} precision={precision} setPrecision={setPrecision} date={date} setDate={setDate} />
        <div className="mt-5 flex justify-end space-x-3">
          <button type="button" onClick={onClose} disabled={enCours} className={btnSecondaire}>Annuler</button>
          <button type="submit" disabled={enCours || !type} className={btnPrimaire}>{enCours ? 'Enregistrement...' : 'Enregistrer'}</button>
        </div>
      </form>
    </Modale>
  )
}

export default function DocumentsSocietePage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params)
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [documents, setDocuments] = useState<DocumentSociete[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)
  const [edition, setEdition] = useState<DocumentSociete | null>(null)
  const [aArchiver, setAArchiver] = useState<DocumentSociete | null>(null)
  const [apercu, setApercu] = useState<DocumentSociete | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [voirArchives, setVoirArchives] = useState(false)
  const base = `/api/sous-traitants/${id}/documents-societe`

  const charger = useCallback(async () => {
    try {
      const r = await fetch(base)
      if (!r.ok) throw new Error()
      const d = await r.json()
      setNom(d.soustraitant?.nom || '')
      setDocuments(d.documents || [])
    } catch {
      setErreur('Erreur lors du chargement des documents')
    } finally {
      setChargement(false)
    }
  }, [base])

  useEffect(() => {
    charger()
  }, [charger])

  const executer = async (action: () => Promise<Response>, fermer: () => void) => {
    setEnCours(true)
    try {
      const r = await action()
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erreur')
      await charger()
      fermer()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setEnCours(false)
    }
  }

  const enVigueur = documents.filter((d) => !d.archive)
  const archives = documents.filter((d) => d.archive)
  const maintenant = Date.now()
  const alerte = (d: DocumentSociete) => {
    if (!d.dateExpiration) return null
    const t = new Date(d.dateExpiration).getTime()
    if (t < maintenant) return 'text-red-500 dark:text-red-400'
    if (t - maintenant < 30 * 86400000) return 'text-yellow-500 dark:text-yellow-400'
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={`Documents de la société${nom ? ` — ${nom}` : ''}`}
        subtitle="Extrait BCE, attestations ONSS et fiscale, assurance RC, statuts…"
        icon={BuildingOfficeIcon}
        actions={
          <div className="flex gap-2">
            <button onClick={() => router.push('/sous-traitants/documents')} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <button onClick={() => setAjout(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Nouveau document</span>
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {erreur && <div className="text-red-600 dark:text-red-400">{erreur}</div>}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Type</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Date d&apos;ajout</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Expiration</th>
                <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {chargement ? (
                <tr><td colSpan={4} className="px-3 py-6 text-sm text-gray-500">Chargement…</td></tr>
              ) : enVigueur.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-sm text-gray-500 dark:text-gray-400">Aucun document de société en vigueur.</td></tr>
              ) : (
                enVigueur.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-3 py-4 text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex items-center">
                        {alerte(d) && <ExclamationCircleIcon className={`h-5 w-5 mr-2 ${alerte(d)}`} />}
                        {libelleType(d.type)}
                        {d.precision && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({d.precision})</span>}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{dateFr(d.createdAt)}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{d.dateExpiration ? dateFr(d.dateExpiration) : 'N/A'}</td>
                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm sm:pr-6">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setApercu(d)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Voir">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <a href={d.url} download={d.nom} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300" title="Télécharger">
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </a>
                        <button onClick={() => setEdition(d)} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white" title="Modifier le type, la date ou la précision">
                          <PencilSquareIcon className="h-5 w-5" />
                        </button>
                        <button onClick={() => setAArchiver(d)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300" title="Archiver">
                          <ArchiveBoxIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {archives.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl shadow border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
            <button onClick={() => setVoirArchives(!voirArchives)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              {voirArchives ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
              Historique archivé ({archives.length})
            </button>
            {voirArchives && (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700 border-t border-gray-100 dark:border-gray-700">
                {archives.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                    <span className="flex-1 text-gray-700 dark:text-gray-300">
                      {libelleType(d.type)}{d.precision ? ` (${d.precision})` : ''}
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        ajouté le {dateFr(d.createdAt)}{d.archiveLe ? ` · archivé le ${dateFr(d.archiveLe)}` : ''}
                        {d.dateExpiration ? ` · valable jusqu'au ${dateFr(d.dateExpiration)}` : ''}
                      </span>
                    </span>
                    <button onClick={() => setApercu(d)} className="text-blue-600 dark:text-blue-400" title="Voir">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {ajout && (
        <ModaleAjout
          enCours={enCours}
          onClose={() => setAjout(false)}
          onUpload={(fd) => executer(() => fetch(base, { method: 'POST', body: fd }), () => setAjout(false))}
        />
      )}
      {edition && (
        <ModaleEdition
          doc={edition}
          enCours={enCours}
          onClose={() => setEdition(null)}
          onSave={(v) =>
            executer(
              () => fetch(`${base}/${edition.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: v.type, precision: v.precision, dateExpiration: v.dateExpiration || null }),
              }),
              () => setEdition(null)
            )
          }
        />
      )}
      {aArchiver && (
        <Modale titre="Archiver ce document ?">
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            « {libelleType(aArchiver.type)} » ne sera plus en vigueur. Il est conservé dans l&apos;historique (et dans _Archives sur le NAS), pas supprimé.
          </p>
          <div className="mt-4 flex justify-end space-x-3">
            <button onClick={() => setAArchiver(null)} disabled={enCours} className={btnSecondaire}>Annuler</button>
            <button
              onClick={() => executer(() => fetch(`${base}/${aArchiver.id}`, { method: 'DELETE' }), () => setAArchiver(null))}
              disabled={enCours}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {enCours ? 'Archivage...' : 'Archiver'}
            </button>
          </div>
        </Modale>
      )}

      <ApercuDocument document={apercu} onClose={() => setApercu(null)} />
    </div>
  )
}

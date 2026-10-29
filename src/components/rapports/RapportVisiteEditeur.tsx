'use client'

// Formulaire de rapport de visite, pensé d'abord pour le téléphone sur chantier.
// Partagé par la version bureau (/chantiers/[id]/rapports/nouveau) et la
// version mobile (/mobile/rapports/nouveau).
//
// - Barre d'actions collée en bas de l'écran (photo, galerie, note,
//   enregistrer) : plus besoin de remonter en haut de la page.
// - Champs en 16 px minimum : iOS ne zoome plus la page au focus.
// - Photos compressées puis envoyées une à une dès leur ajout, avec un état
//   visible et une reprise automatique quand le réseau revient.
// - Brouillon gardé sur l'appareil à chaque modification (fermeture de
//   l'onglet, perte de réseau, rechargement).
// - Enregistrement en un seul appel : le serveur génère les PDF (général + un
//   par tag) et ne remplace l'ancienne version qu'une fois tout réussi.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CameraIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
  DocumentTextIcon,
  WifiIcon,
} from '@heroicons/react/24/outline'
import { compressImage } from '@/lib/utils/image-compression'

const TAGS_PAR_DEFAUT = ['Général']
const CLE_TAGS = 'tags_personnalises'

type StatutPhoto = 'attente' | 'envoi' | 'ok' | 'erreur'

interface Photo {
  id: string
  /** URL serveur (/uploads/...) une fois envoyée */
  url?: string
  documentId?: number | null
  /** Aperçu affiché : blob local puis URL serveur */
  apercu: string
  file?: File
  annotation: string
  tags: string[]
  statut: StatutPhoto
}

interface Personne {
  id: string
  nom: string
  fonction: string
}

interface Note {
  id: string
  contenu: string
  tags: string[]
}

interface Contenu {
  date: string
  personnes: Personne[]
  notes: Note[]
  photos: Photo[]
}

interface Brouillon {
  date: string
  personnes: Personne[]
  notes: Note[]
  photos: Array<{ id: string; url: string; documentId?: number | null; annotation: string; tags: string[] }>
  enregistreLe: string
}

export interface RapportVisiteEditeurProps {
  chantierId: string
  nomChantier?: string
  /** Rapport durable à modifier */
  rapportId?: string
  /** Ancien rapport (document PDF avec métadonnées) à modifier */
  ancienDocumentId?: string
  retourHref: string
  /** Page affichée après l'enregistrement */
  apresEnregistrement: string
}

const nouvelId = () => Math.random().toString(36).slice(2, 10)
const sansAccents = (v: string) =>
  v.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase().trim()
const contientTag = (tags: string[], tag: string) => tags.some(t => sansAccents(t) === sansAccents(tag))

function lireTagsPerso(): string[] {
  try {
    const brut = localStorage.getItem(CLE_TAGS)
    const liste = brut ? JSON.parse(brut) : []
    return Array.isArray(liste) ? liste.filter((t: unknown) => typeof t === 'string' && t.trim() && t !== 'testag') : []
  } catch {
    return []
  }
}

function ecrireTagsPerso(tags: string[]) {
  try {
    localStorage.setItem(CLE_TAGS, JSON.stringify(tags.filter(t => !contientTag(TAGS_PAR_DEFAUT, t))))
  } catch {
    // stockage indisponible : la liste reste valable pour la session
  }
}

async function messageErreur(res: Response, defaut: string) {
  try {
    const data = await res.json()
    if (data?.error) return data.error as string
  } catch {
    // réponse non JSON
  }
  return `${defaut} (erreur ${res.status})`
}

const champ =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-gray-600 dark:bg-gray-800 dark:text-white'

function PuceTag({ tag, actif, onClick }: { tag: string; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-sm font-medium transition-colors ${
        actif
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      {actif && <CheckIcon className="h-4 w-4" />}
      {tag}
    </button>
  )
}

function Carte({ titre, icone, compteur, action, children }: {
  titre: string
  icone: React.ReactNode
  compteur?: number
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          <span className="text-gray-500 dark:text-gray-400">{icone}</span>
          <span className="truncate">{titre}</span>
          {compteur !== undefined && compteur > 0 && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
              {compteur}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export default function RapportVisiteEditeur({
  chantierId,
  nomChantier: nomInitial,
  rapportId,
  ancienDocumentId,
  retourHref,
  apresEnregistrement,
}: RapportVisiteEditeurProps) {
  const router = useRouter()
  const enEdition = Boolean(rapportId || ancienDocumentId)
  const cleBrouillon = `rapport-visite:brouillon:${chantierId}:${rapportId ?? (ancienDocumentId ? `doc-${ancienDocumentId}` : 'nouveau')}`

  const [nomChantier, setNomChantier] = useState(nomInitial ?? '')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [personnes, setPersonnes] = useState<Personne[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [tagsPerso, setTagsPerso] = useState<string[]>([])
  const [remplaceDocuments, setRemplaceDocuments] = useState<number[]>([])

  const [chargement, setChargement] = useState(true)
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [avertissement, setAvertissement] = useState<string | null>(null)
  const [brouillonDu, setBrouillonDu] = useState<Date | null>(null)
  const [horsLigne, setHorsLigne] = useState(false)
  const [preparation, setPreparation] = useState(0)
  const [phase, setPhase] = useState<null | 'photos' | 'pdf'>(null)
  const [erreurEnregistrement, setErreurEnregistrement] = useState<string | null>(null)

  const [nouveauNom, setNouveauNom] = useState('')
  const [nouvelleFonction, setNouvelleFonction] = useState('')
  const [presentsPrecedents, setPresentsPrecedents] = useState<Personne[]>([])
  const [nouveauTag, setNouveauTag] = useState('')
  const [noteOuverte, setNoteOuverte] = useState<Note | null>(null)
  const [defilerVers, setDefilerVers] = useState<string | null>(null)

  const contenuInitial = useRef<Contenu | null>(null)
  const modifie = useRef(false)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos
  const envoiEnCours = useRef(false)
  const inputCamera = useRef<HTMLInputElement>(null)
  const inputGalerie = useRef<HTMLInputElement>(null)
  const cartesPhotos = useRef(new Map<string, HTMLDivElement>())

  const toucher = () => {
    modifie.current = true
  }

  // ---------------------------------------------------------------- chargement

  const appliquer = useCallback((c: Contenu) => {
    setDate(c.date)
    setPersonnes(c.personnes)
    setNotes(c.notes)
    setPhotos(c.photos)
  }, [])

  useEffect(() => {
    setTagsPerso(lireTagsPerso())
    let annule = false

    const chargerBase = async (): Promise<Contenu> => {
      const vide: Contenu = { date: format(new Date(), 'yyyy-MM-dd'), personnes: [], notes: [], photos: [] }
      if (rapportId) {
        const res = await fetch(`/api/rapports/${rapportId}`)
        if (!res.ok) throw new Error(await messageErreur(res, 'Impossible de charger le rapport'))
        const r = await res.json()
        return {
          date: String(r.date).slice(0, 10),
          personnes: (Array.isArray(r.personnes) ? r.personnes : []).map((p: Personne) => ({ id: p.id || nouvelId(), nom: p.nom, fonction: p.fonction || '' })),
          notes: (r.notes || []).map((n: { id: string; contenu: string; tags?: string[] }) => ({ id: n.id, contenu: n.contenu, tags: Array.isArray(n.tags) ? n.tags : [] })),
          photos: (r.photos || []).map((p: { id: string; url: string; annotation?: string; tags?: string[]; documentId?: number | null }) => ({
            id: p.id, url: p.url, documentId: p.documentId ?? null, apercu: p.url, annotation: p.annotation || '', tags: Array.isArray(p.tags) ? p.tags : [], statut: 'ok' as const,
          })),
        }
      }
      if (ancienDocumentId) {
        const res = await fetch(`/api/chantiers/${chantierId}/documents/${ancienDocumentId}`)
        if (!res.ok) throw new Error(await messageErreur(res, 'Impossible de charger le rapport'))
        const doc = await res.json()
        let meta = doc.metadata
        if (typeof meta === 'string') {
          try { meta = JSON.parse(meta) } catch { meta = null }
        }
        if (!meta || (!meta.notesIndividuelles && !meta.notes && !meta.photos)) {
          throw new Error('Le contenu de cet ancien rapport n\'a pas été conservé : il ne peut pas être modifié. Créez un nouveau rapport.')
        }
        const toutesPhotos: Array<{ id?: string; preview?: string; annotation?: string; tags?: string[] }> = Array.isArray(meta.photos) ? meta.photos : []
        const utilisables = toutesPhotos.filter(p => typeof p.preview === 'string' && p.preview.startsWith('/uploads/'))
        if (utilisables.length < toutesPhotos.length) {
          setAvertissement(`${toutesPhotos.length - utilisables.length} photo(s) de l'ancien rapport n'avaient pas été conservées sur le serveur et ne sont plus disponibles.`)
        }
        const variantes: number[] = Array.isArray(meta.rapportVariantesIds) ? meta.rapportVariantesIds.map(Number) : []
        setRemplaceDocuments([Number(ancienDocumentId), ...variantes].filter(Number.isFinite))
        const notesMeta = Array.isArray(meta.notesIndividuelles)
          ? meta.notesIndividuelles
          : meta.notes ? [{ contenu: String(meta.notes), tags: ['Général'] }] : []
        return {
          date: typeof meta.date === 'string' ? meta.date.slice(0, 10) : vide.date,
          personnes: (Array.isArray(meta.personnes) ? meta.personnes : []).map((p: Personne) => ({ id: p.id || nouvelId(), nom: p.nom, fonction: p.fonction || '' })),
          notes: notesMeta.map((n: { id?: string; contenu: string; tags?: string[] }) => ({ id: n.id || nouvelId(), contenu: n.contenu, tags: n.tags || [] })),
          photos: utilisables.map(p => ({
            id: p.id || nouvelId(), url: p.preview!, apercu: p.preview!, annotation: p.annotation || '', tags: p.tags || [], statut: 'ok' as const,
          })),
        }
      }
      return vide
    }

    ;(async () => {
      try {
        if (!nomInitial) {
          fetch(`/api/chantiers/${chantierId}`)
            .then(r => (r.ok ? r.json() : null))
            .then(c => { if (!annule && c?.nomChantier) setNomChantier(c.nomChantier) })
            .catch(() => {})
        }
        const base = await chargerBase()
        if (annule) return
        contenuInitial.current = base
        appliquer(base)

        // Brouillon local plus récent ?
        try {
          const brut = localStorage.getItem(cleBrouillon)
          if (brut) {
            const b: Brouillon = JSON.parse(brut)
            appliquer({
              date: b.date || base.date,
              personnes: b.personnes || [],
              notes: b.notes || [],
              photos: (b.photos || []).map(p => ({ ...p, apercu: p.url, statut: 'ok' as const })),
            })
            setBrouillonDu(new Date(b.enregistreLe))
            modifie.current = true
          }
        } catch {
          // brouillon illisible : ignoré
        }
      } catch (e) {
        if (!annule) setErreurChargement(e instanceof Error ? e.message : 'Impossible de charger le rapport')
      } finally {
        if (!annule) setChargement(false)
      }
    })()

    // Présents de la dernière visite (suggestion)
    fetch(`/api/chantiers/${chantierId}/rapports`)
      .then(r => (r.ok ? r.json() : []))
      .then((liste: Array<{ id: string; personnes?: Personne[] }>) => {
        if (annule || !Array.isArray(liste)) return
        const precedent = liste.find(r => r.id !== rapportId && Array.isArray(r.personnes) && r.personnes.length > 0)
        if (precedent?.personnes) setPresentsPrecedents(precedent.personnes)
      })
      .catch(() => {})

    return () => {
      annule = true
    }
  }, [chantierId, rapportId, ancienDocumentId, nomInitial, cleBrouillon, appliquer])

  // ---------------------------------------------------------------- brouillon

  useEffect(() => {
    if (chargement || !modifie.current) return
    const t = setTimeout(() => {
      const b: Brouillon = {
        date,
        personnes,
        notes,
        photos: photos
          .filter(p => p.statut === 'ok' && p.url)
          .map(p => ({ id: p.id, url: p.url!, documentId: p.documentId, annotation: p.annotation, tags: p.tags })),
        enregistreLe: new Date().toISOString(),
      }
      try {
        localStorage.setItem(cleBrouillon, JSON.stringify(b))
      } catch {
        // stockage plein ou indisponible
      }
    }, 600)
    return () => clearTimeout(t)
  }, [date, personnes, notes, photos, chargement, cleBrouillon])

  const abandonnerBrouillon = () => {
    try { localStorage.removeItem(cleBrouillon) } catch { /* ignoré */ }
    modifie.current = false
    setBrouillonDu(null)
    if (contenuInitial.current) appliquer(contenuInitial.current)
  }

  // Prévenir avant de quitter avec des photos pas encore envoyées
  useEffect(() => {
    const avant = (e: BeforeUnloadEvent) => {
      if (phase || photosRef.current.some(p => p.statut !== 'ok')) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', avant)
    return () => window.removeEventListener('beforeunload', avant)
  }, [phase])

  // ---------------------------------------------------------------- réseau

  useEffect(() => {
    const maj = () => setHorsLigne(!navigator.onLine)
    maj()
    window.addEventListener('online', maj)
    window.addEventListener('offline', maj)
    return () => {
      window.removeEventListener('online', maj)
      window.removeEventListener('offline', maj)
    }
  }, [])

  // ---------------------------------------------------------------- photos

  const majPhoto = (id: string, patch: Partial<Photo>) =>
    setPhotos(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))

  // File d'envoi : une photo à la fois, dès qu'elle est prête
  useEffect(() => {
    if (envoiEnCours.current || horsLigne) return
    const suivante = photos.find(p => p.statut === 'attente' && p.file)
    if (!suivante) return
    envoiEnCours.current = true
    majPhoto(suivante.id, { statut: 'envoi' })
    ;(async () => {
      try {
        const fd = new FormData()
        fd.append('file', suivante.file!)
        fd.append('chantierId', chantierId)
        fd.append('annotation', suivante.annotation || '')
        fd.append('tags', JSON.stringify(suivante.tags))
        const res = await fetch('/api/rapports/upload-photo', { method: 'POST', body: fd })
        if (!res.ok) throw new Error(await messageErreur(res, 'Envoi de la photo'))
        const data = await res.json()
        majPhoto(suivante.id, { statut: 'ok', url: data.url, documentId: data.documentId ?? null })
      } catch (e) {
        console.error('Envoi photo :', e)
        majPhoto(suivante.id, { statut: 'erreur' })
      } finally {
        envoiEnCours.current = false
        // relancer l'effet pour la photo suivante
        setPhotos(prev => [...prev])
      }
    })()
  }, [photos, horsLigne, chantierId])

  const ajouterFichiers = async (liste: FileList | null, input: HTMLInputElement | null) => {
    const fichiers = liste ? Array.from(liste) : []
    if (input) input.value = ''
    if (fichiers.length === 0) return
    toucher()
    setPreparation(n => n + fichiers.length)
    let premier: string | null = null
    for (const f of fichiers) {
      let file = f
      try {
        file = await compressImage(f, 1920, 1920, 0.8)
      } catch {
        // compression impossible : fichier d'origine
      }
      const photo: Photo = {
        id: nouvelId(),
        file,
        apercu: URL.createObjectURL(file),
        annotation: '',
        tags: [...TAGS_PAR_DEFAUT],
        statut: 'attente',
      }
      premier = premier ?? photo.id
      setPhotos(prev => [...prev, photo])
      setPreparation(n => n - 1)
    }
    if (premier) setDefilerVers(premier)
  }

  useEffect(() => {
    if (!defilerVers) return
    const el = cartesPhotos.current.get(defilerVers)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setDefilerVers(null)
    }
  }, [defilerVers, photos])

  const retirerPhoto = (photo: Photo) => {
    toucher()
    const index = photosRef.current.findIndex(p => p.id === photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    toast(
      t => (
        <span className="flex items-center gap-3">
          Photo retirée
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white"
            onClick={() => {
              setPhotos(prev => {
                if (prev.some(p => p.id === photo.id)) return prev
                const copie = [...prev]
                copie.splice(Math.min(index, copie.length), 0, photo)
                return copie
              })
              toast.dismiss(t.id)
            }}
          >
            Annuler
          </button>
        </span>
      ),
      { duration: 5000 }
    )
  }

  const relancerEchecs = () =>
    setPhotos(prev => prev.map(p => (p.statut === 'erreur' ? { ...p, statut: 'attente' as const } : p)))

  // ---------------------------------------------------------------- tags

  const tagsDisponibles = useMemo(() => {
    const tous = [...TAGS_PAR_DEFAUT, ...tagsPerso]
    for (const n of notes) tous.push(...n.tags)
    for (const p of photos) tous.push(...p.tags)
    const vus = new Set<string>()
    return tous.filter(t => {
      const k = sansAccents(t)
      if (!k || vus.has(k)) return false
      vus.add(k)
      return true
    })
  }, [tagsPerso, notes, photos])

  const ajouterTag = () => {
    const tag = nouveauTag.trim().replace(/\s+/g, ' ')
    if (!tag) return
    setNouveauTag('')
    if (contientTag(tagsDisponibles, tag)) return
    const liste = [...tagsPerso, tag]
    setTagsPerso(liste)
    ecrireTagsPerso(liste)
  }

  const supprimerTag = (tag: string) => {
    toucher()
    const liste = tagsPerso.filter(t => sansAccents(t) !== sansAccents(tag))
    setTagsPerso(liste)
    ecrireTagsPerso(liste)
    setNotes(prev => prev.map(n => ({ ...n, tags: n.tags.filter(t => sansAccents(t) !== sansAccents(tag)) })))
    setPhotos(prev => prev.map(p => ({ ...p, tags: p.tags.filter(t => sansAccents(t) !== sansAccents(tag)) })))
  }

  const basculer = (tags: string[], tag: string) =>
    contientTag(tags, tag) ? tags.filter(t => sansAccents(t) !== sansAccents(tag)) : [...tags, tag]

  // ---------------------------------------------------------------- personnes

  const ajouterPersonne = () => {
    if (!nouveauNom.trim()) return
    toucher()
    setPersonnes(prev => [...prev, { id: nouvelId(), nom: nouveauNom.trim(), fonction: nouvelleFonction.trim() }])
    setNouveauNom('')
    setNouvelleFonction('')
  }

  const precedentsManquants = presentsPrecedents.filter(
    p => !personnes.some(q => sansAccents(q.nom) === sansAccents(p.nom))
  )

  const reprendrePrecedents = () => {
    toucher()
    setPersonnes(prev => [...prev, ...precedentsManquants.map(p => ({ id: nouvelId(), nom: p.nom, fonction: p.fonction || '' }))])
  }

  // ---------------------------------------------------------------- notes

  const validerNote = (note: Note) => {
    if (!note.contenu.trim()) {
      setNoteOuverte(null)
      return
    }
    toucher()
    setNotes(prev => (prev.some(n => n.id === note.id) ? prev.map(n => (n.id === note.id ? note : n)) : [...prev, note]))
    setNoteOuverte(null)
  }

  // ---------------------------------------------------------------- enregistrement

  const nbAttente = photos.filter(p => p.statut === 'attente' || p.statut === 'envoi').length
  const nbErreurs = photos.filter(p => p.statut === 'erreur').length
  const vide = notes.length === 0 && photos.length === 0

  const attendreEnvois = () =>
    new Promise<void>(resolve => {
      const verifier = () => {
        const enCours = photosRef.current.some(p => p.statut === 'attente' || p.statut === 'envoi')
        if (!enCours || (!navigator.onLine && !envoiEnCours.current)) resolve()
        else setTimeout(verifier, 300)
      }
      verifier()
    })

  const enregistrer = async () => {
    if (phase) return
    setErreurEnregistrement(null)
    if (vide) {
      setErreurEnregistrement('Ajoutez au moins une note ou une photo.')
      return
    }
    if (horsLigne) {
      setErreurEnregistrement('Pas de réseau : le rapport est gardé sur ce téléphone. Enregistrez-le dès que la connexion revient.')
      return
    }
    try {
      setPhase('photos')
      relancerEchecs()
      await new Promise(r => setTimeout(r, 100))
      await attendreEnvois()
      const echecs = photosRef.current.filter(p => p.statut !== 'ok' || !p.url).length
      if (echecs > 0) {
        setErreurEnregistrement(`${echecs} photo(s) n'ont pas pu être envoyées. Vérifiez le réseau puis réessayez, ou retirez-les.`)
        return
      }

      setPhase('pdf')
      const corps = {
        date,
        personnes: personnes.map(({ id, nom, fonction }) => ({ id, nom, fonction })),
        notes: notes.map(n => ({ contenu: n.contenu, tags: n.tags })),
        photos: photosRef.current.map(p => ({ url: p.url, annotation: p.annotation, tags: p.tags, documentId: p.documentId ?? null })),
        remplaceDocuments,
      }
      const res = await fetch(rapportId ? `/api/rapports/${rapportId}` : `/api/chantiers/${chantierId}/rapports`, {
        method: rapportId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      })
      if (!res.ok) throw new Error(await messageErreur(res, 'Enregistrement du rapport'))

      try { localStorage.removeItem(cleBrouillon) } catch { /* ignoré */ }
      modifie.current = false
      toast.success(enEdition ? 'Rapport mis à jour' : 'Rapport enregistré')
      setPhase(null)
      router.push(apresEnregistrement)
    } catch (e) {
      console.error('Enregistrement rapport :', e)
      setErreurEnregistrement(
        e instanceof TypeError
          ? 'Connexion perdue pendant l\'enregistrement. Le rapport est gardé sur ce téléphone : réessayez.'
          : e instanceof Error ? e.message : 'Erreur lors de l\'enregistrement'
      )
    } finally {
      setPhase(p => (p ? null : p))
    }
  }

  // ---------------------------------------------------------------- rendu

  if (chargement) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (erreurChargement) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-base text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-semibold">Rapport indisponible</p>
          <p className="mt-1">{erreurChargement}</p>
          <Link href={retourHref} className="mt-3 inline-flex items-center gap-2 font-semibold underline">
            <ArrowLeftIcon className="h-4 w-4" /> Retour
          </Link>
        </div>
      </div>
    )
  }

  const libelleEnregistrer =
    phase === 'photos'
      ? `Photos… ${photos.length - nbAttente}/${photos.length}`
      : phase === 'pdf'
        ? 'Création du PDF…'
        : enEdition ? 'Mettre à jour' : 'Enregistrer'

  return (
    <div className="min-h-screen overflow-x-clip bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl space-y-4 px-4 pb-6 pt-4">
        {/* En-tête */}
        <div className="flex items-center gap-3">
          <Link
            href={retourHref}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            aria-label="Retour"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {enEdition ? 'Modifier le rapport de visite' : 'Rapport de visite'}
            </h1>
            {nomChantier && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{nomChantier}</p>}
          </div>
        </div>

        {horsLigne && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
            <WifiIcon className="mt-0.5 h-5 w-5 shrink-0" />
            Pas de réseau. Continuez : tout est gardé sur ce téléphone et les photos partiront quand la connexion reviendra.
          </div>
        )}

        {brouillonDu && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-100">
            <span>Brouillon du {brouillonDu.toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' })} repris.</span>
            <button type="button" onClick={abandonnerBrouillon} className="font-semibold underline">
              {enEdition ? 'Annuler mes modifications' : 'Repartir de zéro'}
            </button>
          </div>
        )}

        {avertissement && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            {avertissement}
          </div>
        )}

        {/* Date et présents */}
        <Carte titre="Visite" icone={<UserGroupIcon className="h-5 w-5" />} compteur={personnes.length}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="date-visite">
            Date de la visite
          </label>
          <input
            id="date-visite"
            type="date"
            value={date}
            onChange={e => { toucher(); setDate(e.target.value) }}
            className={`${champ} mt-1`}
            required
          />

          <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Personnes présentes</p>
          {personnes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {personnes.map(p => (
                <li key={p.id} className="flex max-w-full items-center gap-1 rounded-full bg-gray-100 py-1 pl-3 pr-1 text-sm dark:bg-gray-700">
                  <span className="truncate">
                    <span className="font-medium text-gray-900 dark:text-white">{p.nom}</span>
                    {p.fonction && <span className="text-gray-500 dark:text-gray-400"> · {p.fonction}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => { toucher(); setPersonnes(prev => prev.filter(q => q.id !== p.id)) }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label={`Retirer ${p.nom}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {precedentsManquants.length > 0 && (
            <button
              type="button"
              onClick={reprendrePrecedents}
              className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-dashed border-blue-300 px-3 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Reprendre les présents de la dernière visite ({precedentsManquants.map(p => p.nom).join(', ')})
            </button>
          )}
          <form
            className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={e => { e.preventDefault(); ajouterPersonne() }}
          >
            <input className={champ} placeholder="Nom" value={nouveauNom} onChange={e => setNouveauNom(e.target.value)} autoComplete="off" />
            <input className={champ} placeholder="Fonction (facultatif)" value={nouvelleFonction} onChange={e => setNouvelleFonction(e.target.value)} autoComplete="off" />
            <button
              type="submit"
              disabled={!nouveauNom.trim()}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-base font-semibold text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
            >
              <PlusIcon className="h-5 w-5" /> Ajouter
            </button>
          </form>
        </Carte>

        {/* Tags */}
        <Carte titre="Tags (lots, intervenants)" icone={<TagIcon className="h-5 w-5" />}>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Un PDF par tag est créé en plus du rapport complet, pour l&apos;envoyer à chaque intervenant.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tagsDisponibles.map(tag => (
              <li key={tag} className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 py-1 pl-3 pr-1 text-sm dark:border-gray-600 dark:bg-gray-700">
                {tag}
                {contientTag(TAGS_PAR_DEFAUT, tag) ? (
                  <span className="w-2" />
                ) : (
                  <button
                    type="button"
                    onClick={() => supprimerTag(tag)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600"
                    aria-label={`Supprimer le tag ${tag}`}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); ajouterTag() }}>
            <input
              className={champ}
              placeholder="Nouveau tag (ex. Carreleur, Client…)"
              value={nouveauTag}
              onChange={e => setNouveauTag(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!nouveauTag.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
              aria-label="Ajouter le tag"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </form>
        </Carte>

        {/* Notes */}
        <Carte
          titre="Notes"
          icone={<DocumentTextIcon className="h-5 w-5" />}
          compteur={notes.length}
          action={
            <button
              type="button"
              onClick={() => setNoteOuverte({ id: nouvelId(), contenu: '', tags: [...TAGS_PAR_DEFAUT] })}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30"
            >
              <PlusIcon className="h-4 w-4" /> Note
            </button>
          }
        >
          {notes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune note. Utilisez le bouton « Note » en bas de l&apos;écran.</p>
          ) : (
            <ol className="space-y-2">
              {notes.map((n, i) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => setNoteOuverte({ ...n })}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-left hover:border-blue-300 dark:border-gray-600 dark:bg-gray-700/50"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-sm font-semibold text-gray-400">{i + 1}.</span>
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-base text-gray-900 dark:text-white">{n.contenu}</p>
                      <PencilSquareIcon className="h-5 w-5 shrink-0 text-gray-400" />
                    </div>
                    {n.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 pl-5">
                        {n.tags.map(t => (
                          <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">{t}</span>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </Carte>

        {/* Photos */}
        <Carte
          titre="Photos"
          icone={<PhotoIcon className="h-5 w-5" />}
          compteur={photos.length}
          action={
            nbErreurs > 0 && !phase ? (
              <button type="button" onClick={relancerEchecs} className="inline-flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                <ArrowPathIcon className="h-4 w-4" /> Renvoyer ({nbErreurs})
              </button>
            ) : undefined
          }
        >
          {photos.length === 0 && preparation === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Aucune photo. Utilisez « Photo » ou « Galerie » en bas de l&apos;écran.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {photos.map((p, i) => (
                <div
                  key={p.id}
                  ref={el => {
                    if (el) cartesPhotos.current.set(p.id, el)
                    else cartesPhotos.current.delete(p.id)
                  }}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"
                >
                  <div className="relative bg-gray-100 dark:bg-gray-900">
                    <img src={p.apercu} alt={`Photo ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                    <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">{i + 1}</span>
                    <button
                      type="button"
                      onClick={() => retirerPhoto(p)}
                      className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label={`Retirer la photo ${i + 1}`}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                    {p.statut !== 'ok' && (
                      <div
                        className={`absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white ${
                          p.statut === 'erreur' ? 'bg-red-600/90' : 'bg-black/60'
                        }`}
                      >
                        {p.statut === 'erreur' ? (
                          <>
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            Non envoyée
                            <button type="button" onClick={() => majPhoto(p.id, { statut: 'attente' })} className="ml-auto underline">
                              Réessayer
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            {p.statut === 'envoi' ? 'Envoi…' : horsLigne ? 'En attente de réseau' : 'En attente'}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-3">
                    <textarea
                      value={p.annotation}
                      onChange={e => { toucher(); majPhoto(p.id, { annotation: e.target.value }) }}
                      placeholder="Commentaire de la photo…"
                      rows={2}
                      className={`${champ} resize-none`}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {tagsDisponibles.map(tag => (
                        <PuceTag
                          key={tag}
                          tag={tag}
                          actif={contientTag(p.tags, tag)}
                          onClick={() => { toucher(); majPhoto(p.id, { tags: basculer(p.tags, tag) }) }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {preparation > 0 && (
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-600">
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Préparation de {preparation} photo(s)…
                </div>
              )}
            </div>
          )}
        </Carte>

        {erreurEnregistrement && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-base text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            {erreurEnregistrement}
          </div>
        )}
      </div>

      {/* Barre d'actions toujours visible */}
      <div
        className="sticky bottom-0 z-30 border-t border-gray-200 bg-white/95 px-3 pt-2 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[1fr_1fr_1fr_1.6fr] gap-2">
          <button
            type="button"
            onClick={() => inputCamera.current?.click()}
            disabled={Boolean(phase)}
            className="flex min-h-[56px] flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100 disabled:opacity-40 dark:bg-blue-900/30 dark:text-blue-200"
          >
            <CameraIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Photo</span>
          </button>
          <button
            type="button"
            onClick={() => inputGalerie.current?.click()}
            disabled={Boolean(phase)}
            className="flex min-h-[56px] flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100 disabled:opacity-40 dark:bg-blue-900/30 dark:text-blue-200"
          >
            <PhotoIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Galerie</span>
          </button>
          <button
            type="button"
            onClick={() => setNoteOuverte({ id: nouvelId(), contenu: '', tags: [...TAGS_PAR_DEFAUT] })}
            disabled={Boolean(phase)}
            className="flex min-h-[56px] flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700 active:bg-blue-100 disabled:opacity-40 dark:bg-blue-900/30 dark:text-blue-200"
          >
            <DocumentTextIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Note</span>
          </button>
          <button
            type="button"
            onClick={enregistrer}
            disabled={Boolean(phase) || vide}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-2 text-base font-semibold text-white shadow-sm active:bg-blue-700 disabled:opacity-50"
          >
            {phase ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <CheckIcon className="h-5 w-5 shrink-0" />
            )}
            <span className="truncate">{libelleEnregistrer}</span>
          </button>
        </div>
        {!phase && (nbAttente > 0 || horsLigne) && (
          <p className="mx-auto mt-1 max-w-3xl text-center text-xs text-gray-500 dark:text-gray-400">
            {horsLigne ? 'Hors ligne · brouillon gardé sur l’appareil' : `Envoi des photos en cours (${nbAttente})…`}
          </p>
        )}
      </div>

      <input
        ref={inputCamera}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => ajouterFichiers(e.target.files, e.target)}
      />
      <input
        ref={inputGalerie}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => ajouterFichiers(e.target.files, e.target)}
      />

      {noteOuverte && (
        <FenetreNote
          note={noteOuverte}
          tags={tagsDisponibles}
          nouvelle={!notes.some(n => n.id === noteOuverte.id)}
          onValider={validerNote}
          onSupprimer={() => {
            toucher()
            setNotes(prev => prev.filter(n => n.id !== noteOuverte.id))
            setNoteOuverte(null)
          }}
          onFermer={() => setNoteOuverte(null)}
        />
      )}
    </div>
  )
}

function FenetreNote({ note, tags, nouvelle, onValider, onSupprimer, onFermer }: {
  note: Note
  tags: string[]
  nouvelle: boolean
  onValider: (note: Note) => void
  onSupprimer: () => void
  onFermer: () => void
}) {
  const [contenu, setContenu] = useState(note.contenu)
  const [tagsNote, setTagsNote] = useState<string[]>(note.tags)

  useEffect(() => {
    const echap = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', echap)
    return () => window.removeEventListener('keydown', echap)
  }, [onFermer])

  return (
    // Panneau en haut de l'écran sur téléphone : le clavier ne le recouvre pas
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:items-center" onClick={onFermer}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={nouvelle ? 'Nouvelle note' : 'Modifier la note'}
        className="w-full max-w-lg rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-800"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{nouvelle ? 'Nouvelle note' : 'Modifier la note'}</h3>
          <button type="button" onClick={onFermer} className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label="Fermer">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <textarea
          autoFocus
          value={contenu}
          onChange={e => setContenu(e.target.value)}
          rows={5}
          placeholder="Observation, remarque, point à suivre…"
          className={`${champ} resize-y`}
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <PuceTag
              key={tag}
              tag={tag}
              actif={contientTag(tagsNote, tag)}
              onClick={() =>
                setTagsNote(prev => (contientTag(prev, tag) ? prev.filter(t => sansAccents(t) !== sansAccents(tag)) : [...prev, tag]))
              }
            />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          {!nouvelle && (
            <button type="button" onClick={onSupprimer} className="inline-flex min-h-[44px] items-center gap-1 rounded-xl px-3 text-base font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
              <TrashIcon className="h-5 w-5" /> Supprimer
            </button>
          )}
          <button
            type="button"
            onClick={() => onValider({ ...note, contenu: contenu.trim(), tags: tagsNote })}
            disabled={!contenu.trim()}
            className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 text-base font-semibold text-white disabled:opacity-40"
          >
            <CheckIcon className="h-5 w-5" /> {nouvelle ? 'Ajouter' : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}

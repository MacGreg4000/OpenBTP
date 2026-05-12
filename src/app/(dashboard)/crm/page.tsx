'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { PageHeader } from '@/components/PageHeader'
import {
  BuildingOffice2Icon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  UserGroupIcon,
  BellAlertIcon,
} from '@heroicons/react/24/outline'
import { SearchInput } from '@/components/ui'
import { useNotification } from '@/hooks/useNotification'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypeEntreprise =
  | 'ENTREPRISE_GENERALE'
  | 'ARCHITECTE'
  | 'CLIENT_DIRECT'
  | 'AUTRE'

interface Entreprise {
  id: string
  nom: string
  type: TypeEntreprise
  adresse: string | null
  codePostal: string | null
  ville: string | null
  pays: string | null
  telephone: string | null
  email: string | null
  siteWeb: string | null
  _count: {
    contacts: number
    rappels: number
  }
}

interface EntrepriseFormData {
  nom: string
  type: TypeEntreprise
  adresse: string
  codePostal: string
  ville: string
  pays: string
  telephone: string
  email: string
  siteWeb: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<TypeEntreprise, string> = {
  ENTREPRISE_GENERALE: 'EG',
  ARCHITECTE: 'Architecte',
  CLIENT_DIRECT: 'Client direct',
  AUTRE: 'Autre',
}

const TYPE_BADGE_CLASSES: Record<TypeEntreprise, string> = {
  ENTREPRISE_GENERALE:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  ARCHITECTE:
    'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
  CLIENT_DIRECT:
    'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  AUTRE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'TOUS', label: 'Tous' },
  { value: 'ENTREPRISE_GENERALE', label: 'EG' },
  { value: 'ARCHITECTE', label: 'Architecte' },
  { value: 'CLIENT_DIRECT', label: 'Client Direct' },
  { value: 'AUTRE', label: 'Autre' },
]

const EMPTY_FORM: EntrepriseFormData = {
  nom: '',
  type: 'ENTREPRISE_GENERALE',
  adresse: '',
  codePostal: '',
  ville: '',
  pays: 'Belgique',
  telephone: '',
  email: '',
  siteWeb: '',
}

// ---------------------------------------------------------------------------
// EntrepriseForm — shared between Create and Edit modals
// ---------------------------------------------------------------------------

interface EntrepriseFormProps {
  form: EntrepriseFormData
  onChange: (field: keyof EntrepriseFormData, value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
  saving: boolean
  submitLabel: string
}

function EntrepriseForm({
  form,
  onChange,
  onSubmit,
  onClose,
  saving,
  submitLabel,
}: EntrepriseFormProps) {
  const inputCls =
    'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Nom */}
      <div>
        <label className={labelCls}>
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          required
          value={form.nom}
          onChange={(e) => onChange('nom', e.target.value)}
          className={inputCls}
          placeholder="Nom de l'entreprise"
        />
      </div>

      {/* Type */}
      <div>
        <label className={labelCls}>Type</label>
        <select
          value={form.type}
          onChange={(e) => onChange('type', e.target.value)}
          className={inputCls}
        >
          <option value="ENTREPRISE_GENERALE">Entreprise Générale</option>
          <option value="ARCHITECTE">Architecte</option>
          <option value="CLIENT_DIRECT">Client Direct</option>
          <option value="AUTRE">Autre</option>
        </select>
      </div>

      {/* Adresse */}
      <div>
        <label className={labelCls}>Adresse</label>
        <input
          type="text"
          value={form.adresse}
          onChange={(e) => onChange('adresse', e.target.value)}
          className={inputCls}
          placeholder="Rue et numéro"
        />
      </div>

      {/* Code postal + Ville */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Code postal</label>
          <input
            type="text"
            value={form.codePostal}
            onChange={(e) => onChange('codePostal', e.target.value)}
            className={inputCls}
            placeholder="1000"
          />
        </div>
        <div>
          <label className={labelCls}>Ville</label>
          <input
            type="text"
            value={form.ville}
            onChange={(e) => onChange('ville', e.target.value)}
            className={inputCls}
            placeholder="Bruxelles"
          />
        </div>
      </div>

      {/* Pays */}
      <div>
        <label className={labelCls}>Pays</label>
        <input
          type="text"
          value={form.pays}
          onChange={(e) => onChange('pays', e.target.value)}
          className={inputCls}
          placeholder="Belgique"
        />
      </div>

      {/* Téléphone */}
      <div>
        <label className={labelCls}>Téléphone</label>
        <input
          type="tel"
          value={form.telephone}
          onChange={(e) => onChange('telephone', e.target.value)}
          className={inputCls}
          placeholder="+32 2 000 00 00"
        />
      </div>

      {/* Email */}
      <div>
        <label className={labelCls}>Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => onChange('email', e.target.value)}
          className={inputCls}
          placeholder="contact@entreprise.be"
        />
      </div>

      {/* Site web */}
      <div>
        <label className={labelCls}>Site web</label>
        <input
          type="url"
          value={form.siteWeb}
          onChange={(e) => onChange('siteWeb', e.target.value)}
          className={inputCls}
          placeholder="https://www.entreprise.be"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// CreateEntrepriseModal
// ---------------------------------------------------------------------------

interface CreateEntrepriseModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (entreprise: Entreprise) => void
}

function CreateEntrepriseModal({
  isOpen,
  onClose,
  onCreated,
}: CreateEntrepriseModalProps) {
  const [form, setForm] = useState<EntrepriseFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const handleClose = () => {
    setForm(EMPTY_FORM)
    onClose()
  }

  const handleChange = (field: keyof EntrepriseFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/crm/entreprises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          adresse: form.adresse || null,
          codePostal: form.codePostal || null,
          ville: form.ville || null,
          pays: form.pays || null,
          telephone: form.telephone || null,
          email: form.email || null,
          siteWeb: form.siteWeb || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la création')
      }

      const created: Entreprise = await res.json()
      onCreated(created)
      handleClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BuildingOffice2Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Nouvelle entreprise
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <EntrepriseForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={handleClose}
          saving={saving}
          submitLabel="Créer l'entreprise"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditEntrepriseModal
// ---------------------------------------------------------------------------

interface EditEntrepriseModalProps {
  entreprise: Entreprise | null
  isOpen: boolean
  onClose: () => void
  onUpdated: (entreprise: Entreprise) => void
}

function EditEntrepriseModal({
  entreprise,
  isOpen,
  onClose,
  onUpdated,
}: EditEntrepriseModalProps) {
  const [form, setForm] = useState<EntrepriseFormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (entreprise) {
      setForm({
        nom: entreprise.nom,
        type: entreprise.type,
        adresse: entreprise.adresse || '',
        codePostal: entreprise.codePostal || '',
        ville: entreprise.ville || '',
        pays: entreprise.pays || 'Belgique',
        telephone: entreprise.telephone || '',
        email: entreprise.email || '',
        siteWeb: entreprise.siteWeb || '',
      })
    }
  }, [entreprise])

  const handleClose = () => {
    onClose()
  }

  const handleChange = (field: keyof EntrepriseFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!entreprise) return
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/entreprises/${entreprise.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          adresse: form.adresse || null,
          codePostal: form.codePostal || null,
          ville: form.ville || null,
          pays: form.pays || null,
          telephone: form.telephone || null,
          email: form.email || null,
          siteWeb: form.siteWeb || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la mise à jour')
      }

      const updated: Entreprise = await res.json()
      onUpdated(updated)
      handleClose()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur inattendue')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !entreprise) return null

  return (
    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PencilSquareIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Modifier l&apos;entreprise
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <EntrepriseForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onClose={handleClose}
          saving={saving}
          submitLabel="Enregistrer"
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DeleteModal
// ---------------------------------------------------------------------------

interface DeleteModalState {
  isOpen: boolean
  entreprise: Entreprise | null
  isDeleting: boolean
}

function DeleteModal({
  state,
  onClose,
  onConfirm,
}: {
  state: DeleteModalState
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  if (!state.isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Confirmer la suppression
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-300">
          Êtes-vous sûr de vouloir supprimer l&apos;entreprise &ldquo;
          {state.entreprise?.nom}&rdquo; ? Cette action est irréversible.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={state.isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={state.isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-700 hover:bg-red-700 dark:hover:bg-red-800 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50"
          >
            {state.isDeleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CrmPage() {
  const { data: session } = useSession()
  const { showNotification, NotificationComponent } = useNotification()

  // Data
  const [entreprises, setEntreprises] = useState<Entreprise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('TOUS')

  // Modals
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState<{ isOpen: boolean; entreprise: Entreprise | null }>({
    isOpen: false,
    entreprise: null,
  })
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({
    isOpen: false,
    entreprise: null,
    isDeleting: false,
  })

  // Import
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return

    fetch('/api/crm/entreprises')
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!res.ok) {
          throw new Error(json?.error || 'Erreur API CRM')
        }
        const arr = Array.isArray(json)
          ? json
          : Array.isArray(json?.data)
          ? json.data
          : []
        setEntreprises(arr as Entreprise[])
        setLoading(false)
      })
      .catch(() => {
        setError('Erreur lors du chargement des prospects')
        setLoading(false)
      })
  }, [session])

  // ---------------------------------------------------------------------------
  // Overdue reminders banner (computed client-side)
  // ---------------------------------------------------------------------------

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // We count rappels with count > 0 as a proxy; the API includes _count.rappels
  // which is the EN_ATTENTE count. For overdue detection we rely on a separate
  // field if the API provides it, otherwise we show a banner if total EN_ATTENTE > 0.
  const totalRappelsEnAttente = useMemo(
    () => entreprises.reduce((sum, e) => sum + (e._count?.rappels || 0), 0),
    [entreprises]
  )

  // ---------------------------------------------------------------------------
  // Filtered list
  // ---------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return entreprises.filter((e) => {
      if (typeFilter !== 'TOUS' && e.type !== typeFilter) return false
      if (!q) return true
      return (
        e.nom.toLowerCase().includes(q) ||
        (e.ville || '').toLowerCase().includes(q) ||
        (e.email || '').toLowerCase().includes(q)
      )
    })
  }, [entreprises, search, typeFilter])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleCreated = (entreprise: Entreprise) => {
    setEntreprises((prev) => [entreprise, ...prev])
    showNotification('Succès', `Entreprise "${entreprise.nom}" créée`, 'success')
  }

  const handleUpdated = (entreprise: Entreprise) => {
    setEntreprises((prev) =>
      prev.map((e) => (e.id === entreprise.id ? entreprise : e))
    )
    showNotification('Succès', `Entreprise "${entreprise.nom}" mise à jour`, 'success')
  }

  const openEdit = (entreprise: Entreprise) => {
    setEditModal({ isOpen: true, entreprise })
  }

  const openDelete = (entreprise: Entreprise) => {
    setDeleteModal({ isOpen: true, entreprise, isDeleting: false })
  }

  const handleDelete = async () => {
    if (!deleteModal.entreprise) return
    setDeleteModal((prev) => ({ ...prev, isDeleting: true }))
    try {
      const res = await fetch(`/api/crm/entreprises/${deleteModal.entreprise.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la suppression')
      }
      setEntreprises((prev) =>
        prev.filter((e) => e.id !== deleteModal.entreprise?.id)
      )
      showNotification('Succès', 'Entreprise supprimée', 'success')
      setDeleteModal({ isOpen: false, entreprise: null, isDeleting: false })
    } catch (err) {
      showNotification(
        'Erreur',
        err instanceof Error ? err.message : 'Erreur lors de la suppression',
        'error'
      )
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }))
    }
  }

  // ---------------------------------------------------------------------------
  // Export Excel
  // ---------------------------------------------------------------------------

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/crm/export')
      if (!res.ok) {
        throw new Error('Erreur lors de l\'export')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename[^;=\n]*=([^;\n]*)/)
      a.download = match ? match[1].replace(/['"]/g, '') : 'crm_prospects.xlsx'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      showNotification(
        'Erreur',
        err instanceof Error ? err.message : 'Erreur lors de l\'export',
        'error'
      )
    } finally {
      setExporting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Import Excel
  // ---------------------------------------------------------------------------

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/crm/import', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(json?.error || 'Erreur lors de l\'import')
      }

      const created = json?.created ?? 0
      const updated = json?.updated ?? 0
      showNotification(
        'Import terminé',
        `${created} entreprise${created !== 1 ? 's' : ''} créée${created !== 1 ? 's' : ''}, ${updated} mise${updated !== 1 ? 's' : ''} à jour`,
        'success'
      )

      // Reload the list
      const listRes = await fetch('/api/crm/entreprises')
      const listJson = await listRes.json().catch(() => null)
      if (listRes.ok) {
        const arr = Array.isArray(listJson)
          ? listJson
          : Array.isArray(listJson?.data)
          ? listJson.data
          : []
        setEntreprises(arr as Entreprise[])
      }
    } catch (err) {
      showNotification(
        'Erreur',
        err instanceof Error ? err.message : 'Erreur lors de l\'import',
        'error'
      )
    } finally {
      setImporting(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const statsCards = (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BuildingOffice2Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Prospects</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{entreprises.length}</div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Contacts</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">
              {entreprises.reduce((s, e) => s + (e._count?.contacts || 0), 0)}
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-200/50 dark:border-gray-700/50 shadow-md">
        <div className="flex items-center gap-2">
          <BellAlertIcon className="h-4 w-4 text-orange-500 dark:text-orange-400" />
          <div>
            <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400">Rappels</div>
            <div className="text-sm font-bold text-gray-900 dark:text-white">{totalRappelsEnAttente}</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <NotificationComponent />

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Page header */}
      <PageHeader
        title="CRM Prospects"
        subtitle="Gestion des prospects commerciaux"
        icon={BuildingOffice2Icon}
        badgeColor="from-blue-600 via-indigo-600 to-purple-700"
        gradientColor="from-blue-600/10 via-indigo-600/10 to-purple-700/10"
        stats={statsCards}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setCreateModal(true)}
              className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-semibold"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Nouvelle entreprise</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{exporting ? 'Export...' : 'Exporter Excel'}</span>
              <span className="sm:hidden">Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="inline-flex items-center px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">{importing ? 'Import...' : 'Importer Excel'}</span>
              <span className="sm:hidden">Import</span>
            </button>
          </div>
        }
      />

      {/* Main content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Overdue reminders banner */}
        {totalRappelsEnAttente > 0 && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl px-4 py-3 text-yellow-800 dark:text-yellow-300">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">
              {totalRappelsEnAttente} rappel{totalRappelsEnAttente !== 1 ? 's' : ''} en attente
            </span>
          </div>
        )}

        {/* Action bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <SearchInput
              id="search-crm"
              placeholder="Rechercher (nom, ville, email)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Type filter tabs */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-sm flex-shrink-0">
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`px-3 py-2 font-medium transition-colors ${
                  typeFilter === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <BuildingOffice2Icon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                Aucun prospect
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {search || typeFilter !== 'TOUS'
                  ? 'Aucun résultat pour ces critères de recherche.'
                  : 'Commencez par créer un nouveau prospect.'}
              </p>
              {!search && typeFilter === 'TOUS' && (
                <div className="mt-6">
                  <button
                    onClick={() => setCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Nouvelle entreprise
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">
                      Nom
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Type
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Ville
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Téléphone
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Email
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Contacts
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-center text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Rappels
                    </th>
                    <th scope="col" className="py-3.5 px-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200 pr-4 sm:pr-6">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {filtered.map((entreprise) => (
                    <tr
                      key={entreprise.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      {/* Nom */}
                      <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6 max-w-[200px]">
                        <span className="truncate block" title={entreprise.nom}>
                          {entreprise.nom}
                        </span>
                      </td>

                      {/* Type */}
                      <td className="py-4 px-3 text-sm whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_BADGE_CLASSES[entreprise.type]}`}
                        >
                          {TYPE_LABELS[entreprise.type]}
                        </span>
                      </td>

                      {/* Ville */}
                      <td className="py-4 px-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {entreprise.ville || (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </td>

                      {/* Téléphone */}
                      <td className="py-4 px-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {entreprise.telephone ? (
                          <a
                            href={`tel:${entreprise.telephone}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            {entreprise.telephone}
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </td>

                      {/* Email */}
                      <td className="py-4 px-3 text-sm text-gray-600 dark:text-gray-300 max-w-[180px]">
                        {entreprise.email ? (
                          <a
                            href={`mailto:${entreprise.email}`}
                            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
                            title={entreprise.email}
                          >
                            {entreprise.email}
                          </a>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic">—</span>
                        )}
                      </td>

                      {/* Contacts count */}
                      <td className="py-4 px-3 text-sm text-center">
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                          {entreprise._count?.contacts ?? 0}
                        </span>
                      </td>

                      {/* Rappels count */}
                      <td className="py-4 px-3 text-sm text-center">
                        {(entreprise._count?.rappels ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300">
                            {entreprise._count.rappels}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            0
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-3 text-sm text-right pr-4 sm:pr-6">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <Link
                            href={`/crm/${entreprise.id}`}
                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                            title="Voir le détail"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Link>

                          {/* Edit */}
                          <button
                            onClick={() => openEdit(entreprise)}
                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Modifier"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => openDelete(entreprise)}
                            className="p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20 text-xs text-gray-500 dark:text-gray-400">
                {filtered.length} prospect{filtered.length !== 1 ? 's' : ''}
                {filtered.length !== entreprises.length && (
                  <span> sur {entreprises.length}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateEntrepriseModal
        isOpen={createModal}
        onClose={() => setCreateModal(false)}
        onCreated={handleCreated}
      />

      <EditEntrepriseModal
        isOpen={editModal.isOpen}
        entreprise={editModal.entreprise}
        onClose={() => setEditModal({ isOpen: false, entreprise: null })}
        onUpdated={handleUpdated}
      />

      <DeleteModal
        state={deleteModal}
        onClose={() => setDeleteModal({ isOpen: false, entreprise: null, isDeleting: false })}
        onConfirm={handleDelete}
      />
    </div>
  )
}

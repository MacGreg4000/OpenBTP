'use client'
import { useState, useEffect, useCallback, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  BuildingOffice2Icon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  CalendarIcon,
  DocumentTextIcon,
  EllipsisHorizontalCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  UserGroupIcon,
  BellAlertIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { useNotification } from '@/hooks/useNotification'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TypeEntreprise = 'ENTREPRISE_GENERALE' | 'ARCHITECTE' | 'CLIENT_DIRECT' | 'AUTRE'
type TypeActivite = 'APPEL' | 'EMAIL' | 'RDV' | 'NOTE' | 'AUTRE'

interface Contact {
  id: string
  prenom: string
  nom: string
  role: string | null
  telephone: string | null
  mobile: string | null
  email: string | null
  notes: string | null
}

interface Activite {
  id: string
  type: TypeActivite
  description: string
  date: string
  createur: { name: string | null } | null
}

interface Rappel {
  id: string
  titre: string
  description: string | null
  dateRappel: string
  statut: string
}

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
  notes: string | null
  contacts: Contact[]
  rappels: Rappel[]
  activites: Activite[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<TypeEntreprise, string> = {
  ENTREPRISE_GENERALE: 'Entreprise Générale',
  ARCHITECTE: 'Architecte',
  CLIENT_DIRECT: 'Client Direct',
  AUTRE: 'Autre',
}

const TYPE_BADGE_CLASSES: Record<TypeEntreprise, string> = {
  ENTREPRISE_GENERALE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  ARCHITECTE: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300',
  CLIENT_DIRECT: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  AUTRE: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
}

const ACTIVITE_LABELS: Record<TypeActivite, string> = {
  APPEL: 'Appel',
  EMAIL: 'Email',
  RDV: 'Rendez-vous',
  NOTE: 'Note',
  AUTRE: 'Autre',
}

// ---------------------------------------------------------------------------
// Shared input styles
// ---------------------------------------------------------------------------

const inputCls =
  'block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 px-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors'
const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'

// ---------------------------------------------------------------------------
// Activity icon helper
// ---------------------------------------------------------------------------

function ActiviteIcon({ type, size = 'h-4 w-4' }: { type: TypeActivite; size?: string }) {
  switch (type) {
    case 'APPEL':
      return <PhoneIcon className={`${size} text-green-500`} />
    case 'EMAIL':
      return <EnvelopeIcon className={`${size} text-blue-500`} />
    case 'RDV':
      return <CalendarIcon className={`${size} text-purple-500`} />
    case 'NOTE':
      return <DocumentTextIcon className={`${size} text-gray-500`} />
    case 'AUTRE':
      return <EllipsisHorizontalCircleIcon className={`${size} text-gray-400`} />
  }
}

function activiteDotColor(type: TypeActivite): string {
  switch (type) {
    case 'APPEL': return 'bg-green-500'
    case 'EMAIL': return 'bg-blue-500'
    case 'RDV': return 'bg-purple-500'
    case 'NOTE': return 'bg-gray-400'
    case 'AUTRE': return 'bg-gray-400'
  }
}

// ---------------------------------------------------------------------------
// EditEntrepriseModal
// ---------------------------------------------------------------------------

interface EditEntrepriseModalProps {
  entreprise: Entreprise
  isOpen: boolean
  onClose: () => void
  onUpdated: (updated: Entreprise) => void
  showNotification: (title: string, message: string, type: 'success' | 'error') => void
}

function EditEntrepriseModal({ entreprise, isOpen, onClose, onUpdated, showNotification }: EditEntrepriseModalProps) {
  const [form, setForm] = useState({
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
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, entreprise])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      const updated = await res.json()
      onUpdated({ ...entreprise, ...updated })
      showNotification('Succès', 'Entreprise mise à jour', 'success')
      onClose()
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
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
            <PencilSquareIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Modifier l&apos;entreprise
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Nom <span className="text-red-500">*</span></label>
            <input type="text" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as TypeEntreprise }))} className={inputCls}>
              <option value="ENTREPRISE_GENERALE">Entreprise Générale</option>
              <option value="ARCHITECTE">Architecte</option>
              <option value="CLIENT_DIRECT">Client Direct</option>
              <option value="AUTRE">Autre</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Adresse</label>
            <input type="text" value={form.adresse} onChange={e => setForm(p => ({ ...p, adresse: e.target.value }))} className={inputCls} placeholder="Rue et numéro" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Code postal</label>
              <input type="text" value={form.codePostal} onChange={e => setForm(p => ({ ...p, codePostal: e.target.value }))} className={inputCls} placeholder="1000" />
            </div>
            <div>
              <label className={labelCls}>Ville</label>
              <input type="text" value={form.ville} onChange={e => setForm(p => ({ ...p, ville: e.target.value }))} className={inputCls} placeholder="Bruxelles" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <input type="text" value={form.pays} onChange={e => setForm(p => ({ ...p, pays: e.target.value }))} className={inputCls} placeholder="Belgique" />
          </div>
          <div>
            <label className={labelCls}>Téléphone</label>
            <input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className={inputCls} placeholder="+32 2 000 00 00" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="contact@entreprise.be" />
          </div>
          <div>
            <label className={labelCls}>Site web</label>
            <input type="url" value={form.siteWeb} onChange={e => setForm(p => ({ ...p, siteWeb: e.target.value }))} className={inputCls} placeholder="https://www.entreprise.be" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreateContactModal
// ---------------------------------------------------------------------------

interface CreateContactModalProps {
  entrepriseId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (contact: Contact) => void
  showNotification: (title: string, message: string, type: 'success' | 'error') => void
}

function CreateContactModal({ entrepriseId, isOpen, onClose, onCreated, showNotification }: CreateContactModalProps) {
  const emptyForm = { prenom: '', nom: '', role: '', telephone: '', mobile: '', email: '', notes: '' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleClose = () => { setForm(emptyForm); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/entreprises/${entrepriseId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          role: form.role || null,
          telephone: form.telephone || null,
          mobile: form.mobile || null,
          email: form.email || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la création')
      }
      const created: Contact = await res.json()
      onCreated(created)
      showNotification('Succès', `Contact ${created.prenom} ${created.nom} créé`, 'success')
      handleClose()
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
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
            <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Nouveau contact
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className={inputCls} placeholder="Jean" />
            </div>
            <div>
              <label className={labelCls}>Nom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className={inputCls} placeholder="Dupont" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Fonction</label>
            <input type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls} placeholder="Directeur commercial" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Téléphone</label>
              <input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className={inputCls} placeholder="+32 2 000 00 00" />
            </div>
            <div>
              <label className={labelCls}>Mobile</label>
              <input type="tel" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className={inputCls} placeholder="+32 4 00 00 00 00" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="jean.dupont@entreprise.be" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="Notes sur ce contact…" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handleClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Créer le contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditContactModal
// ---------------------------------------------------------------------------

interface EditContactModalProps {
  entrepriseId: string
  contact: Contact | null
  isOpen: boolean
  onClose: () => void
  onUpdated: (contact: Contact) => void
  showNotification: (title: string, message: string, type: 'success' | 'error') => void
}

function EditContactModal({ entrepriseId, contact, isOpen, onClose, onUpdated, showNotification }: EditContactModalProps) {
  const [form, setForm] = useState({ prenom: '', nom: '', role: '', telephone: '', mobile: '', email: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (contact && isOpen) {
      setForm({
        prenom: contact.prenom,
        nom: contact.nom,
        role: contact.role || '',
        telephone: contact.telephone || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
        notes: contact.notes || '',
      })
    }
  }, [contact, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact) return
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/entreprises/${entrepriseId}/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: form.prenom,
          nom: form.nom,
          role: form.role || null,
          telephone: form.telephone || null,
          mobile: form.mobile || null,
          email: form.email || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la mise à jour')
      }
      const updated: Contact = await res.json()
      onUpdated(updated)
      showNotification('Succès', `Contact ${updated.prenom} ${updated.nom} mis à jour`, 'success')
      onClose()
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !contact) return null

  return (
    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-lg w-full shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <PencilSquareIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Modifier le contact
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Prénom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Nom <span className="text-red-500">*</span></label>
              <input type="text" required value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Fonction</label>
            <input type="text" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls} placeholder="Directeur commercial" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Téléphone</label>
              <input type="tel" value={form.telephone} onChange={e => setForm(p => ({ ...p, telephone: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mobile</label>
              <input type="tel" value={form.mobile} onChange={e => setForm(p => ({ ...p, mobile: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreateActiviteModal
// ---------------------------------------------------------------------------

interface CreateActiviteModalProps {
  entrepriseId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (activite: Activite) => void
  showNotification: (title: string, message: string, type: 'success' | 'error') => void
}

const ACTIVITE_TYPE_OPTIONS: { type: TypeActivite; label: string; iconColor: string; bg: string; border: string }[] = [
  { type: 'APPEL', label: 'Appel', iconColor: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-400' },
  { type: 'EMAIL', label: 'Email', iconColor: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-400' },
  { type: 'RDV', label: 'RDV', iconColor: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-400' },
  { type: 'NOTE', label: 'Note', iconColor: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-700/30', border: 'border-gray-400' },
  { type: 'AUTRE', label: 'Autre', iconColor: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-700/30', border: 'border-gray-300' },
]

function CreateActiviteModal({ entrepriseId, isOpen, onClose, onCreated, showNotification }: CreateActiviteModalProps) {
  const today = new Date().toISOString().split('T')[0]
  const emptyForm = { type: 'APPEL' as TypeActivite, description: '', date: today }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleClose = () => { setForm(emptyForm); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.description.trim()) {
      showNotification('Erreur', 'La description est requise', 'error')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/entreprises/${entrepriseId}/activites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          description: form.description,
          date: form.date,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la création')
      }
      const created: Activite = await res.json()
      onCreated(created)
      showNotification('Succès', 'Activité enregistrée', 'success')
      handleClose()
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
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
            <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Nouvelle activité
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type selector */}
          <div>
            <label className={labelCls}>Type d&apos;activité</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {ACTIVITE_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, type: opt.type }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                    form.type === opt.type
                      ? `${opt.bg} ${opt.border} ${opt.iconColor}`
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <ActiviteIcon type={opt.type} size="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={inputCls}
              placeholder="Décrivez l'activité…"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handleClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 border border-transparent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CreateRappelModal
// ---------------------------------------------------------------------------

interface CreateRappelModalProps {
  entrepriseId: string
  isOpen: boolean
  onClose: () => void
  onCreated: (rappel: Rappel) => void
  showNotification: (title: string, message: string, type: 'success' | 'error') => void
}

function CreateRappelModal({ entrepriseId, isOpen, onClose, onCreated, showNotification }: CreateRappelModalProps) {
  const emptyForm = { titre: '', dateRappel: '', description: '' }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const handleClose = () => { setForm(emptyForm); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/crm/entreprises/${entrepriseId}/rappels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: form.titre,
          dateRappel: form.dateRappel,
          description: form.description || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la création')
      }
      const created: Rappel = await res.json()
      onCreated(created)
      showNotification('Succès', 'Rappel créé', 'success')
      handleClose()
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500/75 dark:bg-gray-900/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl my-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-orange-500" />
            Nouveau rappel
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Titre <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={form.titre}
              onChange={e => setForm(p => ({ ...p, titre: e.target.value }))}
              className={inputCls}
              placeholder="Ex : Rappeler pour devis"
            />
          </div>
          <div>
            <label className={labelCls}>Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={form.dateRappel}
              onChange={e => setForm(p => ({ ...p, dateRappel: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={inputCls}
              placeholder="Détails du rappel…"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={handleClose} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 border border-transparent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Enregistrement...' : 'Créer le rappel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function CrmDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const { data: session } = useSession()
  const { showNotification, NotificationComponent } = useNotification()

  // Data
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Notes auto-save
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Modals
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateContactModal, setShowCreateContactModal] = useState(false)
  const [showCreateActiviteModal, setShowCreateActiviteModal] = useState(false)
  const [showCreateRappelModal, setShowCreateRappelModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  // ---------------------------------------------------------------------------
  // Load data
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!session) return
    fetch(`/api/crm/entreprises/${params.id}`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => null)
          throw new Error(err?.error || 'Entreprise non trouvée')
        }
        return res.json()
      })
      .then((data: Entreprise) => {
        setEntreprise(data)
        setNotes(data.notes || '')
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erreur de chargement')
        setLoading(false)
      })
  }, [session, params.id])

  // ---------------------------------------------------------------------------
  // Notes auto-save
  // ---------------------------------------------------------------------------

  const saveNotes = useCallback(async (value: string) => {
    try {
      await fetch(`/api/crm/entreprises/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: value || null }),
      })
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2500)
    } catch {
      // silent
    }
  }, [params.id])

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setNotesSaved(false)
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    notesDebounceRef.current = setTimeout(() => saveNotes(value), 1500)
  }

  const handleNotesBlur = () => {
    if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current)
    saveNotes(notes)
  }

  // ---------------------------------------------------------------------------
  // Contact handlers
  // ---------------------------------------------------------------------------

  const handleContactCreated = (contact: Contact) => {
    setEntreprise(prev => prev ? { ...prev, contacts: [...prev.contacts, contact].sort((a, b) => a.nom.localeCompare(b.nom)) } : prev)
  }

  const handleContactUpdated = (updated: Contact) => {
    setEntreprise(prev => prev ? {
      ...prev,
      contacts: prev.contacts.map(c => c.id === updated.id ? updated : c),
    } : prev)
  }

  const handleDeleteContact = async (contactId: string, contactNom: string) => {
    if (!confirm(`Supprimer le contact "${contactNom}" ? Cette action est irréversible.`)) return
    try {
      const res = await fetch(`/api/crm/entreprises/${params.id}/contacts/${contactId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la suppression')
      }
      setEntreprise(prev => prev ? { ...prev, contacts: prev.contacts.filter(c => c.id !== contactId) } : prev)
      showNotification('Succès', 'Contact supprimé', 'success')
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    }
  }

  // ---------------------------------------------------------------------------
  // Activite handlers
  // ---------------------------------------------------------------------------

  const handleActiviteCreated = (activite: Activite) => {
    setEntreprise(prev => prev ? {
      ...prev,
      activites: [activite, ...prev.activites],
    } : prev)
  }

  const handleDeleteActivite = async (activiteId: string) => {
    if (!confirm('Supprimer cette activité ?')) return
    try {
      const res = await fetch(`/api/crm/entreprises/${params.id}/activites/${activiteId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la suppression')
      }
      setEntreprise(prev => prev ? { ...prev, activites: prev.activites.filter(a => a.id !== activiteId) } : prev)
      showNotification('Succès', 'Activité supprimée', 'success')
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    }
  }

  // ---------------------------------------------------------------------------
  // Rappel handlers
  // ---------------------------------------------------------------------------

  const handleRappelCreated = (rappel: Rappel) => {
    setEntreprise(prev => prev ? {
      ...prev,
      rappels: [...prev.rappels, rappel].sort((a, b) => new Date(a.dateRappel).getTime() - new Date(b.dateRappel).getTime()),
    } : prev)
  }

  const handleMarquerFait = async (rappelId: string) => {
    try {
      const res = await fetch(`/api/crm/entreprises/${params.id}/rappels/${rappelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'FAIT' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la mise à jour')
      }
      setEntreprise(prev => prev ? { ...prev, rappels: prev.rappels.filter(r => r.id !== rappelId) } : prev)
      showNotification('Succès', 'Rappel marqué comme fait', 'success')
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    }
  }

  const handleDeleteRappel = async (rappelId: string) => {
    if (!confirm('Supprimer ce rappel ?')) return
    try {
      const res = await fetch(`/api/crm/entreprises/${params.id}/rappels/${rappelId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Erreur lors de la suppression')
      }
      setEntreprise(prev => prev ? { ...prev, rappels: prev.rappels.filter(r => r.id !== rappelId) } : prev)
      showNotification('Succès', 'Rappel supprimé', 'success')
    } catch (err) {
      showNotification('Erreur', err instanceof Error ? err.message : 'Erreur inattendue', 'error')
    }
  }

  // ---------------------------------------------------------------------------
  // Entreprise updated
  // ---------------------------------------------------------------------------

  const handleEntrepriseUpdated = (updated: Entreprise) => {
    setEntreprise(prev => prev ? { ...prev, ...updated } : updated)
  }

  // ---------------------------------------------------------------------------
  // Loading / Error
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error || !entreprise) {
    return (
      <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400">
        {error || 'Entreprise non trouvée'}
      </div>
    )
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <NotificationComponent />

      {/* Modals */}
      <EditEntrepriseModal
        entreprise={entreprise}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdated={handleEntrepriseUpdated}
        showNotification={showNotification}
      />

      <CreateContactModal
        entrepriseId={params.id}
        isOpen={showCreateContactModal}
        onClose={() => setShowCreateContactModal(false)}
        onCreated={handleContactCreated}
        showNotification={showNotification}
      />

      <EditContactModal
        entrepriseId={params.id}
        contact={editingContact}
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        onUpdated={handleContactUpdated}
        showNotification={showNotification}
      />

      <CreateActiviteModal
        entrepriseId={params.id}
        isOpen={showCreateActiviteModal}
        onClose={() => setShowCreateActiviteModal(false)}
        onCreated={handleActiviteCreated}
        showNotification={showNotification}
      />

      <CreateRappelModal
        entrepriseId={params.id}
        isOpen={showCreateRappelModal}
        onClose={() => setShowCreateRappelModal(false)}
        onCreated={handleRappelCreated}
        showNotification={showNotification}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* ---------------------------------------------------------------- */}
          {/* Header                                                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="mb-6">
            <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/60 via-indigo-700/60 to-purple-800/60 dark:from-blue-600/30 dark:via-indigo-700/30 dark:to-purple-800/30 pointer-events-none" />
              <div className="relative z-10 p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: title + badges */}
                  <div className="flex flex-col gap-3">
                    {/* Back button + title */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        onClick={() => router.push('/crm')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-blue-900 dark:text-white text-sm font-medium transition-all"
                      >
                        <ArrowLeftIcon className="h-4 w-4" />
                        Retour
                      </button>
                      <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30">
                        <BuildingOffice2Icon className="w-6 h-6 mr-3 text-blue-900 dark:text-white" />
                        <h1 className="text-xl font-bold text-blue-900 dark:text-white">{entreprise.nom}</h1>
                      </div>
                    </div>
                    {/* Type badge */}
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex w-max ${TYPE_BADGE_CLASSES[entreprise.type]}`}>
                      {TYPE_LABELS[entreprise.type]}
                    </span>
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-blue-900 dark:text-white border border-white/50"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Modifier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Two-column grid                                                  */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* ============================================================ */}
            {/* LEFT COLUMN (col-span-2)                                      */}
            {/* ============================================================ */}
            <div className="lg:col-span-2 space-y-6">

              {/* ---------------------------------------------------------- */}
              {/* 1. Company info card                                        */}
              {/* ---------------------------------------------------------- */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-700 text-white rounded-full shadow-lg ring-2 ring-blue-200 dark:ring-blue-700">
                      <BuildingOffice2Icon className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">Informations</span>
                    </div>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {/* Address */}
                  {(entreprise.adresse || entreprise.codePostal || entreprise.ville) && (
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {entreprise.adresse && <div>{entreprise.adresse}</div>}
                        {(entreprise.codePostal || entreprise.ville) && (
                          <div>{[entreprise.codePostal, entreprise.ville].filter(Boolean).join(' ')}</div>
                        )}
                        {entreprise.pays && <div className="text-gray-500 dark:text-gray-400">{entreprise.pays}</div>}
                      </div>
                    </div>
                  )}

                  {/* Telephone */}
                  {entreprise.telephone && (
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <a href={`tel:${entreprise.telephone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {entreprise.telephone}
                      </a>
                    </div>
                  )}

                  {/* Email */}
                  {entreprise.email && (
                    <div className="flex items-center gap-3">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <a href={`mailto:${entreprise.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {entreprise.email}
                      </a>
                    </div>
                  )}

                  {/* Site web */}
                  {entreprise.siteWeb && (
                    <div className="flex items-center gap-3">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <a href={entreprise.siteWeb} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline truncate">
                        {entreprise.siteWeb}
                      </a>
                    </div>
                  )}

                  {/* Empty state */}
                  {!entreprise.adresse && !entreprise.telephone && !entreprise.email && !entreprise.siteWeb && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                      Aucune information de contact renseignée. Cliquez sur le crayon pour les ajouter.
                    </p>
                  )}
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* 2. Contacts section                                         */}
              {/* ---------------------------------------------------------- */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full shadow-lg ring-2 ring-violet-200 dark:ring-violet-700">
                      <UserGroupIcon className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">
                        Contacts
                        {entreprise.contacts.length > 0 && (
                          <span className="ml-2 text-violet-100 font-normal text-sm">({entreprise.contacts.length})</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowCreateContactModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {entreprise.contacts.length === 0 ? (
                    <div className="text-center py-8">
                      <UserGroupIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Aucun contact pour ce prospect.</p>
                      <button
                        onClick={() => setShowCreateContactModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Ajouter un contact
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entreprise.contacts.map(contact => (
                        <div key={contact.id} className="flex items-start justify-between p-4 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-700 transition-colors bg-gray-50/50 dark:bg-gray-700/20">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {contact.prenom} {contact.nom}
                            </div>
                            {contact.role && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{contact.role}</div>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                              {contact.telephone && (
                                <a href={`tel:${contact.telephone}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <PhoneIcon className="h-3 w-3" />
                                  {contact.telephone}
                                </a>
                              )}
                              {contact.mobile && (
                                <a href={`tel:${contact.mobile}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <PhoneIcon className="h-3 w-3" />
                                  {contact.mobile}
                                  <span className="text-gray-400">(mob.)</span>
                                </a>
                              )}
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <EnvelopeIcon className="h-3 w-3" />
                                  {contact.email}
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                            <button
                              onClick={() => setEditingContact(contact)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/30 transition-colors"
                              title="Modifier"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContact(contact.id, `${contact.prenom} ${contact.nom}`)}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                              title="Supprimer"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* 3. Journal d'activité                                       */}
              {/* ---------------------------------------------------------- */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-slate-500 via-gray-600 to-gray-700 text-white rounded-full shadow-lg ring-2 ring-gray-200 dark:ring-gray-700">
                      <ClockIcon className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">Journal d&apos;activité</span>
                    </div>
                    <button
                      onClick={() => setShowCreateActiviteModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-700 dark:bg-gray-600 text-white hover:bg-gray-800 dark:hover:bg-gray-500 transition-colors shadow-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {entreprise.activites.length === 0 ? (
                    <div className="text-center py-8">
                      <ClockIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Aucune activité enregistrée.</p>
                      <button
                        onClick={() => setShowCreateActiviteModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Ajouter une activité
                      </button>
                    </div>
                  ) : (
                    <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3">
                      {entreprise.activites.map((activite, idx) => {
                        const dateObj = new Date(activite.date)
                        const dateStr = format(dateObj, 'dd/MM/yyyy', { locale: fr })
                        return (
                          <li key={activite.id} className={`ml-6 ${idx < entreprise.activites.length - 1 ? 'pb-6' : ''}`}>
                            {/* Timeline dot */}
                            <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800 ${activiteDotColor(activite.type)}`}>
                              <ActiviteIcon type={activite.type} size="h-3 w-3 text-white" />
                            </span>

                            <div className="group flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                {/* Type + date */}
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                                    {ACTIVITE_LABELS[activite.type]}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{dateStr}</span>
                                </div>
                                {/* Description */}
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line">{activite.description}</p>
                                {/* Author */}
                                {activite.createur?.name && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">par {activite.createur.name}</p>
                                )}
                              </div>
                              {/* Delete */}
                              <button
                                onClick={() => handleDeleteActivite(activite.id)}
                                className="p-1.5 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                                title="Supprimer"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT COLUMN (col-span-1)                                     */}
            {/* ============================================================ */}
            <div className="space-y-6">

              {/* ---------------------------------------------------------- */}
              {/* 4. Notes libres                                             */}
              {/* ---------------------------------------------------------- */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg ring-2 ring-amber-200 dark:ring-amber-700">
                      <DocumentTextIcon className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">Notes</span>
                    </div>
                    {notesSaved && (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium animate-pulse">
                        <CheckCircleIcon className="h-3.5 w-3.5" />
                        Sauvegardé
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6">
                  <textarea
                    rows={10}
                    value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Notes libres sur ce prospect…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-200 dark:focus:border-amber-400 dark:focus:ring-amber-800 transition-colors resize-y"
                  />
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Sauvegarde automatique 1,5 s après la dernière frappe ou à la sortie du champ.
                  </p>
                </div>
              </div>

              {/* ---------------------------------------------------------- */}
              {/* 5. Rappels                                                  */}
              {/* ---------------------------------------------------------- */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg ring-2 ring-orange-200 dark:ring-orange-700">
                      <BellAlertIcon className="w-5 h-5 mr-2" />
                      <span className="font-bold text-lg">
                        Rappels
                        {entreprise.rappels.length > 0 && (
                          <span className="ml-2 text-orange-100 font-normal text-sm">({entreprise.rappels.length})</span>
                        )}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowCreateRappelModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors shadow-sm"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Ajouter
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {entreprise.rappels.length === 0 ? (
                    <div className="text-center py-8">
                      <BellAlertIcon className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-sm text-gray-400 dark:text-gray-500">Aucun rappel en attente.</p>
                      <button
                        onClick={() => setShowCreateRappelModal(true)}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Créer un rappel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {entreprise.rappels.map(rappel => {
                        const dateRappel = new Date(rappel.dateRappel)
                        dateRappel.setHours(0, 0, 0, 0)
                        const isOverdue = dateRappel < today
                        const dateStr = format(dateRappel, 'dd/MM/yyyy', { locale: fr })

                        return (
                          <div
                            key={rappel.id}
                            className={`p-4 rounded-lg border transition-colors ${
                              isOverdue
                                ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                                : 'border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {/* Title + overdue badge */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{rappel.titre}</span>
                                  {isOverdue && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                                      En retard
                                    </span>
                                  )}
                                </div>
                                {/* Date */}
                                <div className={`text-xs mt-1 ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {dateStr}
                                </div>
                                {/* Description */}
                                {rappel.description && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{rappel.description}</p>
                                )}
                              </div>
                              {/* Actions */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleDeleteRappel(rappel.id)}
                                  className="p-1.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                  title="Supprimer"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Marquer fait */}
                            <div className="mt-3">
                              <button
                                onClick={() => handleMarquerFait(rappel.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Marquer fait
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

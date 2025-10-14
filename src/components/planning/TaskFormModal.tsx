'use client'

import { useEffect, useState } from 'react'

export type TaskStatus = 'PREVU'|'EN_COURS'|'TERMINE'

export interface TaskFormValues {
  id?: string
  title: string
  description?: string
  start: string
  end: string
  status: TaskStatus
  chantierId?: string
  savTicketId?: string
  ouvrierInterneIds: string[]
  soustraitantIds: string[]
}

interface ResourceItem { id: string; title: string }
interface ChantierItem { chantierId: string; nomChantier: string; statut?: string }
interface TicketItem { id: string; numTicket: string; titre: string }

export default function TaskFormModal({
  open,
  onClose,
  initial,
  onSaved
}: {
  open: boolean
  onClose: () => void
  initial?: Partial<TaskFormValues> & { segment?: 'FULL'|'AM'|'PM' }
  onSaved?: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ouvriers, setOuvriers] = useState<ResourceItem[]>([])
  const [soustraitants, setSoustraitants] = useState<ResourceItem[]>([])
  const [chantiers, setChantiers] = useState<ChantierItem[]>([])
  const [tickets, setTickets] = useState<TicketItem[]>([])

  const [values, setValues] = useState<TaskFormValues>(() => ({
    title: initial?.title || '',
    description: initial?.description || '',
    start: initial?.start || new Date().toISOString(),
    end: initial?.end || new Date(Date.now() + 60*60*1000).toISOString(),
    status: (initial?.status as TaskStatus) || 'PREVU',
    chantierId: initial?.chantierId,
    savTicketId: initial?.savTicketId,
    ouvrierInterneIds: initial?.ouvrierInterneIds || [],
    soustraitantIds: initial?.soustraitantIds || []
  }))
  const [segment, setSegment] = useState<'FULL'|'AM'|'PM'>('FULL')
  const [boundTitleFromChantier, setBoundTitleFromChantier] = useState<string>('')
  const [day, setDay] = useState<string>(() => {
    const d = initial?.start ? new Date(initial.start) : new Date()
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10)
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [durationDays, setDurationDays] = useState<number>(1)

  // Appliquer le segment initial si fourni (ex: clic AM/PM)
  useEffect(() => {
    if (open && initial?.segment) {
      setSegment(initial.segment)
    }
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    const loadRefs = async () => {
      try {
        const [ouvRes, stRes, chRes, savRes] = await Promise.all([
          fetch('/api/ouvriers-internes'),
          fetch('/api/soustraitants'),
          fetch('/api/chantiers'),
          fetch('/api/sav?page=1&pageSize=50')
        ])
        const ouv = ouvRes.ok ? await ouvRes.json() : []
        const sts = stRes.ok ? await stRes.json() : []
        const chJ = chRes.ok ? await chRes.json() : []
        const chList = Array.isArray(chJ) ? chJ : chJ.data
        const savJ = savRes.ok ? await savRes.json() : []
        const savList = Array.isArray(savJ) ? savJ : savJ.data
        setOuvriers(ouv.map((o: { id: string; prenom?: string; nom: string }) => ({ id: o.id, title: `${o.prenom || ''} ${o.nom}`.trim() })))
        setSoustraitants(sts.map((s: { id: string; nom: string }) => ({ id: s.id, title: s.nom })))
        setChantiers((chList || []).filter((c: { etatChantier?: string }) => c.etatChantier === 'En cours'))
        setTickets((savList || []).map((t: { id: string; numTicket: string; titre: string }) => ({ id: t.id, numTicket: t.numTicket, titre: t.titre })))
      } catch {
        // noop
      }
    }
    loadRefs()
  }, [open])

  const handleChange = (field: keyof TaskFormValues, value: string | string[] | undefined) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Appliquer le segment (Journée/AM/PM) si choisi
      const base = new Date(day + 'T00:00:00')
      const computeSegment = (seg: 'FULL'|'AM'|'PM') => {
        const s = new Date(base); const e = new Date(base)
        if (seg === 'FULL') { s.setHours(7,30,0,0); e.setHours(16,30,0,0) }
        if (seg === 'AM') { s.setHours(7,30,0,0); e.setHours(12,0,0,0) }
        if (seg === 'PM') { s.setHours(13,0,0,0); e.setHours(16,30,0,0) }
        return { s, e }
      }
      const { s, e } = computeSegment(segment)

      const payload: Record<string, unknown> = {
        title: values.title,
        description: values.description,
        start: s.toISOString(),
        end: e.toISOString(),
        status: values.status || 'PREVU',
        chantierId: values.chantierId || null,
        savTicketId: values.savTicketId || null,
        ouvrierInterneIds: values.ouvrierInterneIds,
        soustraitantIds: values.soustraitantIds,
      }
      let created: { id?: string } | null = null
      if (initial?.id) {
        const res = await fetch(`/api/planning/ressources/tasks/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        if (!res.ok) throw new Error('Erreur de mise à jour')
        created = await res.json()
      } else {
        // Créer sur plusieurs jours (lundi→samedi uniquement)
        const promises: Promise<Response>[] = []
        const toCreate: Record<string, unknown>[] = []
        const d = new Date(day + 'T00:00:00')
        for (let i=0;i<durationDays;i++) {
          const dow = d.getDay() // 0=dimanche
          if (dow !== 0) {
            const { s:sd, e:ed } = computeSegment(segment)
            sd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
            ed.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
            toCreate.push({ ...payload, start: sd.toISOString(), end: ed.toISOString() })
          }
          d.setDate(d.getDate()+1)
        }
        for (const p of toCreate) {
          promises.push(fetch('/api/planning/ressources/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }))
        }
        const results = await Promise.all(promises)
        if (results.some(r=>!r.ok)) throw new Error('Erreur de création multi-jours')
        created = await results[0].json()
      }
      // Upload pièces jointes en file d'attente s'il y en a
      if (pendingFiles.length && created?.id) {
        for (const f of pendingFiles) {
          const fd = new FormData()
          fd.append('file', f)
          await fetch(`/api/planning/ressources/tasks/${created.id}/attachments`, { method: 'POST', body: fd })
        }
      }
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicateNextWeek = async () => {
    setLoading(true)
    setError(null)
    try {
      // Prépare duplication semaine +7 en gardant segment/durée (lu→sa)
      const base = new Date(day + 'T00:00:00')
      const computeSegment = (seg: 'FULL'|'AM'|'PM') => {
        const s = new Date(base); const e = new Date(base)
        if (seg === 'FULL') { s.setHours(7,30,0,0); e.setHours(16,30,0,0) }
        if (seg === 'AM') { s.setHours(7,30,0,0); e.setHours(12,0,0,0) }
        if (seg === 'PM') { s.setHours(13,0,0,0); e.setHours(16,30,0,0) }
        return { s, e }
      }
      const { s, e } = computeSegment(segment)
      const payloadBase: Record<string, unknown> = {
        title: values.title || 'Tâche',
        description: values.description,
        status: values.status || 'PREVU',
        chantierId: values.chantierId || null,
        savTicketId: values.savTicketId || null,
        ouvrierInterneIds: values.ouvrierInterneIds,
        soustraitantIds: values.soustraitantIds,
      }
      const toCreate: Record<string, unknown>[] = []
      const d = new Date(base)
      d.setDate(d.getDate() + 7) // semaine suivante
      for (let i=0;i<durationDays;i++) {
        const dow = d.getDay()
        if (dow !== 0) {
          const sd = new Date(s); const ed = new Date(e)
          sd.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
          ed.setFullYear(d.getFullYear(), d.getMonth(), d.getDate())
          toCreate.push({ ...payloadBase, start: sd.toISOString(), end: ed.toISOString() })
        }
        d.setDate(d.getDate()+1)
      }
      const results = await Promise.all(
        toCreate.map(p => fetch('/api/planning/ressources/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }))
      )
      if (results.some(r=>!r.ok)) throw new Error('Erreur lors de la duplication')
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      {/* Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{initial?.id ? 'Modifier une tâche' : 'Nouvelle tâche'}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">✕</button>
          </div>
          {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        </div>
        {/* Content (scrollable) */}
        <form id="taskForm" onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section: Infos principales */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Titre *</label>
                <input className="w-full p-2 text-sm border rounded" value={values.title} onChange={e=>handleChange('title', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm mb-1">Chantier (en cours)</label>
                <select
                  className="w-full p-2 text-sm border rounded"
                  value={values.chantierId || ''}
                  onChange={e=>{
                    const val = e.target.value || ''
                    const sel = chantiers.find(c=> c.chantierId===val)
                    handleChange('chantierId', val || undefined)
                    if (sel) {
                      if (!values.title || values.title === boundTitleFromChantier) {
                        handleChange('title', sel.nomChantier)
                        setBoundTitleFromChantier(sel.nomChantier)
                      } else {
                        setBoundTitleFromChantier(sel.nomChantier)
                      }
                    }
                  }}
                >
                  <option value="">—</option>
                  {chantiers.map(c=> <option key={c.chantierId} value={c.chantierId}>{c.nomChantier}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Date *</label>
                <input type="date" className="w-full p-2 text-sm border rounded" value={day} onChange={e=>setDay(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Créneau</label>
                  <select className="w-full p-2 text-sm border rounded" value={segment} onChange={e=>setSegment(e.target.value as 'FULL'|'AM'|'PM')}>
                    <option value="FULL">Journée</option>
                    <option value="AM">Matin</option>
                    <option value="PM">Après-midi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Durée (jours, lu→sa)</label>
                  <input type="number" min={1} max={14} className="w-full p-2 text-sm border rounded" value={durationDays} onChange={e=>setDurationDays(Math.max(1, Math.min(14, Number(e.target.value)||1)))} />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea className="w-full p-2 text-sm border rounded" rows={3} value={values.description} onChange={e=>handleChange('description', e.target.value)} />
              </div>
            </div>
          </div>
          {/* Section: Assignations */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Ouvriers internes</label>
                <select multiple className="w-full p-2 text-sm border rounded h-24" value={values.ouvrierInterneIds} onChange={(e)=>{
                  const opts = Array.from(e.target.selectedOptions).map(o=>o.value); handleChange('ouvrierInterneIds', opts)
                }}>
                  {ouvriers.map(o=> <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Sous-traitants</label>
                <select multiple className="w-full p-2 text-sm border rounded h-24" value={values.soustraitantIds} onChange={(e)=>{
                  const opts = Array.from(e.target.selectedOptions).map(o=>o.value); handleChange('soustraitantIds', opts)
                }}>
                  {soustraitants.map(s=> <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Ticket SAV</label>
                <select className="w-full p-2 text-sm border rounded" value={values.savTicketId || ''} onChange={e=>handleChange('savTicketId', e.target.value || undefined)}>
                  <option value="">—</option>
                  {tickets.map(t=> <option key={t.id} value={t.id}>#{t.numTicket} — {t.titre}</option>)}
                </select>
              </div>
            </div>
          </div>
          {/* Section: Pièces jointes (repliable) */}
          <details className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <summary className="cursor-pointer text-sm font-medium">Pièces jointes</summary>
            <div className="mt-3">
              <input
                type="file"
                multiple
                onChange={async (e)=>{
                  if (!e.target.files || e.target.files.length === 0) return
                  if (initial?.id) {
                    setLoading(true)
                    try {
                      for (const f of Array.from(e.target.files)) {
                        const fd = new FormData()
                        fd.append('file', f)
                        await fetch(`/api/planning/ressources/tasks/${initial.id}/attachments`, { method: 'POST', body: fd })
                      }
                      onSaved?.()
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : 'Erreur lors de l\'upload.'
                      setError(msg)
                    } finally {
                      setLoading(false)
                    }
                    ;(e.target as HTMLInputElement).value = ''
                  } else {
                    setPendingFiles(Array.from(e.target.files))
                  }
                }}
              />
              {!initial?.id && pendingFiles.length>0 && (
                <p className="text-xs text-gray-500 mt-1">{pendingFiles.length} fichier(s) seront ajoutés après création.</p>
              )}
            </div>
          </details>
        </form>
        {/* Footer */}
        <div className="shrink-0 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:justify-end gap-2">
          <div className="flex-1 md:flex-none text-xs text-gray-500 md:text-right">{loading ? 'Traitement en cours…' : ''}</div>
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-sm">Annuler</button>
          <button type="button" onClick={handleDuplicateNextWeek} disabled={loading} className="px-4 py-2 border border-orange-500 text-orange-600 rounded text-sm hover:bg-orange-50">Dupliquer semaine suivante</button>
          <button type="submit" form="taskForm" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded text-sm">{initial?.id ? 'Enregistrer' : 'Créer'}</button>
        </div>
      </div>
    </div>
  )
}


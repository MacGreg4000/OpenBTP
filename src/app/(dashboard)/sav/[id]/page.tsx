'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  InformationCircleIcon,
  WrenchScrewdriverIcon,
  DocumentIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

type Statut = 'NOUVEAU'|'EN_ATTENTE'|'ASSIGNE'|'PLANIFIE'|'EN_COURS'|'EN_ATTENTE_PIECES'|'EN_ATTENTE_VALIDATION'|'RESOLU'|'CLOS'|'ANNULE'

interface TicketSAV {
  id: string
  numTicket: string
  titre: string
  statut: Statut
  description?: string
  localisation?: string
  adresseIntervention?: string
  ouvrierInterneAssign?: { id?: string; prenom?: string; nom: string } | null
  soustraitantAssign?: { id?: string; nom: string } | null
  interventions?: Array<{ id: string; titre: string; description?: string; dateDebut: string; dateFin?: string|null }>
  documents?: Array<{ id: string; nom: string; url: string }>
  photos?: Array<{ id: string; url: string; nomOriginal?: string }>
  commentaires?: Array<{ id: string; auteur?: { name?: string }; createdAt: string; contenu: string }>
}

type TabKey = 'interventions'|'documents'|'photos'|'commentaires'|'infos'

export default function SavDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [ticket, setTicket] = useState<TicketSAV | null>(null)
  const [tab, setTab] = useState<TabKey>('infos')
  const [newComment, setNewComment] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    titre: '',
    description: '',
    localisation: '',
    adresseIntervention: '',
    contactNom: '',
    contactTelephone: '',
    contactEmail: ''
  })
  const [ouvriers, setOuvriers] = useState<Array<{ id: string; nom: string; prenom?: string }>>([])
  const [soustraitants, setSoustraitants] = useState<Array<{ id: string; nom: string }>>([])

  const load = useCallback(async () => {
    const res = await fetch(`/api/sav/${params.id}`)
    if (res.ok) {
      const data = await res.json()
      setTicket(data)
      setForm({
        titre: data.titre || '',
        description: data.description || '',
        localisation: data.localisation || '',
        adresseIntervention: data.adresseIntervention || '',
        contactNom: data.contactNom || '',
        contactTelephone: data.contactTelephone || '',
        contactEmail: data.contactEmail || ''
      })
    }
  }, [params.id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    // Charger listes pour assignation
    ;(async ()=>{
      try {
        const [woRes, stRes] = await Promise.all([
          fetch('/api/ouvriers-internes'),
          fetch('/api/sous-traitants')
        ])
        const wo = await woRes.json().catch(()=>[])
        const st = await stRes.json().catch(()=>[])
        setOuvriers(Array.isArray(wo) ? wo : Array.isArray(wo?.data) ? wo.data : [])
        setSoustraitants(Array.isArray(st) ? st : Array.isArray(st?.data) ? st.data : [])
      } catch {}
    })()
  }, [])

  type TicketSavPatch = Partial<TicketSAV> & {
    ouvrierInterneAssignId?: string | null
    soustraitantAssignId?: string | null
    contactNom?: string
    contactTelephone?: string
    contactEmail?: string
  }

  const updateField = async (patch: TicketSavPatch) => {
    setSaving(true)
    const res = await fetch(`/api/sav/${params.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    setSaving(false)
    if (res.ok) load()
  }

  if (!ticket) return <div className="p-6">Chargement…</div>

  const onChangeForm = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 shadow">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <button 
                  onClick={() => router.push('/sav')}
                  className="inline-flex items-center text-white/90 hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-1"/>
                  Retour à la liste
                </button>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Ticket #{ticket.numTicket}</h1>
              <input
                className="mt-3 w-full px-3 py-2.5 rounded-md bg-white text-gray-900 outline-none ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-blue-200 placeholder:text-gray-500 shadow-sm"
                name="titre"
                value={form.titre}
                onChange={onChangeForm}
                placeholder="Titre du ticket"
              />
            </div>
            <div className="flex items-end gap-2">
              <select className="px-3 py-2.5 rounded-md bg-white text-gray-900 outline-none ring-1 ring-inset ring-white/20 focus:ring-2 focus:ring-blue-200 shadow-sm" value={ticket.statut} onChange={e=>updateField({ statut: e.target.value as Statut })}>
                {['NOUVEAU','EN_ATTENTE','ASSIGNE','PLANIFIE','EN_COURS','EN_ATTENTE_PIECES','EN_ATTENTE_VALIDATION','RESOLU','CLOS','ANNULE'].map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                disabled={saving}
                onClick={()=> updateField({
                  titre: form.titre,
                  description: form.description,
                  localisation: form.localisation,
                  adresseIntervention: form.adresseIntervention,
                  contactNom: form.contactNom,
                  contactTelephone: form.contactTelephone,
                  contactEmail: form.contactEmail,
                })}
                className="px-4 py-2.5 bg-white text-blue-700 rounded-md hover:bg-blue-50 disabled:opacity-60 shadow-sm"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur rounded-xl shadow border border-gray-200">
          <div className="px-4 pt-4">
            <div className="flex gap-2 overflow-auto">
              {[
                {k:'infos', label:'Infos', Icon: InformationCircleIcon},
                {k:'interventions', label:'Interventions', Icon: WrenchScrewdriverIcon},
                {k:'documents', label:'Documents', Icon: DocumentIcon},
                {k:'photos', label:'Photos', Icon: PhotoIcon},
                {k:'commentaires', label:'Commentaires', Icon: ChatBubbleLeftRightIcon},
              ].map(({k,label,Icon})=> (
                <button key={k} onClick={()=>setTab(k as TabKey)} className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm transition ${tab===k?'bg-blue-600 text-white shadow':'text-gray-700 hover:bg-gray-100'}`}>
                  <Icon className="h-4 w-4"/>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">

      {tab==='infos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Assignation interne</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded bg-white"
                  value={ticket.ouvrierInterneAssign?.id || ''}
                  onChange={async (e)=>{ await updateField({ ouvrierInterneAssignId: e.target.value || null }); }}
                >
                  <option value="">—</option>
                  {ouvriers.map(o => <option key={o.id} value={o.id}>{o.prenom?`${o.prenom} `:''}{o.nom}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Sous-traitant</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded bg-white"
                  value={ticket.soustraitantAssign?.id || ''}
                  onChange={async (e)=>{ await updateField({ soustraitantAssignId: e.target.value || null }); }}
                >
                  <option value="">—</option>
                  {soustraitants.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm mb-1">Localisation</label>
              <input name="localisation" value={form.localisation} onChange={onChangeForm} className="w-full p-2 border rounded bg-white" placeholder="Localisation" />
            </div>
            <div>
              <label className="block text-sm mb-1">Adresse d'intervention</label>
              <input name="adresseIntervention" value={form.adresseIntervention} onChange={onChangeForm} className="w-full p-2 border rounded bg-white" placeholder="Adresse" />
            </div>
            <div>
              <label className="block text-sm mb-1">Contact - Nom</label>
              <input name="contactNom" value={form.contactNom} onChange={onChangeForm} className="w-full p-2 border rounded bg-white" placeholder="Nom du contact" />
            </div>
            <div>
              <label className="block text-sm mb-1">Contact - Téléphone</label>
              <input name="contactTelephone" value={form.contactTelephone} onChange={onChangeForm} className="w-full p-2 border rounded bg-white" placeholder="Téléphone" />
            </div>
            <div>
              <label className="block text-sm mb-1">Contact - Email</label>
              <input name="contactEmail" value={form.contactEmail} onChange={onChangeForm} className="w-full p-2 border rounded bg-white" placeholder="Email" />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={onChangeForm} rows={4} className="w-full p-2 border rounded bg-white" placeholder="Description" />
          </div>
        </div>
      )}

      {tab==='interventions' && (
        <div>
          {ticket.interventions?.length === 0 ? (
            <div className="text-gray-500">Aucune intervention</div>
          ) : (
            <div className="space-y-3">
              {ticket.interventions.map((i)=>(
                <div key={i.id} className="p-3 border rounded">
                  <div className="font-medium">{i.titre}</div>
                  <div className="text-xs text-gray-500">{new Date(i.dateDebut).toLocaleString()} {i.dateFin?`→ ${new Date(i.dateFin).toLocaleString()}`:''}</div>
                  <div className="text-sm mt-1">{i.description}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-3 border rounded">
            <div className="font-medium mb-2">Ajouter une intervention</div>
            <form onSubmit={async(e)=>{
              e.preventDefault()
              const form = e.target as HTMLFormElement
              const fd = new FormData(form)
              const payload = Object.fromEntries(fd.entries()) as Record<string, string>
              const res = await fetch(`/api/sav/${params.id}/interventions`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({
                titre: payload.titre,
                description: payload.description,
                dateDebut: payload.dateDebut,
                dateFin: payload.dateFin || null,
                technicienId: payload.technicienId,
                type: payload.type || 'DIAGNOSTIC',
              }) })
              if (res.ok) load()
              form.reset()
            }}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input name="titre" required placeholder="Titre" className="p-2 border rounded" />
                <input name="technicienId" required placeholder="Technicien ID" className="p-2 border rounded" />
                <input name="dateDebut" type="datetime-local" required className="p-2 border rounded" />
                <input name="dateFin" type="datetime-local" className="p-2 border rounded" />
                <input name="description" placeholder="Description" className="p-2 border rounded md:col-span-4" />
              </div>
              <div className="mt-2 text-right"><button className="px-3 py-2 bg-blue-600 text-white rounded">Ajouter</button></div>
            </form>
          </div>
        </div>
      )}

       {tab==='documents' && (
        <div className="space-y-3">
          {ticket.documents?.length ? (
            <div className="divide-y border rounded-lg overflow-hidden">
              {ticket.documents.map((d)=>(
                <div key={d.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50">
                  <div className="flex items-center gap-3 text-gray-800">
                    <DocumentIcon className="h-5 w-5 text-gray-500"/>
                    <span>{d.nom}</span>
                  </div>
                  <a href={d.url} target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">
                    Ouvrir <ArrowTopRightOnSquareIcon className="h-4 w-4"/>
                  </a>
                </div>
              ))}
            </div>
          ) : <div className="text-gray-500">Aucun document</div>}
          <div className="mt-2 p-3 border rounded bg-white">
            <div className="font-medium mb-2">Ajouter un document</div>
            <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
              Télécharger
              <input hidden type="file" onChange={async(e)=>{
                if (!e.target.files?.length) return
                setUploading(true)
                const f = e.target.files[0]
                const fd = new FormData()
                fd.append('file', f)
                const res = await fetch(`/api/sav/${params.id}/documents`, { method:'POST', body: fd })
                setUploading(false)
                if (res.ok) load()
                ;(e.target as HTMLInputElement).value = ''
              }} />
            </label>
            {uploading && <div className="text-xs text-gray-500 mt-2">Envoi…</div>}
          </div>
        </div>
      )}

      {tab==='photos' && (
        <PhotosSection ticket={ticket} ticketId={params.id} reload={load} uploading={uploading} setUploading={setUploading} />
      )}

      {tab==='commentaires' && (
        <div className="space-y-3">
          {ticket.commentaires?.length ? ticket.commentaires.map((c)=>(
            <div key={c.id} className="p-3 border rounded">
              <div className="text-sm text-gray-500">{c.auteur?.name || '—'} • {new Date(c.createdAt).toLocaleString()}</div>
              <div>{c.contenu}</div>
            </div>
          )) : <div className="text-gray-500">Aucun commentaire</div>}
          <div className="mt-2 flex gap-2">
            <input className="flex-1 p-2 border rounded" placeholder="Ajouter un commentaire" value={newComment} onChange={e=>setNewComment(e.target.value)} />
            <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async()=>{
              if (!newComment.trim()) return
              const res = await fetch(`/api/sav/${params.id}/commentaires`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ contenu: newComment }) })
              if (res.ok) { setNewComment(''); load() }
            }}>Publier</button>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PhotosSection({ ticket, ticketId, reload, uploading, setUploading }: { ticket: TicketSAV; ticketId: string; reload: () => void; uploading: boolean; setUploading: (v: boolean)=>void }) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  return (
    <div>
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={()=> setLightboxUrl(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={()=> setLightboxUrl(null)}><XMarkIcon className="h-7 w-7"/></button>
          <img src={lightboxUrl} alt="Photo SAV" className="max-h-[85vh] max-w-[90vw] rounded shadow-lg" />
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {ticket.photos?.length ? ticket.photos.map((p)=>(
          <button key={p.id} onClick={()=> setLightboxUrl(p.url)} className="group relative block border rounded-lg overflow-hidden bg-white shadow-sm hover:shadow">
            <img src={p.url} alt={p.nomOriginal||'Photo'} className="w-full h-28 object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"/>
          </button>
        )) : <div className="text-gray-500">Aucune photo</div>}
      </div>
      <div className="mt-4 p-3 border rounded bg-white">
        <div className="font-medium mb-2">Ajouter une photo</div>
        <label className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
          Télécharger
          <input hidden type="file" accept="image/*" onChange={async(e)=>{
            if (!e.target.files?.length) return
            setUploading(true)
            const f = e.target.files[0]
            const fd = new FormData()
            fd.append('file', f)
            const res = await fetch(`/api/sav/${ticketId}/photos`, { method:'POST', body: fd })
            setUploading(false)
            if (res.ok) reload()
            ;(e.target as HTMLInputElement).value = ''
          }} />
        </label>
        {uploading && <div className="text-xs text-gray-500 mt-2">Envoi…</div>}
      </div>
    </div>
  )
}


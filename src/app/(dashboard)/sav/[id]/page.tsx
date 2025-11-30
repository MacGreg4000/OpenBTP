'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
import { StatutSAV, LABELS_STATUT_SAV } from '@/types/sav'

type Statut = StatutSAV

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
  
  // Refs pour les onglets (pour calculer la position de l'indicateur)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicatorStyle, setIndicatorStyle] = useState({ width: 0, left: 0 })
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
  
  // Mettre à jour la position de l'indicateur coulissant
  useEffect(() => {
    const tabs: TabKey[] = ['infos', 'interventions', 'documents', 'photos', 'commentaires']
    const currentIndex = tabs.indexOf(tab)
    const activeTabRef = tabRefs.current[currentIndex]

    if (activeTabRef) {
      const nav = activeTabRef.parentElement
      if (nav) {
        const navRect = nav.getBoundingClientRect()
        const tabRect = activeTabRef.getBoundingClientRect()
        setIndicatorStyle({
          width: tabRect.width,
          left: tabRect.left - navRect.left,
        })
      }
    }
  }, [tab])

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-2 border-white/50 dark:border-gray-700/50 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            {/* Effet de fond subtil avec dégradé rouge/rose (couleur pour SAV) - opacité 60% */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/60 via-rose-700/60 to-pink-800/60 dark:from-red-600/30 dark:via-rose-700/30 dark:to-pink-800/30"></div>

            <div className="relative z-10 p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Bouton retour rond */}
                <button 
                  onClick={() => router.push('/sav')}
                  className="group relative inline-flex items-center justify-center rounded-full border border-red-200/60 dark:border-red-900/40 bg-white/80 dark:bg-red-950/30 text-red-700 dark:text-red-200 shadow-lg shadow-red-500/10 hover:shadow-red-500/20 hover:border-red-300 dark:hover:border-red-700 transition-all w-8 h-8 flex-shrink-0"
                >
                  <span className="absolute inset-0 rounded-full bg-gradient-to-r from-red-100/70 via-red-200/60 to-rose-200/60 dark:from-red-900/30 dark:via-red-800/20 dark:to-rose-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <ArrowLeftIcon className="relative h-4 w-4" />
                </button>

                {/* Badge icône + Titre */}
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full shadow-lg ring-2 ring-white/30 flex-1 min-w-0">
                  <div className="flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 via-rose-600 to-pink-600 text-white shadow-lg shadow-red-500/40 w-8 h-8 flex-shrink-0">
                    <WrenchScrewdriverIcon className="h-4 w-4 drop-shadow-md" />
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-red-900 dark:text-white truncate">
                    Ticket #{ticket.numTicket}
                  </h1>
                </div>

                {/* Actions à droite */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select 
                    className="px-3 py-2 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white outline-none ring-1 ring-inset ring-white/20 dark:ring-gray-700/50 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500 shadow-sm text-sm" 
                    value={ticket.statut} 
                    onChange={e=>updateField({ statut: e.target.value as Statut })}
                  >
                    {Object.values(StatutSAV).map(statut => (
                      <option key={statut} value={statut}>
                        {LABELS_STATUT_SAV[statut]}
                      </option>
                    ))}
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
                    className="px-4 py-2 bg-white/30 backdrop-blur-sm rounded-lg text-sm font-semibold shadow-lg hover:bg-white/40 transition-all duration-200 text-red-900 dark:text-white border-white/50 disabled:opacity-60"
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
              
              {/* Champ titre en dessous */}
              <div className="mt-3">
                <input
                  className="w-full px-3 py-2 rounded-md bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white outline-none ring-1 ring-inset ring-white/20 dark:ring-gray-700/50 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500 placeholder:text-gray-500 dark:placeholder:text-gray-400 shadow-sm text-sm"
                  name="titre"
                  value={form.titre}
                  onChange={onChangeForm}
                  placeholder="Titre du ticket"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contenu */}
        {/* Tabs */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur rounded-xl shadow border border-gray-200 dark:border-gray-700">
          {/* Onglets centrés avec icônes et effet coulissant */}
          <div className="relative border-b border-gray-200 dark:border-gray-700">
            <nav className="relative -mb-px flex justify-center space-x-1 sm:space-x-4 px-4 pt-4">
              {/* Indicateur coulissant animé - dégradé rouge/rose pour SAV */}
              <div
                className="absolute bottom-0 h-1 bg-gradient-to-r from-red-400 via-rose-600 to-pink-800 rounded-t-full transition-all duration-300 ease-in-out shadow-lg"
                style={{
                  width: indicatorStyle.width || 0,
                  left: indicatorStyle.left || 0,
                }}
              />
              
              {[
                {k:'infos', label:'Infos', Icon: InformationCircleIcon, index: 0},
                {k:'interventions', label:'Interventions', Icon: WrenchScrewdriverIcon, index: 1},
                {k:'documents', label:'Documents', Icon: DocumentIcon, index: 2},
                {k:'photos', label:'Photos', Icon: PhotoIcon, index: 3},
                {k:'commentaires', label:'Commentaires', Icon: ChatBubbleLeftRightIcon, index: 4},
              ].map(({k, label, Icon, index})=> (
                <button
                  key={k}
                  ref={(el) => { tabRefs.current[index] = el }}
                  onClick={()=>setTab(k as TabKey)}
                  className={`relative py-3 px-4 sm:px-6 font-medium text-sm flex items-center gap-2 transition-all duration-300 rounded-t-lg ${
                    tab === k
                      ? 'text-red-700 dark:text-red-400 bg-gradient-to-b from-red-50 to-transparent dark:from-red-900/30 dark:to-transparent shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className={`h-5 w-5 transition-colors ${tab === k ? 'text-red-700 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4">

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


'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, DocumentIcon, ArrowTopRightOnSquareIcon, PhotoIcon, ChatBubbleLeftRightIcon, InformationCircleIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../../i18n'

type Ticket = {
  id: string; numTicket: string; titre: string; description?: string; priorite: string; statut: string;
  chantier?: { chantierId: string; nomChantier?: string };
  documents?: Array<{ id: string; nom: string; url: string }>
  photos?: Array<{ id: string; url: string; nomOriginal?: string }>
  interventions?: Array<{ id: string; titre: string; description?: string; dateDebut: string; dateFin?: string }>
  commentaires?: Array<{ id: string; contenu: string; createdAt: string }>
}

function InnerPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string; ticketId: string } }) {
  const { type, actorId, ticketId } = props.params
  const router = useRouter()
  const { t } = usePortalI18n()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [tab, setTab] = useState<'infos'|'docs'|'photos'|'interv'|'com'>('infos')
  const [loading, setLoading] = useState(true)
  useEffect(() => { (async()=>{ const r = await fetch(`/api/public/portail/${type}/${actorId}/sav/${ticketId}`); const d = await r.json(); setTicket(r.ok?d:null); setLoading(false) })() }, [type, actorId, ticketId])

  if (loading) return <div className="min-h-screen p-4">{t('loading')}</div>
  if (!ticket) return <div className="min-h-screen p-4 text-red-600">{t('error')}</div>
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button onClick={()=> router.push(`/public/portail/${type}/${actorId}/sav`)} className="inline-flex items-center text-white/90 hover:text-white"><ArrowLeftIcon className="h-5 w-5 mr-1"/>Retour</button>
            <div className="ml-auto font-medium">Ticket {ticket.numTicket}</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 border border-gray-100">
          <div className="text-lg font-semibold text-gray-900 mb-2">{ticket.titre}</div>
          {ticket.description && (
            <div className="text-sm text-gray-600 mb-3">{ticket.description}</div>
          )}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{ticket.priorite}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{ticket.statut}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200">
          <div className="p-3 flex gap-2 border-b overflow-auto">
            {[
              ['infos','Infos', InformationCircleIcon],
              ['docs','Docs', DocumentIcon],
              ['photos','Photos', PhotoIcon],
              ['interv','Interv.', WrenchScrewdriverIcon],
              ['com','Com.', ChatBubbleLeftRightIcon],
            ].map(([k,l,Icon]) => (
              <button key={k as string} onClick={()=> setTab(k as 'infos'|'docs'|'photos'|'interv'|'com')} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-sm transition ${tab===k?'bg-blue-600 text-white':'text-gray-700 hover:bg-gray-100'}`}>
                {Icon ? (React.createElement(Icon as React.ComponentType<{ className?: string }>, { className: 'h-4 w-4' })) : null}
                {l as string}
              </button>
            ))}
          </div>
          <div className="p-4">
            {tab==='infos' && (
              <div className="text-sm text-gray-800 whitespace-pre-wrap">{ticket.description || '—'}</div>
            )}
            {tab==='docs' && (
              <div className="space-y-2">
                {ticket.documents?.length ? ticket.documents.map(d=> (
                  <div key={d.id} className="p-2 border rounded flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-800"><DocumentIcon className="h-5 w-5 text-gray-500"/>{d.nom}</div>
                    <a href={d.url} target="_blank" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700">{t('open') || 'Ouvrir'} <ArrowTopRightOnSquareIcon className="h-4 w-4"/></a>
                  </div>
                )) : <div className="text-gray-500 text-sm">—</div>}
              </div>
            )}
            {tab==='photos' && (
              <div className="grid grid-cols-2 gap-2">
                {ticket.photos?.length ? ticket.photos.map(p=> (
                  <a key={p.id} href={p.url} target="_blank" className="group block border rounded overflow-hidden bg-white shadow-sm hover:shadow">
                    <img src={p.url} alt={p.nomOriginal||'Photo'} className="w-full h-28 object-cover" />
                    <div className="hidden"/>
                  </a>
                )) : <div className="text-gray-500 text-sm">—</div>}
              </div>
            )}
            {tab==='interv' && (
              <div className="space-y-2 text-sm">
                {ticket.interventions?.length ? ticket.interventions.map(i=> (
                  <div key={i.id} className="p-2 border rounded">
                    <div className="font-medium">{i.titre}</div>
                    <div className="text-xs text-gray-500">{new Date(i.dateDebut).toLocaleString()} {i.dateFin?`→ ${new Date(i.dateFin).toLocaleString()}`:''}</div>
                    {i.description && <div className="mt-1">{i.description}</div>}
                  </div>
                )) : <div className="text-gray-500 text-sm">—</div>}
              </div>
            )}
            {tab==='com' && (
              <div className="space-y-2 text-sm">
                {ticket.commentaires?.length ? ticket.commentaires.map(c=> (
                  <div key={c.id} className="p-2 border rounded">
                    <div className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleString()}</div>
                    <div>{c.contenu}</div>
                  </div>
                )) : <div className="text-gray-500 text-sm">—</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Page(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string; ticketId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerPage params={p} />
    </PortalI18nProvider>
  )
}


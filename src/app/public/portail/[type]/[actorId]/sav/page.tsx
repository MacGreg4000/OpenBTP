'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, WrenchScrewdriverIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

type Ticket = { id: string; numTicket: string; titre: string; priorite: string; statut: string; dateDemande: string; chantier?: { chantierId: string; nomChantier?: string } }

function InnerPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const { t, lang, setLang } = usePortalI18n()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async ()=>{
      const res = await fetch(`/api/public/portail/${type}/${actorId}/sav`)
      const data = await res.json()
      setTickets(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [type, actorId])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button onClick={()=> router.back()} className="inline-flex items-center text-white/90 hover:text-white"><ArrowLeftIcon className="h-5 w-5 mr-1"/>{t('back')}</button>
            <div className="flex items-center ml-auto gap-2">
              <WrenchScrewdriverIcon className="h-5 w-5 text-white/90"/>
              <span className="font-medium">{t('sav_tickets')}</span>
              <select value={lang} onChange={(e)=> setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} className="ml-2 bg-white/90 text-gray-900 border-0 rounded px-2 py-1 text-sm">
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="ro">RO</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl p-4 shadow text-center">{t('loading')}</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">—</div>
        ) : (
          <div className="space-y-3">
            {tickets.map((tk) => (
              <div key={tk.id} className="bg-white rounded-xl p-4 shadow border border-gray-100">
                <div className="flex items-start">
                  <div className="flex-1">
                    <div className="text-xs text-gray-500">{tk.numTicket} • {new Date(tk.dateDemande).toLocaleDateString()}</div>
                    <div className="font-semibold text-gray-900 mt-0.5">{tk.titre}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="text-gray-600">{tk.chantier?.nomChantier || '—'}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{tk.priorite}</span>
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{tk.statut}</span>
                    </div>
                  </div>
                  <a href={`/public/portail/${type}/${actorId}/sav/${tk.id}`} className="ml-2 h-9 w-9 inline-flex items-center justify-center rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"><ArrowTopRightOnSquareIcon className="h-5 w-5"/></a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerPage params={p} />
    </PortalI18nProvider>
  )
}


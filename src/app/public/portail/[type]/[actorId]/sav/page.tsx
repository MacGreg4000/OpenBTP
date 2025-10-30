'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, WrenchScrewdriverIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

type Ticket = { id: string; numTicket: string; titre: string; description?: string; priorite: string; statut: string; dateDemande: string }

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
      console.log('Données SAV reçues:', data)
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
              <div key={tk.id} className="bg-white rounded-xl p-4 shadow border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start">
                  <div className="flex-1">
                    {/* En-tête avec numéro et date */}
                    <div className="text-xs text-gray-500 mb-1">{tk.numTicket} • {new Date(tk.dateDemande).toLocaleDateString('fr-FR')}</div>
                    
                    {/* Titre du problème */}
                    <div className="font-semibold text-gray-900 mb-2 text-sm leading-tight">{tk.titre}</div>
                    
                    {/* Description du ticket */}
                    {tk.description && (
                      <div className="mb-2">
                        <div className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                          {tk.description}
                        </div>
                      </div>
                    )}
                    
                    {/* Badges de statut et priorité */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        tk.priorite === 'CRITIQUE' ? 'bg-red-100 text-red-700' :
                        tk.priorite === 'HAUTE' ? 'bg-orange-100 text-orange-700' :
                        tk.priorite === 'NORMALE' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {tk.priorite}
                      </span>
                      <span className={`px-2 py-1 rounded-full font-medium ${
                        tk.statut === 'NOUVEAU' ? 'bg-green-100 text-green-700' :
                        tk.statut === 'EN_COURS' ? 'bg-blue-100 text-blue-700' :
                        tk.statut === 'RESOLU' ? 'bg-emerald-100 text-emerald-700' :
                        tk.statut === 'CLOS' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {tk.statut}
                      </span>
                    </div>
                  </div>
                  
                  {/* Bouton d'action */}
                  <a 
                    href={`/public/portail/${type}/${actorId}/sav/${tk.id}`} 
                    className="ml-3 h-9 w-9 inline-flex items-center justify-center rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                    title={t('details')}
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5"/>
                  </a>
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


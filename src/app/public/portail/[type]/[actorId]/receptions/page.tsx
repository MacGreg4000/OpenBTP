'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

type Reception = { id: string; chantierId: string; dateCreation: string; dateLimite: string | null; estFinalise: boolean; chantier?: { nomChantier?: string }; _count?: { remarques: number } }

function InnerPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const { t, lang, setLang } = usePortalI18n()
  const [items, setItems] = useState<Reception[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async ()=>{
      const res = await fetch(`/api/public/portail/${type}/${actorId}/receptions`)
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
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
              <ClipboardDocumentListIcon className="h-5 w-5 text-white/90"/>
              <span className="font-medium">{t('receptions')}</span>
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
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">—</div>
        ) : (
          <div className="space-y-3">
            {items.map(rc => (
              <div key={rc.id} className="bg-white rounded-xl p-4 shadow border border-gray-100">
                <div className="text-xs text-gray-500">{new Date(rc.dateCreation).toLocaleDateString()} {rc.dateLimite ? `→ ${new Date(rc.dateLimite).toLocaleDateString()}` : ''}</div>
                <div className="font-semibold text-gray-900 mt-0.5">{rc.chantier?.nomChantier || rc.chantierId}</div>
                <div className="mt-1 text-xs flex items-center gap-2">
                  <span className="text-gray-600">{rc._count?.remarques || 0} remarques</span>
                  <span className={`px-2 py-0.5 rounded-full ${rc.estFinalise ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>{rc.estFinalise ? 'Finalisée' : 'En cours'}</span>
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


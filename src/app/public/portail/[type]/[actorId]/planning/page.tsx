'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

type Task = { id: string; title: string; description?: string; start: string; end: string; status: string; chantier?: { chantierId: string; nomChantier?: string } }

function InnerPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const { t, lang, setLang } = usePortalI18n()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async ()=>{
      const res = await fetch(`/api/public/portail/${type}/${actorId}/planning`)
      const data = await res.json()
      setTasks(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
  }, [type, actorId])

  // Helpers date locale
  const localDateKey = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const dd = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${dd}`
  }

  // Regrouper les tâches par jour local (AAAA-MM-JJ)
  const groupsMap = React.useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach(t => {
      const startDate = new Date(t.start)
      const endDate = new Date(t.end)
      
      // Ajouter la tâche à tous les jours qu'elle couvre
      const currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const key = localDateKey(currentDate)
        const arr = map.get(key) || []
        // Éviter les doublons
        if (!arr.find(existing => existing.id === t.id)) {
          arr.push(t)
        }
        map.set(key, arr)
        currentDate.setDate(currentDate.getDate() + 1)
      }
    })
    for (const [k, arr] of map.entries()) {
      arr.sort((a,b)=> new Date(a.start).getTime() - new Date(b.start).getTime())
      map.set(k, arr)
    }
    return map
  }, [tasks])

  const today = new Date()
  const weekdayOf = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'long' })
  const monthYearOf = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  const formatHourRange = (s: string, e: string) => {
    const ds = new Date(s)
    const de = new Date(e)
    const hs = ds.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    const he = de.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return `${hs} → ${he}`
  }

  const badgeForStatus = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('en_cours') || s.includes('en cours')) return 'bg-blue-50 text-blue-700'
    if (s.includes('plan') || s.includes('assign')) return 'bg-indigo-50 text-indigo-700'
    if (s.includes('attente')) return 'bg-amber-50 text-amber-700'
    if (s.includes('clos') || s.includes('fini')) return 'bg-green-50 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button onClick={()=> router.back()} className="inline-flex items-center text-white/90 hover:text-white"><ArrowLeftIcon className="h-5 w-5 mr-1"/>{t('back')}</button>
            <div className="flex items-center ml-auto gap-2">
              <CalendarDaysIcon className="h-5 w-5 text-white/90"/>
              <span className="font-medium">{t('my_planning')}</span>
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
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">—</div>
        ) : (
          <div className="space-y-4">
            {Array.from({ length: 14 }).map((_, idx) => {
              const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + idx)
              const key = localDateKey(d)
              const dayTasks = groupsMap.get(key) || []
              return (
                <div key={key} className="flex items-stretch gap-3">
                  {/* Colonne gauche: carte calendrier */}
                  <div className="flex-shrink-0 bg-white rounded-2xl shadow border border-gray-100 overflow-hidden">
                    <div className="px-3 py-2 text-center text-[10px] uppercase tracking-wide bg-red-600 text-white">{weekdayOf(d)}</div>
                    <div className="px-4 py-2 text-center">
                      <div className="text-4xl font-bold text-gray-900 leading-none">{d.getDate()}</div>
                      <div className="text-[11px] text-gray-500 -mt-0.5">{monthYearOf(d)}</div>
                    </div>
                  </div>
                  {/* Colonne droite: tâches du jour */}
                  <div className="flex-1 space-y-2">
                    {dayTasks.length === 0 ? (
                      <div className="bg-white rounded-xl p-4 shadow border border-gray-100 text-gray-500 text-sm">—</div>
                    ) : (
                      dayTasks.map(ts => (
                        <div key={ts.id} className="bg-white rounded-xl p-4 shadow border border-gray-100">
                          <div className="text-xs text-gray-500">{formatHourRange(ts.start, ts.end)}</div>
                          <div className="font-semibold text-gray-900 mt-0.5">{ts.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="text-gray-600">{ts.chantier?.nomChantier || '—'}</span>
                            <span className={`px-2 py-0.5 rounded-full ${badgeForStatus(ts.status)}`}>{ts.status}</span>
                          </div>
                          {ts.description && (<div className="mt-2 text-sm text-gray-700">{ts.description}</div>)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
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


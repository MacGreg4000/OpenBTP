'use client'

import useSWR from 'swr'
import { useSearchParams, useRouter } from 'next/navigation'
import { jsonFetcher } from '@/lib/client/fetcher'
import Link from 'next/link'
import { StatutSAV, PrioriteSAV, TypeTicketSAV } from '@/types/sav'
import { FunnelIcon, MagnifyingGlassIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, XCircleIcon, TrashIcon, WrenchScrewdriverIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline'

export default function SavListPage() {
  const sp = useSearchParams()
  const router = useRouter()
  const page = Number(sp.get('page')||'1')
  const spStr = sp.toString()
  type TicketLite = { id: string; numTicket: string; titre: string; priorite: string; statut: string; chantier?: { nomChantier?: string }; nomLibre?: string }
  type SavListResponse = { data: TicketLite[]; meta?: { page: number; totalPages: number } } | TicketLite[]
  const { data, isLoading, error, mutate } = useSWR<SavListResponse>(() => `/api/sav?${spStr || `page=${page}&pageSize=20`}`, jsonFetcher)
  const tickets: TicketLite[] = Array.isArray(data) ? (data ?? []) : (data?.data ?? [])
  const meta = !Array.isArray(data) && data?.meta ? data.meta : { page, totalPages: 1 }

  if (isLoading) return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  )
  if (error) return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">Erreur de chargement</div>
    </div>
  )

  const setParam = (key: string, value?: string) => {
    const params = new URLSearchParams(sp)
    if (!value) params.delete(key)
    else params.set(key, value)
    params.set('page', '1')
    router.push(`/sav?${params.toString()}`)
  }

  // Calculer les statistiques pour les KPIs
  const ticketsTotal = tickets.length
  const ticketsEnCours = tickets.filter(t => t.statut === StatutSAV.EN_COURS).length
  const ticketsNouveaux = tickets.filter(t => t.statut === StatutSAV.NOUVEAU).length
  const ticketsResolus = tickets.filter(t => t.statut === StatutSAV.RESOLU).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-red-600 to-rose-700 shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center min-w-0">
              <WrenchScrewdriverIcon className="h-5 w-5 text-white mr-2 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold text-white">
                  Tickets SAV
                </h1>
                <p className="mt-0.5 text-xs text-red-100 hidden sm:block">
                  Suivi et gestion des demandes de service
                </p>
              </div>
            </div>

            {/* Statistiques compactes */}
            <div className="flex items-center gap-2 flex-1 justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <WrenchScrewdriverIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-red-100 truncate">Total</div>
                    <div className="text-sm font-semibold text-white truncate">{ticketsTotal}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <ExclamationTriangleIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-red-100 truncate">Nouveaux</div>
                    <div className="text-sm font-semibold text-white truncate">{ticketsNouveaux}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-red-100 truncate">En cours</div>
                    <div className="text-sm font-semibold text-white truncate">{ticketsEnCours}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded px-2.5 py-1.5 border border-white/20 flex-1 min-w-0 max-w-[120px]">
                <div className="flex items-center gap-1.5">
                  <CheckCircleIcon className="h-4 w-4 text-white flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-red-100 truncate">Résolus</div>
                    <div className="text-sm font-semibold text-white truncate">{ticketsResolus}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Link href="/sav/nouveau">
                <button className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200">
                  <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Nouveau ticket</span>
                  <span className="sm:hidden">Nouveau</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
            <div className="col-span-2 flex items-center gap-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-500" />
              <input
                type="search"
                placeholder="Rechercher par titre, numéro, description..."
                defaultValue={sp.get('recherche') || ''}
                onKeyDown={(e)=> { if (e.key==='Enter') setParam('recherche', (e.target as HTMLInputElement).value || undefined) }}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <select defaultValue={sp.get('statut') || ''} onChange={(e)=> setParam('statut', e.target.value || undefined)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2">
                <option value="">Statut</option>
                {Object.values(StatutSAV).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <select defaultValue={sp.get('priorite') || ''} onChange={(e)=> setParam('priorite', e.target.value || undefined)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2">
                <option value="">Priorité</option>
                {Object.values(PrioriteSAV).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <select defaultValue={sp.get('type') || ''} onChange={(e)=> setParam('type', e.target.value || undefined)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2">
                <option value="">Type</option>
                {Object.values(TypeTicketSAV).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Liste */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Titre</th>
                <th className="text-left p-3">Chantier</th>
                <th className="text-left p-3">Priorité</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: { id: string; numTicket: string; titre: string; priorite: string; statut: string; chantier?: { nomChantier?: string }; nomLibre?: string })=> (
                <tr key={t.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{t.numTicket}</td>
                  <td className="p-3 text-gray-800 dark:text-gray-200">{t.titre}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{t.chantier?.nomChantier || t.nomLibre || '—'}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.priorite === PrioriteSAV.CRITIQUE ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      t.priorite === PrioriteSAV.HAUTE ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      t.priorite === PrioriteSAV.NORMALE ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>{t.priorite}</span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      t.statut === StatutSAV.NOUVEAU ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      t.statut === StatutSAV.EN_COURS ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      t.statut === StatutSAV.RESOLU ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      t.statut === StatutSAV.CLOS ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>{t.statut}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={async ()=>{ if(confirm('Marquer ce ticket comme résolu ?')) { await fetch(`/api/sav/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'RESOLU' }) }); router.refresh() } }}
                        className="h-8 w-8 rounded-lg text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                        title="Marquer comme résolu"
                        aria-label="Marquer comme résolu"
                      >
                        <CheckCircleIcon className="h-5 w-5 mx-auto" />
                      </button>
                      <button
                        onClick={async ()=>{ if(confirm('Annuler ce ticket ?')) { await fetch(`/api/sav/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ statut: 'ANNULE' }) }); router.refresh() } }}
                        className="h-8 w-8 rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/20"
                        title="Annuler"
                        aria-label="Annuler"
                      >
                        <XCircleIcon className="h-5 w-5 mx-auto" />
                      </button>
                      <button
                        onClick={async ()=>{ 
                          if(confirm('Supprimer définitivement ce ticket ?')) { 
                            const response = await fetch(`/api/sav/${t.id}`, { method: 'DELETE' });
                            if (response.ok) {
                              // Revalider les données SWR pour mettre à jour la liste
                              await mutate();
                            }
                          } 
                        }}
                        className="h-8 w-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                        title="Supprimer définitivement"
                        aria-label="Supprimer définitivement"
                      >
                        <TrashIcon className="h-5 w-5 mx-auto" />
                      </button>
                      <Link href={`/sav/${t.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20" title="Ouvrir le ticket">
                        <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 justify-end items-center mt-4">
          <button disabled={meta.page<=1} onClick={()=> router.push(`/sav?page=${meta.page-1}`)} className="px-3 py-1 border rounded disabled:opacity-50">Précédent</button>
          <span className="text-sm text-gray-600 dark:text-gray-300">Page {meta.page}/{meta.totalPages}</span>
          <button disabled={meta.page>=meta.totalPages} onClick={()=> router.push(`/sav?page=${meta.page+1}`)} className="px-3 py-1 border rounded disabled:opacity-50">Suivant</button>
        </div>
      </div>
    </div>
  )
}
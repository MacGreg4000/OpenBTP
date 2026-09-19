'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, LockClosedIcon, CalendarIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon, DocumentPlusIcon, ArrowRightIcon, BuildingOfficeIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../i18n'

function InnerPortail(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [auth, setAuth] = useState(false)
  const [_error, setError] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const { t, lang, setLang } = usePortalI18n()

  // Vérifier la session au chargement
  useEffect(() => {
    const checkExistingSession = async () => {
      // En développement, vérifier localStorage d'abord
      if (process.env.NODE_ENV !== 'production') {
        const localSession = localStorage.getItem('portalSession')
        if (localSession) {
          const [sessionSubjectType, sessionActorId] = localSession.split(':')
          const expectedSubjectType = type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT'
          
          if (sessionSubjectType === expectedSubjectType && sessionActorId === actorId) {
            setAuth(true)
            return
          }
        }
      }
      
      // Attendre un peu avant de vérifier la session via API
      setTimeout(async () => {
        try {
          const response = await fetch('/api/public/portail/login', {
            method: 'GET',
            credentials: 'include'
          })
          
          if (response.ok) {
            const data = await response.json()
            
            if (data.authenticated && data.token) {
              // Vérifier que le token correspond au type et actorId actuels
              if (data.token.subjectType === (type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT') && 
                  data.token.subjectId === actorId) {
                setAuth(true)
                return
              }
            }
          }
        } catch {
          // Erreur silencieuse
        }
      }, 1000) // Attendre 1 seconde
    }

    checkExistingSession()
  }, [type, actorId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/public/portail/login', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, actorId, pin }) })
      const ok = res.ok
      if (!ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'PIN invalide')
      }
      setAuth(true)
      
      // En développement, sauvegarder la session dans localStorage
      if (process.env.NODE_ENV !== 'production') {
        const sessionData = `${type === 'ouvrier' ? 'OUVRIER_INTERNE' : 'SOUSTRAITANT'}:${actorId}`
        localStorage.setItem('portalSession', sessionData)
      }
      
      // Attendre que le cookie soit bien défini avant de permettre la navigation
      setTimeout(async () => {
        try {
          const sessionRes = await fetch('/api/public/portail/login', { method: 'GET', credentials: 'include' })
          if (sessionRes.ok) {
            const _sessionData = await sessionRes.json()
            // Session confirmée
          } else {
            // Erreur silencieuse
          }
        } catch {
          // Erreur silencieuse
        }
      }, 500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-indigo-700 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6">
          <div className="flex items-center mb-4 justify-between">
            <LockClosedIcon className="h-6 w-6 mr-2" />
            <h1 className="text-xl font-semibold">{type === 'ouvrier' ? t('portal_title_ouvrier') : t('portal_title_sst')}</h1>
            <select value={lang} onChange={(e)=> setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} className="ml-2 bg-white/20 rounded px-2 py-1 text-white text-sm">
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="pt">PT</option>
              <option value="ro">RO</option>
            </select>
          </div>
          <p className="text-sm text-blue-100 mb-4">{t('enter_pin')}</p>
          <form onSubmit={onSubmit} className="space-y-3">
            <input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pin} onChange={(e)=> setPin(e.target.value.replace(/\D/g, ''))} className="w-full rounded-lg px-3 py-3 text-gray-900" placeholder={t('pin_placeholder')} />
            {_error && <div className="bg-red-500/30 border border-red-300 text-white text-sm rounded-lg px-3 py-2 font-medium">{_error}</div>}
            <button type="submit" disabled={loading || pin.length<4} className="w-full bg-white text-blue-700 rounded-lg py-3 font-medium disabled:opacity-60">{loading ? '...' : t('connect')}</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center justify-between">
            <button 
              onClick={() => {
                // Nettoyer la session côté client
                if (process.env.NODE_ENV !== 'production') {
                  localStorage.removeItem('portalSession')
                }
                
                // Nettoyer le cookie côté serveur
                fetch('/api/public/portail/logout', { method: 'POST' })
                
                // Réinitialiser l'état local et forcer la reconnexion
                setAuth(false)
                setPin('')
                setError(null)
              }} 
              className="inline-flex items-center text-white/90 hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1"/>{t('logout')}
            </button>
            <div className="flex items-center gap-2">
              <div className="text-sm text-white/80">{type === 'soustraitant' ? t('space_soustraitant') : t('portal_title_ouvrier')}</div>
              <select value={lang} onChange={(e)=> setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} className="ml-2 bg-white/90 text-gray-900 border-0 rounded px-2 py-1 text-sm">
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="ro">RO</option>
              </select>
            </div>
          </div>
        </div>
        {/* Identité acteur connecté + bienvenue */}
        <ActorHeader type={type} actorId={actorId} />

        {/* Section ENVOYER */}
        <div>
          <h2 className="px-1 mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{t('section_send')}</h2>
          <div className="space-y-3">
            {/* CTA principal: Soumettre un métré (sous-traitant) */}
            {type === 'soustraitant' && (
              <button onClick={() => router.push(`/public/portail/${type}/${actorId}/metres/nouveau`)} className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl p-4 shadow-lg flex items-center justify-between hover:shadow-xl active:scale-[0.99] transition">
                <div className="flex items-center">
                  <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center mr-3">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                  </div>
                  <div className="font-bold text-base">{t('submit_metre')}</div>
                </div>
                <ArrowRightIcon className="h-5 w-5 text-white/80"/>
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              {/* Bon de régie */}
              <button onClick={() => router.push(`/public/portail/${type}/${actorId}/bon-regie/nouveau`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <DocumentPlusIcon className="h-5 w-5"/>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('new_bon_regie')}</div>
              </button>
              {/* Photos */}
              <button onClick={() => router.push(`/public/portail/${type}/${actorId}/photos`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
                <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('photos_send')}</div>
              </button>
              {/* Journal - ouvriers internes */}
              {type === 'ouvrier' && (
                <button onClick={() => router.push(`/public/portail/${type}/${actorId}/journal`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
                  <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('journal')}</div>
                </button>
              )}
              {/* Documents - ouvriers internes */}
              {type === 'ouvrier' && (
                <button onClick={() => router.push(`/public/portail/${type}/${actorId}/documents/upload`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
                  <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <DocumentArrowUpIcon className="h-5 w-5" />
                  </div>
                  <div className="mt-2 text-sm font-semibold text-gray-800 text-center">Envoyer un document</div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section CONSULTER */}
        <div>
          <h2 className="px-1 mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">{t('section_consult')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Planning */}
            <button onClick={() => router.push(`/public/portail/${type}/${actorId}/planning`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <CalendarIcon className="h-5 w-5"/>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('my_planning')}</div>
            </button>
            {/* Chantiers */}
            <button onClick={() => router.push(`/public/portail/${type}/${actorId}/chantiers`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <BuildingOfficeIcon className="h-5 w-5"/>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('chantiers')}</div>
            </button>
            {/* Réceptions */}
            <button onClick={() => router.push(`/public/portail/${type}/${actorId}/receptions`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                <ClipboardDocumentListIcon className="h-5 w-5"/>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('receptions')}</div>
            </button>
            {/* SAV */}
            <button onClick={() => router.push(`/public/portail/${type}/${actorId}/sav`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <WrenchScrewdriverIcon className="h-5 w-5"/>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800 text-center">{t('sav_tickets')}</div>
            </button>
          </div>
        </div>

        {/* Encart: Mes métrés soumis (suivi) */}
        {type === 'soustraitant' && (
          <MesMetres type={type} actorId={actorId} />
        )}
      </div>
    </div>
  )
}

export default function PortailPublicPage(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)

  // Le type vient de l'URL et n'était jamais validé : tout ce qui n'était pas
  // exactement « ouvrier » devenait silencieusement un portail sous-traitant
  // (titre, fonctionnalités, ET type de PIN vérifié). Un lien mal formé
  // produisait donc un « PIN invalide » trompeur au lieu d'une erreur claire.
  if (p.type !== 'ouvrier' && p.type !== 'soustraitant') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-600 to-indigo-700 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Lien invalide</h1>
          <p className="text-sm text-blue-100">
            Ce lien d&apos;accès ne correspond à aucun espace. Demandez un nouveau lien à votre contact.
          </p>
        </div>
      </div>
    )
  }

  return (
    <PortalI18nProvider>
      <InnerPortail params={p} />
    </PortalI18nProvider>
  )
}

function ActorHeader({ type, actorId }: { type: 'ouvrier'|'soustraitant'; actorId: string }) {
  const { t } = usePortalI18n()
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  useEffect(() => {
    (async ()=>{
      try {
        const res = await fetch(`/api/public/portail/${type}/${actorId}/me`, { credentials: 'include' })
        const data = await res.json()
        if (res.ok) {
          setName(data.name || '')
          setRole(data.role || '')
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [type, actorId])
  if (loading) return null
  // Avatar avec initiales
  const initials = name.split(' ').map(p=>p[0]).filter(Boolean).slice(0,2).join('').toUpperCase()
  return (
    <div className="bg-white rounded-2xl p-4 shadow border border-gray-100">
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold shrink-0">
          {initials || '•'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 truncate">{t('welcome_greeting')} {name}</div>
          <div className="text-gray-500 text-xs">{role}</div>
        </div>
      </div>
      {type === 'soustraitant' && (
        <p className="mt-3 text-sm text-gray-500 leading-snug">{t('portal_intro')}</p>
      )}
    </div>
  )
}

// Correspondance statut métré -> libellé i18n + couleur du badge
const METRE_STATUS_STYLES: Record<string, { key: string; cls: string }> = {
  BROUILLON: { key: 'metre_status_brouillon', cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  SOUMIS: { key: 'metre_status_soumis', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  VALIDE: { key: 'metre_status_valide', cls: 'bg-green-100 text-green-700 border-green-200' },
  PARTIELLEMENT_VALIDE: { key: 'metre_status_partiel', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  REJETE: { key: 'metre_status_rejete', cls: 'bg-red-100 text-red-700 border-red-200' },
}

function MesMetres({ type, actorId }: { type: 'ouvrier'|'soustraitant'; actorId: string }) {
  const { t } = usePortalI18n()
  const router = useRouter()
  const [items, setItems] = useState<{ id: string; statut: string; createdAt: string; chantier: { chantierId: string; nomChantier: string } }[]>([])
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/portail/${type}/${actorId}/metres`, { credentials: 'include', cache: 'no-store' })
        const json = await res.json()
        if (res.ok && Array.isArray(json)) {
          setItems(json)
        }
      } catch {
        setItems([])
      }
    })()
  }, [type, actorId])
  return (
    <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-gray-800">{t('my_submitted_metres')}</div>
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-500">{t('none')}</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {items.map((m) => {
            const style = METRE_STATUS_STYLES[m.statut] ?? { key: '', cls: 'bg-gray-100 text-gray-700 border-gray-200' }
            return (
              <li key={m.id}>
                <button
                  onClick={() => router.push(`/public/portail/${type}/${actorId}/metres/${m.id}`)}
                  className="w-full py-2 flex items-center justify-between gap-2 text-left hover:bg-gray-50 rounded-lg px-1 -mx-1 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">{m.chantier.nomChantier}</div>
                    <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${style.cls}`}>
                    {style.key ? t(style.key) : m.statut}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}


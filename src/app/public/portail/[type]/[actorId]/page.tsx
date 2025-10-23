'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, LockClosedIcon, CalendarIcon, ClipboardDocumentListIcon, WrenchScrewdriverIcon, DocumentPlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
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
      const res = await fetch('/api/public/portail/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, actorId, pin }) })
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
            {_error && <div className="text-red-200 text-sm">{_error}</div>}
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
              <ArrowLeftIcon className="h-5 w-5 mr-1"/>Déconnexion
            </button>
            <div className="flex items-center gap-2">
              <div className="text-sm text-white/80">{type}</div>
              <select value={lang} onChange={(e)=> setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} className="ml-2 bg-white/90 text-gray-900 border-0 rounded px-2 py-1 text-sm">
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="ro">RO</option>
              </select>
            </div>
          </div>
        </div>
        {/* Identité acteur connecté */}
        <ActorHeader type={type} actorId={actorId} />

        {/* Cartes rapides */}
        <div className="grid grid-cols-2 gap-3">
          {/* En haut à gauche: Mon planning */}
          <button onClick={() => router.push(`/public/portail/${type}/${actorId}/planning`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
            <div className="h-10 w-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
              <CalendarIcon className="h-5 w-5"/>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-800">{t('my_planning')}</div>
            <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1"/>
          </button>
          {/* En haut à droite: Bon régie */}
          <button onClick={() => router.push(`/public/portail/${type}/${actorId}/bon-regie/nouveau`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
            <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DocumentPlusIcon className="h-5 w-5"/>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-800">{t('new_bon_regie')}</div>
            <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1"/>
          </button>
          {/* En bas à gauche: Réception */}
          <button onClick={() => router.push(`/public/portail/${type}/${actorId}/receptions`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <ClipboardDocumentListIcon className="h-5 w-5"/>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-800">{t('receptions')}</div>
            <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1"/>
          </button>
          {/* En bas à droite: Ticket SAV */}
          <button onClick={() => router.push(`/public/portail/${type}/${actorId}/sav`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <WrenchScrewdriverIcon className="h-5 w-5"/>
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-800">{t('sav_tickets')}</div>
            <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1"/>
          </button>
          
          {/* Journal - Seulement pour les ouvriers internes */}
          {type === 'ouvrier' && (
            <button onClick={() => router.push(`/public/portail/${type}/${actorId}/journal`)} className="bg-white rounded-xl p-4 shadow flex flex-col items-center justify-center border border-gray-100 hover:shadow-md active:scale-[0.99] transition">
              <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="mt-2 text-sm font-semibold text-gray-800">Journal</div>
              <ArrowRightIcon className="h-4 w-4 text-gray-400 mt-1"/>
            </button>
          )}
        </div>

        {/* Carte Upload Photos */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <button onClick={() => router.push(`/public/portail/${type}/${actorId}/photos`)} className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-3 transition-colors w-full text-left">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mr-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-gray-800">Envoyer des photos</div>
                <div className="text-sm text-gray-500">Upload de photos de chantier</div>
              </div>
            </div>
            <ArrowRightIcon className="h-4 w-4 text-gray-400"/>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortailPublicPage(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerPortail params={p} />
    </PortalI18nProvider>
  )
}

function ActorHeader({ type, actorId }: { type: 'ouvrier'|'soustraitant'; actorId: string }) {
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  useEffect(() => {
    (async ()=>{
      try {
        const res = await fetch(`/api/public/portail/${type}/${actorId}/me`)
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
    <div className="bg-white rounded-2xl p-4 shadow flex items-center gap-3 border border-gray-100">
      <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
        {initials || '•'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-gray-900 truncate">{name}</div>
        <div className="text-gray-500 text-xs">{role}</div>
      </div>
    </div>
  )
}


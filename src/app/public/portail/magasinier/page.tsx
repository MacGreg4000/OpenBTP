'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LockClosedIcon } from '@heroicons/react/24/outline'
import { usePortalI18n } from '../i18n'

export default function MagasinierLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const { t } = usePortalI18n()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/public/portail/magasinier/me', { credentials: 'include' })
        if (res.ok) {
          router.replace('/public/portail/magasinier/taches')
          return
        }
      } catch {
        // Non authentifié
      }
      setChecking(false)
    }
    checkSession()
  }, [router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/public/portail/magasinier/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'PIN invalide')
      }
      router.push('/public/portail/magasinier/taches')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'PIN invalide')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-600 to-orange-700 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-600 to-orange-700 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-6">
        <div className="flex items-center mb-4">
          <LockClosedIcon className="h-6 w-6 mr-2" />
          <h1 className="text-xl font-semibold">Portail Magasinier</h1>
        </div>
        <p className="text-sm text-amber-100 mb-4">{t('enter_pin')}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full rounded-lg px-3 py-3 text-gray-900"
            placeholder={t('pin_placeholder')}
          />
          {error && <div className="text-red-200 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full bg-white text-amber-700 rounded-lg py-3 font-medium disabled:opacity-60"
          >
            {loading ? '...' : t('connect')}
          </button>
        </form>
      </div>
    </div>
  )
}

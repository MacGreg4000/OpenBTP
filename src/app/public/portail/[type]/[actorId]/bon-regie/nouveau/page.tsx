'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import { ArrowLeftIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../../i18n'

function InnerPage({ params: _params }: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const router = useRouter()
  const { t } = usePortalI18n()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const signatureRef = useRef<SignatureCanvas>(null)

  const [dates, setDates] = useState('')
  const [client, setClient] = useState('')
  const [nomChantier, setNomChantier] = useState('')
  const [description, setDescription] = useState('')
  const [tempsChantier, setTempsChantier] = useState('')
  const [nombreTechniciens, setNombreTechniciens] = useState('1')
  const [materiaux, setMateriaux] = useState('')
  const [nomSignataire, setNomSignataire] = useState('')

  const clearSignature = () => signatureRef.current?.clear()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (signatureRef.current?.isEmpty()) return alert('Signature requise')
    setLoading(true)
    try {
      const signature = signatureRef.current?.toDataURL('image/jpeg', 0.5) || ''
      const payload = { dates, client, nomChantier, description, tempsChantier: parseFloat(tempsChantier), nombreTechniciens, materiaux, nomSignataire, signature, dateSignature: new Date().toISOString() }
      const res = await fetch('/api/public/bon-regie', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error('Erreur')
      setSuccess(true)
      setDates(''); setClient(''); setNomChantier(''); setDescription(''); setTempsChantier(''); setNombreTechniciens('1'); setMateriaux(''); setNomSignataire(''); clearSignature()
      window.scrollTo(0, 0)
    } catch {
      alert('Erreur lors de l\'enregistrement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button onClick={()=> router.back()} className="inline-flex items-center text-white/90 hover:text-white"><ArrowLeftIcon className="h-5 w-5 mr-1"/>Retour</button>
            <div className="ml-auto font-medium">{t('new_bon_regie')}</div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 rounded-xl p-4 shadow text-green-700 flex items-center"><DocumentCheckIcon className="h-6 w-6 mr-2"/> Enregistré</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg space-y-4 border-2 border-gray-200 dark:border-gray-600">
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Date</label>
            <input type="date" value={dates} onChange={(e)=> setDates(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Client</label>
            <input value={client} onChange={(e)=> setClient(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Chantier</label>
            <input value={nomChantier} onChange={(e)=> setNomChantier(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Travail réalisé</label>
            <textarea value={description} onChange={(e)=> setDescription(e.target.value)} rows={3} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Temps (h)</label>
              <input type="number" step="0.5" value={tempsChantier} onChange={(e)=> setTempsChantier(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
            </div>
            <div>
              <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Ouvriers</label>
              <input type="number" min="1" value={nombreTechniciens} onChange={(e)=> setNombreTechniciens(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Matériaux <span className="text-sm font-normal text-gray-600 dark:text-gray-400">(optionnel)</span></label>
            <textarea value={materiaux} onChange={(e)=> setMateriaux(e.target.value)} rows={2} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Nom du signataire</label>
            <input value={nomSignataire} onChange={(e)=> setNomSignataire(e.target.value)} className="w-full border-2 border-gray-300 dark:border-gray-500 rounded-lg px-4 py-3 text-base bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-h-[44px]" required />
          </div>
          <div>
            <label className="block text-base font-semibold text-gray-800 dark:text-gray-100 mb-2">Signature</label>
            <div className="mt-2 border-2 border-gray-300 dark:border-gray-500 rounded-lg bg-white overflow-hidden">
              <SignatureCanvas ref={signatureRef} canvasProps={{ width: 500, height: 200, className: 'w-full h-auto' }} backgroundColor="#fff" penColor="#000" />
            </div>
            <button type="button" onClick={clearSignature} className="mt-3 text-base font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline">Effacer la signature</button>
          </div>
          <div className="pt-3">
            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg py-4 text-base font-semibold shadow-lg disabled:opacity-60 transition-colors min-h-[48px]">{loading ? 'Enregistrement...' : 'Enregistrer le bon de régie'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Page({ params: _params }: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(_params)
  return (
    <PortalI18nProvider>
      <InnerPage params={p} />
    </PortalI18nProvider>
  )
}


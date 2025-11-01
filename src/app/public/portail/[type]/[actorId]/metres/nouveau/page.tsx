'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { usePortalI18n } from '../../../../i18n'

interface LigneInput {
  ligneCommandeId?: number
  description: string
  type?: string
  unite: string
  prixUnitaire: number
  quantite: number
  estSupplement?: boolean
}

export default function NouveauMetrePage() {
  const params = useParams() as { type: 'ouvrier'|'soustraitant'; actorId: string }
  const router = useRouter()
  const { t } = usePortalI18n()
  const [chantierId, setChantierId] = useState<string>('')
  const [freeMode, setFreeMode] = useState<boolean>(false)
  const [freeChantierNom, setFreeChantierNom] = useState<string>('')
  const [chantiers, setChantiers] = useState<{ chantierId: string; nomChantier: string }[]>([])
  const [commandeId, setCommandeId] = useState<number | null>(null)
  const [lignes, setLignes] = useState<LigneInput[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commentaire, setCommentaire] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [isPortraitMobile, setIsPortraitMobile] = useState<boolean>(false)

  useEffect(() => {
    const updateOrientation = () => {
      if (typeof window === 'undefined') return
      const isPortrait = window.matchMedia('(orientation: portrait)').matches
      const isSmall = window.innerWidth < 1024
      setIsPortraitMobile(isPortrait && isSmall)
    }
    updateOrientation()
    window.addEventListener('resize', updateOrientation)
    window.addEventListener('orientationchange', updateOrientation)
    return () => {
      window.removeEventListener('resize', updateOrientation)
      window.removeEventListener('orientationchange', updateOrientation)
    }
  }, [])

  const tryLockLandscape = async () => {
    try {
      // Doit être déclenché par un geste utilisateur et n'est pas supporté partout (iOS Safari limité)
      // On tente sans casser l'UX si non supporté
      // @ts-expect-error - Screen Orientation API non typée uniformément sur toutes les plateformes
      if (screen.orientation && screen.orientation.lock) {
        // @ts-expect-error - Méthode lock non disponible sur certains navigateurs (iOS Safari)
        await screen.orientation.lock('landscape')
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            const isPortrait = window.matchMedia('(orientation: portrait)').matches
            const isSmall = window.innerWidth < 1024
            setIsPortraitMobile(isPortrait && isSmall)
          }
        }, 300)
      }
    } catch {
      // Ignorer silencieusement si non supporté
    }
  }

  useEffect(() => {
    if (params.type !== 'soustraitant') return
    fetch(`/api/public/portail/${params.type}/${params.actorId}/chantiers-eligibles`)
      .then(r => r.json())
      .then(json => setChantiers(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setChantiers([]))
  }, [params.type, params.actorId])

  useEffect(() => {
    if (!chantierId || freeMode) { setLignes([]); setCommandeId(null); return }
    setLoading(true)
    fetch(`/api/public/portail/${params.type}/${params.actorId}/metres/base?chantierId=${encodeURIComponent(chantierId)}`)
      .then(r => r.json())
      .then(json => {
        setCommandeId(json?.commandeId ?? null)
        setLignes(Array.isArray(json?.data) ? json.data : [])
      })
      .catch(() => setLignes([]))
      .finally(() => setLoading(false))
  }, [chantierId, params.type, params.actorId, freeMode])

  const total = useMemo(() => lignes.reduce((s, l) => s + (l.prixUnitaire * (l.quantite || 0)), 0), [lignes])

  const addSupplement = () => {
    setLignes(prev => [...prev, { description: '', unite: 'U', prixUnitaire: 0, quantite: 0, estSupplement: true }])
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    setFiles(Array.from(e.target.files))
  }

  const submit = async () => {
    try {
      setError(null)
      setLoading(true)

      // Convertir les fichiers en base64 (data URLs)
      const piecesJointes: string[] = []
      for (const f of files) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = reject
          reader.readAsDataURL(f)
        })
        piecesJointes.push(dataUrl)
      }

      const body: {
        commandeId: number | null
        statut: string
        commentaire: string
        lignes: LigneInput[]
        piecesJointes: string[]
        freeChantierNom?: string
        chantierId?: string
      } = {
        commandeId,
        statut: 'SOUMIS',
        commentaire,
        lignes,
        piecesJointes
      }
      if (freeMode) {
        body.freeChantierNom = freeChantierNom || 'Chantier libre'
      } else {
        body.chantierId = chantierId
      }

      const res = await fetch(`/api/public/portail/${params.type}/${params.actorId}/metres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const t = await res.text()
        throw new Error(t)
      }
      router.push(`/public/portail/${params.type}/${params.actorId}?metre=ok`)
    } catch {
      setError('Soumission impossible. Vérifiez vos données.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 lg:py-8">
      {/* Overlay incitation paysage sur mobile portrait */}
      {isPortraitMobile && (
        <div className="fixed inset-0 z-50 bg-black/70 text-white flex flex-col items-center justify-center px-6 text-center">
          <div className="text-lg font-semibold mb-2">{t('overlay_landscape_title')}</div>
          <div className="text-sm opacity-90">{t('overlay_landscape_subtitle')}</div>
          <button onClick={tryLockLandscape} className="mt-4 px-4 py-2 bg-white text-black rounded">
            {t('overlay_try_landscape')}
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow p-4 lg:p-6">
        <h1 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">{t('submit_metre')}</h1>

        {/* Mode chantier libre */}
        <div className="mb-4 flex items-center gap-3">
          <input id="freeMode" type="checkbox" checked={freeMode} onChange={e=> setFreeMode(e.target.checked)} />
          <label htmlFor="freeMode" className="text-sm">{t('create_free_metre')}</label>
        </div>

        {!freeMode ? (
          <>
            <label className="block text-sm font-medium mb-1">{t('chantier_label')}</label>
            <select className="w-full border rounded p-2 mb-4" value={chantierId} onChange={e => setChantierId(e.target.value)}>
              <option value="">{t('select_placeholder')}</option>
              {chantiers.map(c => (
                <option key={c.chantierId} value={c.chantierId}>{c.nomChantier}</option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-1">{t('free_chantier_name')}</label>
            <input className="w-full border rounded p-2 mb-4" value={freeChantierNom} onChange={e=> setFreeChantierNom(e.target.value)} placeholder="Ex: Intervention ponctuelle" />
          </>
        )}

        {/* Lignes */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">{t('table_description')}</th>
                <th className="p-2">{t('table_unit')}</th>
                <th className="p-2">{t('table_unit_price')}</th>
                <th className="p-2">{t('table_quantity')}</th>
                <th className="p-2">{t('table_total')}</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <input className="w-full border rounded p-1" value={l.description} onChange={e => {
                      const v = e.target.value; setLignes(prev => prev.map((x,i)=> i===idx?{...x, description:v}:x))
                    }} />
                  </td>
                  <td className="p-2 w-24">
                    <input className="w-full border rounded p-1 text-center" value={l.unite} onChange={e => {
                      const v = e.target.value; setLignes(prev => prev.map((x,i)=> i===idx?{...x, unite:v}:x))
                    }} />
                  </td>
                  <td className="p-2 w-28">
                    <input type="number" className="w-full border rounded p-1 text-right" value={l.prixUnitaire} onChange={e => {
                      const v = Number(e.target.value||0); setLignes(prev => prev.map((x,i)=> i===idx?{...x, prixUnitaire:v}:x))
                    }} />
                  </td>
                  <td className="p-2 w-28">
                    <input type="number" className="w-full border rounded p-1 text-right" value={l.quantite} onChange={e => {
                      const v = Number(e.target.value||0); setLignes(prev => prev.map((x,i)=> i===idx?{...x, quantite:v}:x))
                    }} />
                  </td>
                  <td className="p-2 w-28 text-right">{(l.prixUnitaire * (l.quantite||0)).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex gap-2">
            <button onClick={addSupplement} className="px-3 py-1.5 text-sm rounded border">
              {freeMode ? t('add_line') : t('add_supplement')}
            </button>
          </div>
        </div>

        {/* Commentaire */}
        <label className="block text-sm font-medium mt-6 mb-1">{t('comment_label')}</label>
        <textarea className="w-full border rounded p-2" rows={4} value={commentaire} onChange={e=>setCommentaire(e.target.value)} />

        {/* Pièces jointes */}
        <label className="block text-sm font-medium mt-6 mb-1">{t('attach_photos')}</label>
        <input type="file" accept="image/*" multiple onChange={handleFiles} />

        {/* Total */}
        <div className="mt-4 text-right font-semibold">{t('estimated_total')}: {total.toFixed(2)} €</div>

        {error && <div className="mt-4 text-sm text-red-600">{t('submit_error')}</div>}

        <div className="mt-6 flex items-center gap-3">
          <button disabled={(freeMode ? false : !chantierId) || loading || lignes.length===0} onClick={submit} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
            {loading? t('sending') : t('submit')}
          </button>
          <button onClick={()=>router.back()} className="px-4 py-2 rounded border">{t('cancel')}</button>
        </div>
      </div>
    </div>
  )
}

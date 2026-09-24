'use client'

// Liste filtrable des chantiers pour le check-in. Mobile d'abord : la plupart
// des consultations se font depuis un téléphone, sur le chantier, juste avant
// de s'enregistrer — d'où le numéro en gros et le bouton « Copier ».

import { useMemo, useState } from 'react'
import { LIBELLES_STATUT_CHECKIN } from '@/lib/checkin/libelles'

interface Chantier {
  id: string
  numero: string | null
  client: string
  chantier: string
  adresse: string
  localite: string
  statut: string
}

/** Insensible à la casse ET aux accents (« Liège » trouvé en tapant « liege »). */
const normaliser = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const URL_CHECKINATWORK = 'https://www.checkinatwork.be'

export default function CheckinListe({ chantiers, miseAJour }: { chantiers: Chantier[]; miseAJour: string }) {
  const [recherche, setRecherche] = useState('')
  const [client, setClient] = useState('')
  const [localite, setLocalite] = useState('')
  const [statut, setStatut] = useState('')
  const [copie, setCopie] = useState<string | null>(null)

  const clients = useMemo(
    () => [...new Set(chantiers.map((c) => c.client).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [chantiers]
  )
  const localites = useMemo(
    () => [...new Set(chantiers.map((c) => c.localite).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')),
    [chantiers]
  )

  const filtres = useMemo(() => {
    const q = normaliser(recherche)
    return chantiers.filter((c) => {
      if (client && c.client !== client) return false
      if (localite && c.localite !== localite) return false
      if (statut && c.statut !== statut) return false
      if (!q) return true
      return normaliser(`${c.numero || ''} ${c.client} ${c.chantier} ${c.adresse}`).includes(q)
    })
  }, [chantiers, recherche, client, localite, statut])

  const copier = async (numero: string, id: string) => {
    try {
      await navigator.clipboard.writeText(numero)
      setCopie(id)
      setTimeout(() => setCopie((x) => (x === id ? null : x)), 2000)
    } catch {
      // Presse-papiers indisponible (navigateur ancien, http) : le numéro
      // reste lisible à l'écran, rien de bloquant.
    }
  }

  const champ =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Avertissement : c'est l'objet même de la page, il reste visible en haut */}
      <div className="bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white">
        Toute personne non enregistrée n&apos;est pas autorisée sur chantier.
        <span className="block font-normal opacity-90">
          Qualquer pessoa não registada não está autorizada na obra.
        </span>
      </div>

      <header className="mx-auto max-w-5xl px-4 pt-5 pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Chantiers Secotech – Checkinatwork</h1>
            <p className="text-xs text-gray-500">
              Numéros d&apos;enregistrement des présences · Números de registo · Mis à jour le {miseAJour}
            </p>
          </div>
          <a
            href={URL_CHECKINATWORK}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ouvrir Checkinatwork
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher / Pesquisar…"
            className={`${champ} sm:col-span-4`}
          />
          <select value={client} onChange={(e) => setClient(e.target.value)} className={champ}>
            <option value="">Tous les clients / Todos os clientes</option>
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={localite} onChange={(e) => setLocalite(e.target.value)} className={champ}>
            <option value="">Toutes les localités / Todas as localidades</option>
            {localites.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <select value={statut} onChange={(e) => setStatut(e.target.value)} className={`${champ} sm:col-span-2`}>
            <option value="">Tous les statuts / Todos os estados</option>
            {Object.entries(LIBELLES_STATUT_CHECKIN).map(([k, v]) => (
              <option key={k} value={k}>{v.fr} / {v.pt}</option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {filtres.length} chantier{filtres.length > 1 ? 's' : ''} sur {chantiers.length}
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10">
        {filtres.length === 0 ? (
          <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            Aucun chantier ne correspond à la recherche.
          </p>
        ) : (
          <ul className="space-y-3">
            {filtres.map((c) => {
              const itineraire = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(c.adresse)}`
              const lib = LIBELLES_STATUT_CHECKIN[c.statut]
              return (
                <li key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {c.numero ? (
                        <p className="font-mono text-2xl font-bold tracking-wide text-blue-800 break-all">{c.numero}</p>
                      ) : (
                        <p className="text-sm font-semibold text-amber-700">
                          Numéro non encore communiqué – contactez Secotech
                          <span className="block font-normal">Número ainda não comunicado – contacte a Secotech</span>
                        </p>
                      )}
                      <p className="mt-1 text-base font-semibold">{c.chantier}</p>
                      {c.client && <p className="text-sm text-gray-600">{c.client}</p>}
                      {c.adresse && <p className="text-sm text-gray-600">{c.adresse}</p>}
                    </div>
                    {lib && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {lib.fr} / {lib.pt}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {c.numero && (
                      <button
                        type="button"
                        onClick={() => copier(c.numero!, c.id)}
                        className="rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        {copie === c.id ? 'Copié ✓' : 'Copier le numéro'}
                      </button>
                    )}
                    {c.adresse && (
                      <a
                        href={itineraire}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Itinéraire
                      </a>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-500">
        Secotech SRL – Rue Frumhy 20, 4671 Barchon – BE 0537.822.042
      </footer>
    </div>
  )
}

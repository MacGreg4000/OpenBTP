'use client'

// Rappel Checkinatwork quotidien : mode, heure, jours sans rappel, envoi manuel
// et état du jour. Chaque envoi est journalisé (preuve pour l'inspection).

import { useCallback, useEffect, useState } from 'react'

type Mode = 'DESACTIVE' | 'TEST' | 'ACTIF'

interface Etat {
  mode: Mode
  emailTest: string
  heure: string
  joursFeries: string
  emailAlerte: string
  emailSociete: string
  prochainsFeries: { date: string; nom: string }[]
  lienConfigure: boolean
  date: string
  destinataires: { id: string; nom: string; email: string | null; probleme: string | null }[]
  duJour: {
    id: number
    soustraitantNom: string
    destinataire: string
    modeTest: boolean
    declencheur: string
    statut: string
    erreur: string | null
    createdAt: string
  }[]
}

const MODES: { valeur: Mode; libelle: string; aide: string }[] = [
  { valeur: 'DESACTIVE', libelle: 'Désactivé', aide: 'Aucun rappel ne part.' },
  { valeur: 'TEST', libelle: 'Test', aide: 'Tous les rappels partent à l’adresse de test, objet préfixé [TEST].' },
  { valeur: 'ACTIF', libelle: 'Actif', aide: 'Envoi réel au représentant de chaque sous-traitant.' },
]

export default function RappelCheckinSettings() {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [form, setForm] = useState({ mode: 'DESACTIVE' as Mode, emailTest: '', emailAlerte: '', heure: '06:30', joursFeries: '' })
  const [enCours, setEnCours] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null)

  const charger = useCallback(async () => {
    const r = await fetch('/api/settings/rappel-checkin')
    if (!r.ok) return
    const d: Etat = await r.json()
    setEtat(d)
    setForm({ mode: d.mode, emailTest: d.emailTest, emailAlerte: d.emailAlerte, heure: d.heure, joursFeries: d.joursFeries })
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const enregistrer = async () => {
    if (form.mode === 'ACTIF' && etat?.mode !== 'ACTIF' &&
      !confirm('Mode actif : les rappels partiront réellement aux sous-traitants chaque matin. Continuer ?')) return
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/settings/rappel-checkin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      setMessage({ ok: true, texte: 'Réglages enregistrés.' })
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnCours(false)
    }
  }

  const envoyerMaintenant = async () => {
    const cible = etat?.mode === 'TEST' ? `l'adresse de test (${etat.emailTest})` : 'tous les sous-traitants actifs'
    if (!confirm(`Envoyer le rappel maintenant à ${cible} ?`)) return
    setEnCours(true)
    setMessage(null)
    try {
      const r = await fetch('/api/rappels-checkin/envoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error || 'Erreur')
      const parties = [`${d.envoyes.length} envoyé(s)`]
      if (d.echecs.length) parties.push(`${d.echecs.length} échec(s)`)
      if (d.ignores.length) parties.push(`${d.ignores.length} ignoré(s)`)
      setMessage({ ok: d.echecs.length === 0, texte: parties.join(', ') + '.' })
      await charger()
    } catch (e) {
      setMessage({ ok: false, texte: e instanceof Error ? e.message : 'Erreur' })
    } finally {
      setEnCours(false)
    }
  }

  if (!etat) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    )
  }

  const modifie =
    form.mode !== etat.mode || form.emailTest !== etat.emailTest || form.emailAlerte !== etat.emailAlerte || form.heure !== etat.heure || form.joursFeries !== etat.joursFeries
  const aContacter = etat.destinataires.filter((d) => !d.probleme)
  const aProbleme = etat.destinataires.filter((d) => d.probleme)
  const champ = 'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white'

  return (
    <div className="space-y-5 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-gray-200 dark:border-gray-700">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rappel Checkinatwork quotidien</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Chaque jour ouvrable, un email en français, portugais, roumain et anglais au représentant de chaque sous-traitant actif ayant un contrat-cadre signé :
          obligation d&apos;enregistrement, interdiction d&apos;accès sans enregistrement et lien vers la page des chantiers.
          Chaque envoi est conservé (texte exact + liste des chantiers du jour). Réponses vers info@secotech.be.
        </p>
      </div>

      {!etat.lienConfigure && (
        <p className="rounded-md bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
          Génère d&apos;abord le lien de la page Checkinatwork ci-dessus : aucun rappel ne part sans lui.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {MODES.map((m) => (
          <label
            key={m.valeur}
            className={`cursor-pointer rounded-lg border-2 p-3 ${
              form.mode === m.valeur ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <input
              type="radio"
              name="rappelMode"
              value={m.valeur}
              checked={form.mode === m.valeur}
              onChange={() => setForm({ ...form, mode: m.valeur })}
              className="mr-2"
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">{m.libelle}</span>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{m.aide}</p>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Adresse de test</span>
          <input
            type="email"
            value={form.emailTest}
            onChange={(e) => setForm({ ...form, emailTest: e.target.value })}
            placeholder="gregory@secotech.be"
            className={`mt-1 w-full ${champ}`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Heure d&apos;envoi (lun.–ven.)</span>
          <input
            type="time"
            min="05:00"
            max="10:59"
            value={form.heure}
            onChange={(e) => setForm({ ...form, heure: e.target.value })}
            className={`mt-1 w-full ${champ}`}
          />
          <span className="mt-1 block text-xs text-gray-500">Si le serveur était arrêté, envoi au plus tard vers 11h.</span>
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Adresse d&apos;alerte</span>
        <input
          type="email"
          value={form.emailAlerte}
          onChange={(e) => setForm({ ...form, emailAlerte: e.target.value })}
          placeholder={etat.emailSociete || 'gregory@secotech.be'}
          className={`mt-1 w-full sm:w-1/2 ${champ}`}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Vers 7h00, uniquement en cas de problème : rappel en échec ou pas parti, sous-traitant actif sans contrat
          signé ou sans email, chantier sans numéro Checkinatwork. Vide = email de la société.
        </span>
      </label>

      <div className="rounded-md bg-gray-50 dark:bg-gray-700/40 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
        Aucun rappel les samedis, dimanches et jours fériés légaux belges (calculés automatiquement).
        {etat.prochainsFeries.length > 0 && (
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            Prochains :{' '}
            {etat.prochainsFeries.map((f) => `${f.nom} ${f.date.split('-').reverse().join('/')}`).join(' · ')}
          </span>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Autres jours sans rappel (facultatif — congés du bâtiment…)</span>
        <textarea
          rows={3}
          value={form.joursFeries}
          onChange={(e) => setForm({ ...form, joursFeries: e.target.value })}
          placeholder={'2026-12-21:2027-01-01  # Congés d’hiver'}
          className={`mt-1 w-full font-mono ${champ}`}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Une date AAAA-MM-JJ ou une période AAAA-MM-JJ:AAAA-MM-JJ par ligne ; texte après # ignoré.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={enregistrer}
          disabled={enCours || !modifie}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={envoyerMaintenant}
          disabled={enCours || modifie || etat.mode === 'DESACTIVE' || !etat.lienConfigure}
          title={modifie ? 'Enregistre d’abord les réglages' : undefined}
          className="rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 disabled:opacity-50"
        >
          Envoyer le rappel maintenant
        </button>
        {message && (
          <span className={`text-sm ${message.ok ? 'text-green-700 dark:text-green-400' : 'text-red-600'}`}>{message.texte}</span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Destinataires ({aContacter.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {aContacter.map((d) => (
              <li key={d.id}>
                {d.nom} <span className="text-gray-500">— {d.email}</span>
              </li>
            ))}
            {aContacter.length === 0 && <li className="text-gray-500">Aucun.</li>}
          </ul>
          {aProbleme.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold text-amber-700 dark:text-amber-400">
                Non contactés ({aProbleme.length})
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {aProbleme.map((d) => (
                  <li key={d.id}>
                    {d.nom} <span className="text-amber-700 dark:text-amber-400">— {d.probleme}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Rappels du {etat.date.split('-').reverse().join('/')} ({etat.duJour.length})
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {etat.duJour.map((l) => (
              <li key={l.id}>
                <span className="text-gray-500">
                  {new Date(l.createdAt).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })}
                </span>{' '}
                {l.soustraitantNom} → {l.destinataire}
                {l.modeTest && <span className="ml-1 rounded bg-gray-200 dark:bg-gray-700 px-1 text-xs">TEST</span>}
                {l.declencheur === 'MANUEL' && <span className="ml-1 rounded bg-gray-200 dark:bg-gray-700 px-1 text-xs">manuel</span>}
                {l.statut === 'ECHEC' && <span className="ml-1 text-red-600">échec : {l.erreur}</span>}
              </li>
            ))}
            {etat.duJour.length === 0 && <li className="text-gray-500">Aucun rappel aujourd&apos;hui.</li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

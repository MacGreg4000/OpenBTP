// Page publique : chantiers Secotech et leurs numéros Checkinatwork.
//
// Destinée aux sous-traitants (lien envoyé chaque matin). Pas de connexion :
// l'accès repose sur un jeton global unique, régénérable dans Configuration
// si le lien circule trop — l'ancien renvoie alors une 404.
//
// Rendu serveur à chaque requête : la liste doit refléter l'état réel des
// chantiers au moment de la consultation, jamais un cache de la veille.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { jetonCheckinValide, listerChantiersCheckin } from '@/lib/checkin/chantiers'
import CheckinListe from './CheckinListe'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Chantiers – Checkinatwork',
  robots: { index: false, follow: false, nocache: true },
}

export default async function CheckinPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  if (!(await jetonCheckinValide(token))) notFound()

  const chantiers = await listerChantiersCheckin()
  const miseAJour = new Date().toLocaleString('fr-BE', { timeZone: 'Europe/Brussels' })

  return <CheckinListe chantiers={chantiers} miseAJour={miseAJour} />
}

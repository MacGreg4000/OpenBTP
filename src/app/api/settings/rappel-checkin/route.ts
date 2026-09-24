// Réglages du rappel Checkinatwork quotidien + état du jour.
//
// GET : réglages, destinataires prévus (et ceux qui seront ignorés, avec la
//       raison), rappels déjà journalisés aujourd'hui.
// PUT : mode (DESACTIVE | TEST | ACTIF), adresses de test et d'alerte, heure,
//       jours sans rappel supplémentaires (fériés belges automatiques).

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { emailFormatValide } from '@/lib/soustraitants/representant'
import { prochainsJoursFeries } from '@/lib/checkin/jours-feries'
import { MODES_RAPPEL, maintenantBruxelles, lireJoursSansRappel, type ModeRappel } from '@/lib/checkin/envoi'

const ROLES = ['ADMIN', 'MANAGER']

async function autorise() {
  const session = await getServerSession(authOptions)
  return !!session?.user && ROLES.includes(session.user.role)
}

export async function GET() {
  if (!(await autorise())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const s = await prisma.companysettings.findFirst({
    select: {
      rappelCheckinMode: true,
      rappelCheckinEmailTest: true,
      rappelCheckinHeure: true,
      rappelCheckinJoursFeries: true,
      rappelCheckinEmailAlerte: true,
      email: true,
      checkinToken: true,
    },
  })
  const { date } = maintenantBruxelles()

  const sousTraitants = await prisma.soustraitant.findMany({
    where: { actif: true, rappelCheckinActif: true },
    select: {
      id: true,
      nom: true,
      representantEmail: true,
      contrats: { where: { estSigne: true }, select: { id: true }, take: 1 },
    },
    orderBy: { nom: 'asc' },
  })
  const destinataires = sousTraitants.map((st) => ({
    id: st.id,
    nom: st.nom,
    email: st.representantEmail,
    probleme: !st.contrats.length
      ? 'Aucun contrat-cadre signé'
      : !st.representantEmail
        ? 'Email du représentant manquant'
        : null,
  }))

  const duJour = await prisma.rappelCheckinLog.findMany({
    where: { dateRappel: date },
    select: {
      id: true,
      soustraitantNom: true,
      destinataire: true,
      modeTest: true,
      declencheur: true,
      statut: true,
      erreur: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({
    mode: s?.rappelCheckinMode ?? 'DESACTIVE',
    emailTest: s?.rappelCheckinEmailTest ?? '',
    heure: s?.rappelCheckinHeure ?? '06:30',
    joursFeries: s?.rappelCheckinJoursFeries ?? '',
    emailAlerte: s?.rappelCheckinEmailAlerte ?? '',
    emailSociete: s?.email ?? '',
    prochainsFeries: prochainsJoursFeries(date),
    lienConfigure: !!s?.checkinToken,
    date,
    destinataires,
    duJour,
  })
}

export async function PUT(request: Request) {
  if (!(await autorise())) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const s = await prisma.companysettings.findFirst({ select: { id: true } })
  if (!s) return NextResponse.json({ error: 'Paramètres société absents.' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const mode = String(body.mode ?? '') as ModeRappel
  if (!MODES_RAPPEL.includes(mode)) return NextResponse.json({ error: 'Mode invalide.' }, { status: 400 })

  const emailTest = String(body.emailTest ?? '').trim().toLowerCase()
  if (emailTest && !emailFormatValide(emailTest)) {
    return NextResponse.json({ error: `Adresse de test invalide : « ${emailTest} ».` }, { status: 400 })
  }
  if (mode === 'TEST' && !emailTest) {
    return NextResponse.json({ error: 'Le mode test exige une adresse de test.' }, { status: 400 })
  }

  const emailAlerte = String(body.emailAlerte ?? '').trim().toLowerCase()
  if (emailAlerte && !emailFormatValide(emailAlerte)) {
    return NextResponse.json({ error: `Adresse d'alerte invalide : « ${emailAlerte} ».` }, { status: 400 })
  }

  const heure = String(body.heure ?? '06:30').trim()
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(heure) || heure < '05:00' || heure >= '11:00') {
    return NextResponse.json({ error: 'Heure d\'envoi entre 05:00 et 10:59.' }, { status: 400 })
  }

  const joursFeries = String(body.joursFeries ?? '')
  const lignesIllisibles = joursFeries
    .split(/\r?\n/)
    .map((l) => l.split('#')[0].trim())
    .filter((l) => l && lireJoursSansRappel(l).length === 0)
  if (lignesIllisibles.length) {
    return NextResponse.json(
      { error: `Lignes non reconnues : ${lignesIllisibles.join(' ; ')}. Format : AAAA-MM-JJ ou AAAA-MM-JJ:AAAA-MM-JJ.` },
      { status: 400 }
    )
  }

  await prisma.companysettings.update({
    where: { id: s.id },
    data: {
      rappelCheckinMode: mode,
      rappelCheckinEmailTest: emailTest || null,
      rappelCheckinHeure: heure,
      rappelCheckinJoursFeries: joursFeries.trim() || null,
      rappelCheckinEmailAlerte: emailAlerte || null,
    },
  })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'
import { gabaritEmail, paragraphe, ficheInfos, echapperHtml, texteEnHtml } from '@/lib/email/gabarit'
import { societeEmail } from '@/lib/email/societe'

export const dynamic = 'force-dynamic'

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

function buildEmailHtml(params: {
  titre:         string
  entrepriseNom: string
  dateRappel:    Date
  description:   string | null
  societe:       { nom: string; adresse?: string; tva?: string }
}): string {
  const { titre, entrepriseNom, dateRappel, description, societe } = params
  const lignes: [string, string][] = [
    ['Rappel', `<strong>${echapperHtml(titre)}</strong>`],
    ['Entreprise', echapperHtml(entrepriseNom)],
    ['Échéance', `<strong style="color:#B91C1C;">${formatDate(dateRappel)}</strong>`],
  ]
  if (description) lignes.push(['Description', texteEnHtml(description)])
  return gabaritEmail({
    titre: 'Rappel CRM',
    apercu: `${titre} — ${entrepriseNom}, échéance le ${formatDate(dateRappel)}`,
    contenuHtml:
      paragraphe('Un rappel vous a été attribué dans le module CRM d’OpenBTP :') + ficheInfos(lignes),
    mention: 'Cet email a été envoyé automatiquement par OpenBTP.',
    societe,
  })
}

// POST /api/crm/rappels/envoyer-emails - Envoi des rappels échus par email
export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Fin de la journée courante
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)

    // Rappels échus, en attente, non encore envoyés par email
    const rappels = await prisma.prospectRappel.findMany({
      where: {
        dateRappel:   { lte: endOfToday },
        statut:       'EN_ATTENTE',
        emailEnvoye:  false,
      },
      include: {
        entreprise: { select: { nom: true } },
        createur:   { select: { email: true, name: true } },
      },
    })

    let sent = 0
    const societe = await societeEmail()

    for (const rappel of rappels) {
      try {
        const to = rappel.createur?.email
        if (!to) continue

        const html = buildEmailHtml({
          titre:         rappel.titre,
          entrepriseNom: rappel.entreprise.nom,
          dateRappel:    rappel.dateRappel,
          description:   rappel.description,
          societe,
        })

        const subject = `🔔 Rappel CRM : ${rappel.titre}`
        await sendEmail(to, subject, html)

        await prisma.prospectRappel.update({
          where: { id: rappel.id },
          data:  { emailEnvoye: true },
        })

        sent++
      } catch (err) {
        console.error(`Erreur envoi email rappel ${rappel.id}:`, err)
      }
    }

    return NextResponse.json({ success: true, sent })
  } catch (error) {
    console.error('Erreur POST /api/crm/rappels/envoyer-emails:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi des emails de rappel" },
      { status: 500 }
    )
  }
}

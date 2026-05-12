import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'

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
}): string {
  const { titre, entrepriseNom, dateRappel, description } = params

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Rappel CRM</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- En-tête -->
          <tr>
            <td style="background-color:#1f2937;padding:28px 32px;">
              <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;">
                🔔 Rappel CRM
              </p>
            </td>
          </tr>

          <!-- Corps -->
          <tr>
            <td style="padding:32px;">

              <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.6;">
                Un rappel vous a été attribué dans le module CRM de <strong>OpenBTP</strong>.
                Voici les informations correspondantes&nbsp;:
              </p>

              <!-- Carte récapitulative -->
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="8">
                      <tr>
                        <td width="140" style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 0;">
                          Titre
                        </td>
                        <td style="font-size:15px;color:#111827;font-weight:700;padding:6px 0;">
                          ${titre}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 0;">
                          Entreprise
                        </td>
                        <td style="font-size:15px;color:#111827;padding:6px 0;">
                          ${entrepriseNom}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 0;">
                          Date d'échéance
                        </td>
                        <td style="font-size:15px;color:#ef4444;font-weight:600;padding:6px 0;">
                          ${formatDate(dateRappel)}
                        </td>
                      </tr>
                      ${
                        description
                          ? `<tr>
                        <td valign="top" style="font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 0;">
                          Description
                        </td>
                        <td style="font-size:14px;color:#374151;padding:6px 0;line-height:1.6;">
                          ${description.replace(/\n/g, '<br/>')}
                        </td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Note de bas de page -->
              <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;border-top:1px solid #e5e7eb;padding-top:20px;">
                Ce rappel est géré dans le module CRM de OpenBTP.
              </p>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
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

    for (const rappel of rappels) {
      try {
        const to = rappel.createur?.email
        if (!to) continue

        const html = buildEmailHtml({
          titre:         rappel.titre,
          entrepriseNom: rappel.entreprise.nom,
          dateRappel:    rappel.dateRappel,
          description:   rappel.description,
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

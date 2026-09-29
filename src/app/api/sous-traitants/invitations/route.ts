import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { sendEmail } from '@/lib/email-sender'
import { gabaritEmail, paragraphe, encadre, echapperHtml } from '@/lib/email/gabarit'
import { societeEmail } from '@/lib/email/societe'

/**
 * Normalise un numéro de téléphone en format international pour un lien wa.me.
 * Heuristique : conserve les chiffres, gère le préfixe international,
 * et suppose la Belgique (+32) pour les numéros commençant par 0.
 */
function normalizePhoneForWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) {
    digits = digits.slice(1)
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0')) {
    // Numéro national -> préfixe Belgique
    digits = '32' + digits.slice(1)
  }
  digits = digits.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

function buildInvitationEmailHtml(params: {
  nomSousTraitant: string
  companyName: string
  portalUrl: string
  societe: { nom: string; adresse?: string; tva?: string }
}): string {
  const { nomSousTraitant, companyName, portalUrl, societe } = params
  return gabaritEmail({
    titre: `Votre espace ${companyName}`,
    apercu: 'Votre portail sous-traitant : métrés, bons de régie et photos de chantier.',
    contenuHtml:
      paragraphe(`Bonjour ${echapperHtml(nomSousTraitant)},`) +
      paragraphe(
        'Nous vous invitons à utiliser votre espace en ligne pour nous transmettre facilement vos informations : ' +
          '<strong>métrés</strong>, <strong>bons de régie</strong> et <strong>photos de chantier</strong>, et suivre leur traitement.'
      ) +
      encadre(
        'Connectez-vous avec <strong>votre code PIN habituel</strong>. Si vous ne l’avez plus, contactez-nous : nous vous en communiquerons un nouveau.'
      ),
    bouton: { libelle: 'Accéder à mon espace', url: portalUrl },
    lienEnClair: true,
    societe,
  })
}

// POST /api/sous-traitants/invitations
// Body: { soustraitantIds: string[] }
// Envoie un rappel (lien du portail, SANS code PIN) aux sous-traitants sélectionnés.
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as { soustraitantIds?: string[] }
    const ids = Array.isArray(body.soustraitantIds) ? body.soustraitantIds.filter(Boolean) : []
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Aucun sous-traitant sélectionné' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    const [soustraitants, companySettings, pins] = await Promise.all([
      prisma.soustraitant.findMany({
        where: { id: { in: ids } },
        select: { id: true, nom: true, email: true, telephone: true },
      }),
      prisma.companysettings.findFirst(),
      prisma.publicAccessPIN.findMany({
        where: { subjectType: 'SOUSTRAITANT', subjectId: { in: ids }, estActif: true },
        select: { subjectId: true },
      }),
    ])

    const companyName = companySettings?.name || 'Secotech'
    const societe = await societeEmail()
    const pinSet = new Set(pins.map((p) => p.subjectId))

    const results = await Promise.all(
      soustraitants.map(async (st) => {
        const portalUrl = `${baseUrl}/public/portail/soustraitant/${st.id}`
        const hasPin = pinSet.has(st.id)

        const waPhone = normalizePhoneForWhatsApp(st.telephone)
        const waText = `Bonjour ${st.nom}, voici le lien de votre espace ${companyName} pour nous transmettre vos métrés, bons de régie et photos : ${portalUrl} (connexion avec votre code PIN habituel).`
        const whatsappUrl = waPhone
          ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`
          : null

        let sent = false
        if (st.email) {
          const html = buildInvitationEmailHtml({
            nomSousTraitant: st.nom,
            companyName,
            portalUrl,
            societe,
          })
          sent = await sendEmail(st.email, `Votre espace ${companyName} — accès portail`, html)
        }

        return {
          id: st.id,
          nom: st.nom,
          email: st.email || null,
          telephone: st.telephone || null,
          sent,
          hasPin,
          portalUrl,
          whatsappUrl,
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Erreur lors de l\'envoi des invitations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi des invitations' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import nodemailer from 'nodemailer'

export async function POST(
  request: Request,
  props: { params: Promise<{ chantierId: string; soustraitantId: string; commandeId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Récupérer la commande sous-traitant
    const commande = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT 
        c.*,
        ch.nomChantier,
        s.nom as soustraitantNom,
        s.email as soustraitantEmail,
        s.contact as soustraitantContact,
        s.adresse as soustraitantAdresse,
        s.telephone as soustraitantTelephone,
        s.tva as soustraitantTVA
      FROM commande_soustraitant c
      JOIN chantier ch ON c.chantierId = ch.chantierId
      JOIN soustraitant s ON c.soustraitantId = s.id
      WHERE c.id = ${parseInt(params.commandeId)}
      AND c.chantierId = ${params.chantierId}
      AND c.soustraitantId = ${params.soustraitantId}
    `

    if (!commande || commande.length === 0) {
      return NextResponse.json(
        { error: 'Commande sous-traitant non trouvée' },
        { status: 404 }
      )
    }

    const commandeData = commande[0]

    // Vérifier que la commande est verrouillée
    if (!commandeData.estVerrouillee) {
      return NextResponse.json(
        { error: 'La commande doit être validée avant d\'être envoyée par email' },
        { status: 400 }
      )
    }

    // Récupérer les lignes de commande
    const lignes = await prisma.$queryRaw<Array<{ article: string; description: string; type: string; unite: string; prixUnitaire: number; quantite: number; total: number }>>`
      SELECT * FROM ligne_commande_soustraitant
      WHERE commandeSousTraitantId = ${parseInt(params.commandeId)}
      ORDER BY ordre ASC
    `

    // Récupérer les paramètres d'email
    const companySettings = await prisma.companysettings.findUnique({
      where: { id: 'COMPANY_SETTINGS' }
    })

    if (!companySettings) {
      return NextResponse.json(
        { error: 'Paramètres de l\'entreprise non trouvés' },
        { status: 500 }
      )
    }

    if (!companySettings.emailHost || !companySettings.emailUser || !companySettings.emailPassword) {
      return NextResponse.json(
        { error: 'Paramètres d\'email non configurés' },
        { status: 500 }
      )
    }

    // Créer le transporteur d'email
    const transporter = nodemailer.createTransport({
      host: companySettings.emailHost,
      port: companySettings.emailPort ? parseInt(companySettings.emailPort) : 587,
      secure: companySettings.emailSecure || false,
      auth: {
        user: companySettings.emailUser,
        pass: companySettings.emailPassword
      }
    })

    // Helpers formatage nombres
    const toNumber = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))
    const formatNumber = (v: unknown): string => new Intl.NumberFormat('fr-FR').format(toNumber(v))

    // Générer le contenu HTML de l'email
    const emailContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Commande ${commandeData.reference || `#${commandeData.id}`}</h1>
            <p>Bonjour ${commandeData.soustraitantNom},</p>
            <p>Veuillez trouver ci-dessous les détails de votre commande pour le chantier ${commandeData.nomChantier}.</p>
            
            <h2>Détails de la commande</h2>
            <table>
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Unité</th>
                  <th>Prix unitaire</th>
                  <th>Quantité</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${lignes.map((ligne) => `
                  <tr>
                    <td>${ligne.article}</td>
                    <td>${ligne.description}</td>
                    <td>${ligne.type}</td>
                    <td>${ligne.unite}</td>
                    <td>${formatNumber(ligne.prixUnitaire)} €</td>
                    <td>${ligne.quantite}</td>
                    <td>${formatNumber(ligne.total)} €</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="6" class="total">Sous-total</td>
                  <td class="total">${formatNumber(commandeData.sousTotal)} €</td>
                </tr>
                <tr>
                  <td colspan="6" class="total">TVA (${commandeData.tauxTVA}%)</td>
                  <td class="total">${formatNumber(commandeData.tva)} €</td>
                </tr>
                <tr>
                  <td colspan="6" class="total">Total</td>
                  <td class="total">${formatNumber(commandeData.total)} €</td>
                </tr>
              </tfoot>
            </table>
            
            <p>Cordialement,</p>
            <p>${companySettings.name}</p>
          </div>
        </body>
      </html>
    `

    // Envoyer l'email
    const recipient = (commandeData as { soustraitantEmail?: unknown }).soustraitantEmail
    const toEmail = typeof recipient === 'string' && recipient ? recipient : companySettings.email

    await transporter.sendMail({
      from: `"${companySettings.emailFromName || companySettings.name}" <${companySettings.emailFrom || companySettings.email}>`,
      to: toEmail,
      subject: `Commande ${commandeData.reference || `#${commandeData.id}`} - ${commandeData.nomChantier}`,
      html: emailContent
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
} 
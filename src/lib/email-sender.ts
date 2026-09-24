import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma/client'

// Type pour les paramètres d'email
interface EmailSettings {
  emailHost?: string;
  emailPort?: string;
  emailSecure?: boolean;
  emailUser?: string;
  emailPassword?: string;
  emailFrom?: string;
  emailFromName?: string;
  emailCc?: string;
  emailBcc?: string;
}

// Fonction pour créer un transporteur d'email avec les paramètres de la base de données
async function createTransporter() {
  try {
    const settings = await prisma.companysettings.findFirst() as unknown as EmailSettings & { name: string };
    
    if (!settings || !settings.emailHost || !settings.emailUser || !settings.emailPassword) {
      console.warn('Paramètres d\'email non configurés, utilisation des valeurs par défaut')
      return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.example.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASSWORD || ''
        }
      })
    }
    
    return nodemailer.createTransport({
      host: settings.emailHost,
      port: parseInt(settings.emailPort || '587'),
      secure: settings.emailSecure || false,
      auth: {
        user: settings.emailUser,
        pass: settings.emailPassword
      }
    })
  } catch (error) {
    console.error('Erreur lors de la création du transporteur d\'email:', error)
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.example.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || ''
      }
    })
  }
}

/**
 * Envoie un email
 * @param to Adresse email du destinataire
 * @param subject Sujet de l'email
 * @param html Contenu HTML de l'email
 * @returns Promise<boolean> Indique si l'email a été envoyé avec succès
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const transporter = await createTransporter()
    const settings = await prisma.companysettings.findFirst() as unknown as EmailSettings;
    
    const fromEmail = settings?.emailFrom || process.env.EMAIL_FROM || 'noreply@example.com'
    const fromName = settings?.emailFromName || process.env.EMAIL_FROM_NAME || 'Secotech'
    
    // Préparer les options d'envoi
    const mailOptions: {
      from: string
      to: string
      subject: string
      html: string
      cc?: string
      bcc?: string
    } = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html
    };

    // Ajouter Cc si configuré
    if (settings?.emailCc && settings.emailCc.trim()) {
      mailOptions.cc = settings.emailCc.trim();
    }

    // Ajouter Cci si configuré
    if (settings?.emailBcc && settings.emailBcc.trim()) {
      mailOptions.bcc = settings.emailBcc.trim();
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('Email envoyé:', info.messageId)
    return true
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    return false
  }
}

/**
 * Envoie un email avec pièce jointe
 * @param to Adresse(s) email du/des destinataire(s) (string ou array)
 * @param subject Sujet de l'email
 * @param html Contenu HTML de l'email
 * @param attachments Pièces jointes (optionnel)
 * @returns Promise<boolean> Indique si l'email a été envoyé avec succès
 */
export async function sendEmailWithAttachment(
  to: string | string[],
  subject: string,
  html: string,
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
): Promise<boolean> {
  try {
    const transporter = await createTransporter()
    const settings = await prisma.companysettings.findFirst() as unknown as EmailSettings;
    
    const fromEmail = settings?.emailFrom || process.env.EMAIL_FROM || 'noreply@example.com'
    const fromName = settings?.emailFromName || process.env.EMAIL_FROM_NAME || 'Secotech'
    
    // Préparer les options d'envoi
    const mailOptions: {
      from: string
      to: string
      subject: string
      html: string
      attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
      cc?: string
      bcc?: string
    } = {
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html,
      attachments
    };

    // Ajouter Cc si configuré
    if (settings?.emailCc && settings.emailCc.trim()) {
      mailOptions.cc = settings.emailCc.trim();
    }

    // Ajouter Cci si configuré
    if (settings?.emailBcc && settings.emailBcc.trim()) {
      mailOptions.bcc = settings.emailBcc.trim();
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('Email avec pièce jointe envoyé:', info.messageId)
    return true
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email avec pièce jointe:', error)
    return false
  }
}

/**
 * Envoie un email avec le lien de signature du contrat
 * @param to Adresse email du destinataire
 * @param nomSousTraitant Nom du sous-traitant
 * @param nomEntreprise Nom de l'entreprise
 * @param token Token unique du contrat
 * @param cc Adresse email pour la copie carbone (optionnel)
 * @returns Promise<boolean> Indique si l'email a été envoyé avec succès
 */
export async function sendContractSignatureEmail(
  to: string,
  nomSousTraitant: string,
  nomEntreprise: string,
  token: string,
  cc?: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const signatureUrl = `${baseUrl}/contrats/${token}`

  const subject = `Contrat de sous-traitance à signer - ${nomEntreprise}`
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Contrat de sous-traitance à signer</h2>
      
      <p>Bonjour ${nomSousTraitant},</p>
      
      <p>Un contrat de sous-traitance a été généré pour vous par ${nomEntreprise}.</p>
      
      <p>Pour consulter et signer ce contrat, veuillez cliquer sur le lien ci-dessous :</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${signatureUrl}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Consulter et signer le contrat
        </a>
      </p>
      
      <p>Ou copiez-collez ce lien dans votre navigateur :</p>
      <p style="background-color: #f5f5f5; padding: 10px; border-radius: 4px;">${signatureUrl}</p>
      
      <p>Ce lien est personnel et ne doit pas être partagé.</p>
      
      <p>Cordialement,<br>L'équipe ${nomEntreprise}</p>
      
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;">
      <p style="color: #666; font-size: 12px;">
        Cet email a été envoyé automatiquement. Merci de ne pas y répondre.
      </p>
    </div>
  `

  try {
    const transporter = await createTransporter()
    const settings = await prisma.companysettings.findFirst() as unknown as EmailSettings;
    
    const fromEmail = settings?.emailFrom || process.env.EMAIL_FROM || 'noreply@example.com'
    const fromName = settings?.emailFromName || process.env.EMAIL_FROM_NAME || 'Secotech'
    
    // Préparer les options d'envoi
    const mailOptions: {
      from: string
      to: string
      subject: string
      html: string
      cc?: string
      bcc?: string
    } = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html
    };

    // Construire la liste des CC
    const ccList: string[] = []
    
    // Toujours ajouter l'email principal de l'entreprise si fourni (pour les contrats)
    if (cc && cc.trim()) {
      ccList.push(cc.trim())
    }
    
    // Ajouter aussi emailCc si configuré dans les paramètres (pour tous les emails)
    if (settings?.emailCc && settings.emailCc.trim()) {
      // Éviter les doublons
      const emailCcList = settings.emailCc.split(',').map(e => e.trim()).filter(e => e && e !== cc?.trim())
      ccList.push(...emailCcList)
    }
    
    // Si on a des CC, les combiner
    if (ccList.length > 0) {
      mailOptions.cc = ccList.join(', ')
    }

    // Ajouter Cci si configuré
    if (settings?.emailBcc && settings.emailBcc.trim()) {
      mailOptions.bcc = settings.emailBcc.trim();
    }

    const info = await transporter.sendMail(mailOptions)

    console.log('Email envoyé:', info.messageId)
    return true
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error)
    return false
  }
} 
/**
 * Envoi d'un rappel Checkinatwork — variante dédiée, pour la preuve.
 *
 * Différences avec sendEmail :
 *  - renvoie le Message-ID SMTP (conservé dans le journal des rappels) et
 *    l'erreur exacte, au lieu d'un simple booléen ;
 *  - n'ajoute PAS le Cc/Cci global des paramètres : il produirait une copie
 *    par sous-traitant et par jour, et un Cc serait visible des sous-traitants ;
 *  - Reply-To explicite, version texte jointe à la version HTML ;
 *  - EMAIL_DRY_RUN=true : rien n'est envoyé, l'envoi est seulement journalisé.
 */
export async function envoyerEmailRappel(p: {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}): Promise<{ ok: boolean; messageId?: string; erreur?: string }> {
  if (process.env.EMAIL_DRY_RUN === 'true') {
    console.log(`[EMAIL_DRY_RUN] Rappel non envoyé → ${p.to} — ${p.subject}`)
    return { ok: true, messageId: `dry-run-${Date.now()}` }
  }
  try {
    const transporter = await createTransporter()
    const settings = await prisma.companysettings.findFirst() as unknown as EmailSettings
    const fromEmail = settings?.emailFrom || process.env.EMAIL_FROM || 'noreply@example.com'
    const fromName = settings?.emailFromName || process.env.EMAIL_FROM_NAME || 'Secotech'
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: p.to,
      replyTo: p.replyTo,
      subject: p.subject,
      html: p.html,
      text: p.text,
    })
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    return { ok: false, erreur: error instanceof Error ? error.message : String(error) }
  }
}

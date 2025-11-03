import nodemailer from 'nodemailer';
import { prisma } from '../prisma/client';

// Types pour les données d'envoi d'emails
interface EmailData {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Configuration du transporteur email
async function getTransporter() {
  try {
    // Récupérer les paramètres de configuration d'email depuis la base de données
    const settings = await prisma.companysettings.findFirst();

    if (!settings || !settings.emailHost || !settings.emailUser || !settings.emailPassword) {
      throw new Error('Configuration email non trouvée ou incomplète');
    }

    return nodemailer.createTransport({
      host: settings.emailHost,
      port: parseInt(settings.emailPort || '587'),
      secure: settings.emailSecure || false,
      auth: {
        user: settings.emailUser,
        pass: settings.emailPassword
      }
    });
  } catch (error) {
    console.error('Erreur lors de la configuration du transporteur email:', error);
    throw error;
  }
}

// Envoyer un email
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    const transporter = await getTransporter();
    
    const settings = await prisma.companysettings.findFirst();

    if (!settings) {
      throw new Error('Configuration de l\'entreprise non trouvée');
    }

    // Préparer les options d'envoi
    const mailOptions: any = {
      from: `"${settings.emailFromName || settings.name}" <${settings.emailFrom || settings.email}>`,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html
    };

    // Ajouter Cc si configuré
    if (settings.emailCc && settings.emailCc.trim()) {
      mailOptions.cc = settings.emailCc.trim();
    }

    // Ajouter Cci si configuré
    if (settings.emailBcc && settings.emailBcc.trim()) {
      mailOptions.bcc = settings.emailBcc.trim();
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('Email envoyé:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return false;
  }
}

// Notification lorsqu'une remarque est marquée comme résolue
export async function notifyRemarqueResolved(remarqueId: string): Promise<boolean> {
  try {
    // Récupérer les informations de la remarque
    const remarque = await prisma.$queryRaw`
      SELECT 
        rr.id, rr.description, rr.localisation,
        rc.id as receptionId, rc.chantierId,
        c.nomChantier
      FROM remarque_reception rr
      JOIN reception_chantier rc ON rr.receptionId = rc.id
      JOIN Chantier c ON rc.chantierId = c.chantierId
      WHERE rr.id = ${remarqueId}
    `;

    if (!remarque || (remarque as unknown[]).length === 0) {
      throw new Error('Remarque non trouvée');
    }

    const remarqueData = (remarque as unknown as Array<{ id: string; description: string; localisation: string | null; receptionId: string; chantierId: string; nomChantier: string }>)[0];

    // Récupérer les tags pour trouver les destinataires
    const tags = await prisma.$queryRaw`
      SELECT nom, email 
      FROM tag_remarque 
      WHERE remarqueId = ${remarqueId} 
      AND email IS NOT NULL
    `;

    // Récupérer l'administrateur du chantier
    const admin = await prisma.$queryRaw`
      SELECT u.email, u.name
      FROM User u
      JOIN reception_chantier rc ON u.id = rc.createdBy
      WHERE rc.id = ${remarqueData.receptionId}
    `;

    if (!admin || (admin as unknown[]).length === 0) {
      throw new Error('Administrateur non trouvé');
    }

    const adminData = (admin as unknown as Array<{ email: string; name: string }>)[0];

    // Construire la liste des destinataires
    const recipients = [
      adminData.email,
      ...((tags as unknown as Array<{ email: string | null | undefined }>)
        .filter(tag => Boolean(tag.email))
        .map(tag => String(tag.email)))
    ];

    // Éviter les doublons
    const uniqueRecipients = [...new Set(recipients)].join(',');

    // Construire l'email
    const emailData: EmailData = {
      to: uniqueRecipients,
      subject: `[Chantier ${remarqueData.nomChantier}] Remarque marquée comme résolue`,
      text: `
Une remarque a été marquée comme résolue sur le chantier ${remarqueData.nomChantier}.

Description: ${remarqueData.description}
${remarqueData.localisation ? `Localisation: ${remarqueData.localisation}` : ''}

Veuillez vous connecter à l'application pour valider cette résolution.
      `,
      html: `
<h2>Remarque marquée comme résolue</h2>
<p>Une remarque a été marquée comme résolue sur le chantier <strong>${remarqueData.nomChantier}</strong>.</p>
<ul>
  <li><strong>Description:</strong> ${remarqueData.description}</li>
  ${remarqueData.localisation ? `<li><strong>Localisation:</strong> ${remarqueData.localisation}</li>` : ''}
</ul>
<p>Veuillez vous connecter à l'application pour valider cette résolution.</p>
      `
    };

    return await sendEmail(emailData);
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la notification de résolution:', error);
    return false;
  }
}

// Notification lorsque la date limite approche (7 jours avant)
export async function notifyDeadlineApproaching(): Promise<void> {
  try {
    // Trouver les réceptions dont la date limite est dans 7 jours
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() + 7);
    
    // Formater la date pour la requête SQL
    const dateLimitFormatted = dateLimit.toISOString().split('T')[0];
    
    const receptions = await prisma.$queryRaw<
      Array<{ id: string; dateLimite: string | Date; chantierId: string; nomChantier: string; adminEmail: string; adminName: string; totalRemarques: number; remarquesValidees: number }>
    >`
      SELECT 
        rc.id, rc.dateLimite, rc.chantierId,
        c.nomChantier,
        u.email as adminEmail, u.name as adminName,
        (SELECT COUNT(*) FROM remarque_reception rr WHERE rr.receptionId = rc.id) as totalRemarques,
        (SELECT COUNT(*) FROM remarque_reception rr WHERE rr.receptionId = rc.id AND rr.estValidee = 1) as remarquesValidees
      FROM reception_chantier rc
      JOIN Chantier c ON rc.chantierId = c.chantierId
      JOIN User u ON rc.createdBy = u.id
      WHERE DATE(rc.dateLimite) = ${dateLimitFormatted}
      AND rc.estFinalise = 0
    `;

    // Pour chaque réception, envoyer un email
    for (const reception of receptions) {
      // Récupérer tous les tags avec email pour cette réception
      const tags = await prisma.$queryRaw`
        SELECT DISTINCT tr.email
        FROM tag_remarque tr
        JOIN remarque_reception rr ON tr.remarqueId = rr.id
        WHERE rr.receptionId = ${reception.id}
        AND tr.email IS NOT NULL
      `;

      // Construire la liste des destinataires
      const recipients = [
        reception.adminEmail,
        ...((tags as unknown as Array<{ email: string | null | undefined }>)
          .filter(tag => Boolean(tag.email))
          .map(tag => String(tag.email)))
      ];

      // Éviter les doublons
      const uniqueRecipients = [...new Set(recipients)].join(',');

      // Calculer le pourcentage de résolution
      const progressPercent = reception.totalRemarques > 0
        ? Math.round((reception.remarquesValidees / reception.totalRemarques) * 100)
        : 0;

      // Construire l'email
      const emailData: EmailData = {
        to: uniqueRecipients,
        subject: `[URGENT] Date limite de réception approche pour le chantier ${reception.nomChantier}`,
        text: `
RAPPEL IMPORTANT: La date limite de la réception du chantier ${reception.nomChantier} est dans 7 jours (${new Date(reception.dateLimite).toLocaleDateString()}).

Progression actuelle: ${reception.remarquesValidees}/${reception.totalRemarques} remarques validées (${progressPercent}%)

Veuillez vous connecter à l'application pour terminer la résolution des remarques en attente.
        `,
        html: `
<h2>RAPPEL IMPORTANT: Date limite qui approche</h2>
<p>La date limite de la réception du chantier <strong>${reception.nomChantier}</strong> est dans <strong>7 jours</strong> (${new Date(reception.dateLimite).toLocaleDateString()}).</p>
<p>Progression actuelle: ${reception.remarquesValidees}/${reception.totalRemarques} remarques validées (${progressPercent}%)</p>
<p>Veuillez vous connecter à l'application pour terminer la résolution des remarques en attente.</p>
        `
      };

      await sendEmail(emailData);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi des notifications de date limite:', error);
  }
} 
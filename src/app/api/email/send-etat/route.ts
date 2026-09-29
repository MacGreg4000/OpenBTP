import { gabaritEmail, paragraphe, texteEnHtml, echapperHtml } from '@/lib/email/gabarit'
import { societeEmail } from '@/lib/email/societe'
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma/client';
import nodemailer from 'nodemailer';
import { generateEtatAvancementHTML } from '@/lib/pdf/templates/etat-avancement-template';
import { roundToTwoDecimals } from '@/utils/calculs';

// Ancienne simulation PDF supprimée (non utilisée)

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      etatAvancementId,
      chantierId, // CUID du chantier
      recipients,
      cc,
      subject,
      body: emailBody,
    } = body;

    if (!etatAvancementId || !chantierId || !subject || !emailBody) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const toList: string[] = Array.isArray(recipients) ? recipients.filter((r) => typeof r === 'string' && r.trim().length > 0) : [];
    const ccList: string[] = Array.isArray(cc) ? cc.filter((r) => typeof r === 'string' && r.trim().length > 0) : [];

    if (toList.length === 0) {
      return NextResponse.json({ error: 'Aucun destinataire fourni' }, { status: 400 });
    }

    // 1. Récupérer les détails de l'état d'avancement et du chantier
    console.log('🔍 Recherche de l\'état d\'avancement ID:', etatAvancementId);
    console.log('🔍 Chantier ID attendu:', chantierId);
    
    const etatAvancement = await prisma.etatAvancement.findUnique({
      where: { id: etatAvancementId },
      include: { 
        Chantier: { include: { client: true } },
        lignes: { orderBy: { id: 'asc' } },
        avenants: { orderBy: { id: 'asc' } }
      },
    });

    if (!etatAvancement) {
      console.error('❌ État d\'avancement non trouvé pour ID:', etatAvancementId);
      return NextResponse.json({ error: `État d'avancement non trouvé (ID: ${etatAvancementId})` }, { status: 404 });
    }

    if (!etatAvancement.Chantier) {
      console.error('❌ Chantier manquant pour l\'état d\'avancement:', {
        etatId: etatAvancement.id,
        chantierId: etatAvancement.chantierId
      });
      return NextResponse.json({ 
        error: `Chantier manquant pour l'état d'avancement (chantierId: ${etatAvancement.chantierId})` 
      }, { status: 500 });
    }

    // Vérifier la cohérence avec l'ID externe (chantierId) au lieu de l'ID interne
    if (etatAvancement.Chantier.chantierId !== chantierId) {
      console.error('❌ Incohérence entre état d\'avancement et chantier:', {
        etatChantierIdExterne: etatAvancement.Chantier.chantierId,
        expectedChantierId: chantierId
      });
      return NextResponse.json({ 
        error: `Incohérence: l'état d'avancement appartient au chantier ${etatAvancement.Chantier.chantierId} mais ${chantierId} était attendu` 
      }, { status: 400 });
    }

    console.log('✅ Données de l\'état d\'avancement validées');

    // Vérification de sécurité supplémentaire avant de continuer
    if (!etatAvancement.Chantier?.chantierId) {
      console.error('❌ Chantier.chantierId manquant après validation:', {
        hasChantier: !!etatAvancement.Chantier,
        chantierId: etatAvancement.Chantier?.chantierId
      });
      return NextResponse.json({ 
        error: 'Données du chantier incomplètes après validation' 
      }, { status: 500 });
    }

    console.log('✅ Chantier.chantierId validé:', etatAvancement.Chantier.chantierId);

    // 2. Récupérer les paramètres SMTP de l'application depuis la table companysettings
    const companySettingsRaw = await prisma.companysettings.findUnique({
      where: { id: "COMPANY_SETTINGS" }
    }); 
    if (!companySettingsRaw || !companySettingsRaw.emailHost || !companySettingsRaw.emailPort || !companySettingsRaw.emailUser || !companySettingsRaw.emailPassword) {
      return NextResponse.json({ error: 'Paramètres SMTP non configurés (companysettings)' }, { status: 500 });
    }

    // 3. Récupérer les paramètres formatés pour le PDF (avec logo en base64)
    const { PDFGenerator } = await import('@/lib/pdf/pdf-generator');
    const companySettings = await PDFGenerator.getCompanySettings();
    if (!companySettings) {
      return NextResponse.json({ error: 'Paramètres entreprise non trouvés' }, { status: 500 });
    }

    // 4. Générer le PDF de l'état d'avancement avec le nouveau système Puppeteer
    console.log('📄 Génération du PDF...');
    console.log('📄 Données pour génération:', {
      hasEtatAvancement: !!etatAvancement,
      hasChantier: !!etatAvancement.Chantier,
      chantierId: etatAvancement.Chantier?.chantierId,
      numero: etatAvancement.numero,
      hasCompanySettings: !!companySettings,
      hasLogo: !!companySettings?.logo,
      logoLength: companySettings?.logo?.length || 0,
      logoStart: companySettings?.logo?.substring(0, 50) || 'NO_LOGO'
    });
    
    // Transformer les données Prisma vers le format attendu par le template
    const templateData = {
      numero: etatAvancement.numero,
      date: etatAvancement.date,
      estFinalise: etatAvancement.estFinalise,
      mois: etatAvancement.mois?.toString(),
      commentaires: etatAvancement.commentaires || '',
      
      chantier: {
        nomChantier: etatAvancement.Chantier.nomChantier,
        adresseChantier: etatAvancement.Chantier.adresseChantier || '',
        chantierId: etatAvancement.Chantier.chantierId
      },
      
      client: {
        nom: etatAvancement.Chantier.client.nom,
        adresse: etatAvancement.Chantier.client.adresse || ''
      },
      
      lignes: etatAvancement.lignes.map(ligne => ({
        article: ligne.article || '',
        description: ligne.description || '',
        type: ligne.type || '',
        unite: ligne.unite || '',
        prixUnitaire: Number(ligne.prixUnitaire) || 0,
        quantite: Number(ligne.quantite) || 0,
        quantitePrecedente: Number(ligne.quantitePrecedente) || 0,
        quantiteActuelle: Number(ligne.quantiteActuelle) || 0,
        quantiteTotale: Number(ligne.quantiteTotale) || 0,
        montantPrecedent: Number(ligne.montantPrecedent) || 0,
        montantActuel: Number(ligne.montantActuel) || 0,
        montantTotal: Number(ligne.montantTotal) || 0
      })),
      
      avenants: etatAvancement.avenants.map(avenant => ({
        article: avenant.article || '',
        description: avenant.description || '',
        type: avenant.type || '',
        unite: avenant.unite || '',
        prixUnitaire: Number(avenant.prixUnitaire) || 0,
        quantite: Number(avenant.quantite) || 0,
        quantitePrecedente: Number(avenant.quantitePrecedente) || 0,
        quantiteActuelle: Number(avenant.quantiteActuelle) || 0,
        quantiteTotale: Number(avenant.quantiteTotale) || 0,
        montantPrecedent: Number(avenant.montantPrecedent) || 0,
        montantActuel: Number(avenant.montantActuel) || 0,
        montantTotal: Number(avenant.montantTotal) || 0
      })),
      
      // Calculer les totaux
      totalCommandeInitiale: {
        precedent: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantPrecedent) || 0), 0)),
        actuel: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantActuel) || 0), 0)),
        total: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantTotal) || 0), 0))
      },
      
      totalAvenants: {
        precedent: roundToTwoDecimals(etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantPrecedent) || 0), 0)),
        actuel: roundToTwoDecimals(etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantActuel) || 0), 0)),
        total: roundToTwoDecimals(etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantTotal) || 0), 0))
      },
      
      totalGeneral: {
        precedent: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantPrecedent) || 0), 0) + 
                   etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantPrecedent) || 0), 0)),
        actuel: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantActuel) || 0), 0) + 
                etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantActuel) || 0), 0)),
        total: roundToTwoDecimals(etatAvancement.lignes.reduce((sum, ligne) => sum + (Number(ligne.montantTotal) || 0), 0) + 
               etatAvancement.avenants.reduce((sum, avenant) => sum + (Number(avenant.montantTotal) || 0), 0))
      }
    };
    
    console.log('📄 Données transformées pour le template:', {
      hasChantier: !!templateData.chantier,
      chantierId: templateData.chantier.chantierId,
      lignesCount: templateData.lignes.length,
      avenantsCount: templateData.avenants.length
    });
    
    const htmlContent = generateEtatAvancementHTML(
      templateData,
      companySettings,
      'client'
    );
    
    console.log('📄 HTML généré, création du PDF...');
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      orientation: 'landscape',
      format: 'A4',
      margins: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
        left: '10mm'
      }
    });
    
    console.log('📄 PDF généré, création du nom de fichier...');
    const pdfFileName = `Etat_Avancement_${templateData.chantier.chantierId}_N${templateData.numero}.pdf`;
    console.log('📄 Nom du fichier PDF:', pdfFileName);

    // 5. Configurer Nodemailer
    const transporter = nodemailer.createTransport({
      host: companySettingsRaw.emailHost,
      port: Number(companySettingsRaw.emailPort),
      secure: companySettingsRaw.emailSecure || false,
      auth: {
        user: companySettingsRaw.emailUser,
        pass: companySettingsRaw.emailPassword,
      },
      tls: {
        // Laisser rejectUnauthorized à sa valeur par défaut (true) si non spécifié dans companysettings
      }
    });

    // 6. Envoyer l'e-mail
    const mailOptions: {
      from: string
      to: string
      subject: string
      html: string
      attachments: Array<{ filename: string; content: Buffer; contentType: string }>
      cc?: string
      bcc?: string
    } = {
      from: `"${companySettingsRaw.name || 'Votre Entreprise'}" <${companySettingsRaw.emailFrom || companySettingsRaw.emailUser}>`,
      to: toList.join(','),
      subject: subject,
      html: gabaritEmail({
        titre: subject,
        contenuHtml: paragraphe(texteEnHtml(emailBody)) + paragraphe(`<span style="color:#6B7280;font-size:13px;">📎 ${echapperHtml(pdfFileName)}</span>`),
        societe: await societeEmail(),
      }),
      attachments: [
        {
          filename: pdfFileName,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    // Ajouter Cc combiné (configuration + saisie utilisateur)
    const ccConfigured = companySettingsRaw.emailCc?.trim();
    const ccCombined = [...ccList, ...(ccConfigured ? [ccConfigured] : [])];
    if (ccCombined.length > 0) {
      mailOptions.cc = ccCombined.join(',');
    }

    // Ajouter Cci si configuré
    if (companySettingsRaw.emailBcc && companySettingsRaw.emailBcc.trim()) {
      mailOptions.bcc = companySettingsRaw.emailBcc.trim();
    }

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'E-mail envoyé avec succès' });

  } catch (error: unknown) {
    console.error('Erreur API send-etat:', error);
    return NextResponse.json({ error: (error as Error).message || 'Erreur serveur interne' }, { status: 500 });
  }
} 
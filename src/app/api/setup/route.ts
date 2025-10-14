import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma/client';

export async function POST(request: NextRequest) {
  try {
    const { company, admin } = await request.json();

    // Vérifier si l'application est déjà configurée
    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: 'L\'application est déjà configurée' },
        { status: 400 }
      );
    }

    // Vérifier les données requises
    if (!company?.name || !company?.address || !company?.email || !company?.tva) {
      return NextResponse.json(
        { error: 'Toutes les informations obligatoires de la société sont requises (nom, adresse, email, TVA)' },
        { status: 400 }
      );
    }

    if (!admin?.email || !admin?.password || !admin?.prenom || !admin?.nom) {
        return NextResponse.json(
        { error: 'Toutes les informations de l\'administrateur sont requises' },
            { status: 400 }
        );
    }

    // Hacher le mot de passe
    const hashedPassword = await hash(admin.password, 12);

    // Créer les données de l'entreprise et l'utilisateur admin dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer ou mettre à jour les paramètres de l'entreprise
      const companySettings = await tx.companysettings.upsert({
        where: { id: 'COMPANY_SETTINGS' },
        update: {
          name: company.name,
          address: company.address,
          zipCode: company.zipCode,
          city: company.city,
          phone: company.phone,
          email: company.email,
          tva: company.tva,
          iban: company.iban || null,
        },
        create: {
          id: 'COMPANY_SETTINGS',
          name: company.name,
          address: company.address,
          zipCode: company.zipCode,
          city: company.city,
          phone: company.phone,
          email: company.email,
          tva: company.tva,
          iban: company.iban || null,
          updatedAt: new Date(),
        },
      });

      // Créer l'utilisateur administrateur
      const adminUser = await tx.user.create({
        data: {
          id: `user_${Date.now()}`,
          email: admin.email,
          password: hashedPassword,
          name: `${admin.prenom} ${admin.nom}`,
          role: 'ADMIN',
          updatedAt: new Date(),
        },
      });

      return { companySettings, adminUser };
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration initiale terminée avec succès',
      data: {
        company: result.companySettings.name,
        adminEmail: result.adminUser.email,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la configuration initiale:', error);

    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('email')) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 400 }
        );
      }
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'Des données en conflit existent déjà' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la configuration' },
      { status: 500 }
    );
  }
}

// Endpoint pour vérifier si l'application est déjà configurée
export async function GET() {
  try {
    const userCount = await prisma.user.count();
    const companySettings = await prisma.companysettings.findFirst();

    const isConfigured = userCount > 0 && companySettings;

    return NextResponse.json({
      isConfigured,
      userCount,
      hasCompanySettings: !!companySettings,
    });
  } catch (error) {
    console.error('Erreur lors de la vérification de la configuration:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la vérification de la configuration' },
      { status: 500 }
    );
  }
} 
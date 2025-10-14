import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const companySettings = await prisma.companysettings.findUnique({
      where: { id: 'COMPANY_SETTINGS' },
    });

    if (!companySettings) {
      return NextResponse.json({ error: 'Paramètres de l\'entreprise non trouvés' }, { status: 404 });
    }

    // Retourner uniquement les champs nécessaires, par exemple le nom
    return NextResponse.json({ name: companySettings.name, email: companySettings.email, emailFrom: companySettings.emailFrom, emailUser: companySettings.emailUser });

  } catch (error: unknown) {
    console.error('Erreur API get company settings:', error);
    return NextResponse.json({ error: (error as Error).message || 'Erreur serveur interne' }, { status: 500 });
  }
} 
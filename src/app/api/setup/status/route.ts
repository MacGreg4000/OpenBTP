import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';

export async function GET() {
  try {
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const companySettings = await prisma.companysettings.findFirst(); // Ou findUnique({ where: { id: 'COMPANY_SETTINGS' } })

    const isSetupComplete = !!adminUser && !!companySettings;

    return NextResponse.json({ isSetupComplete });
  } catch (error) {
    console.error('[API Setup Status] Erreur lors de la vérification du setup:', error);
    // En cas d'erreur (DB non accessible, etc.), on peut considérer que le setup n'est pas complet
    // ou renvoyer une erreur 500 pour que le middleware gère cela.
    // Renvoyer false est plus sûr pour éviter les boucles si la DB n'est pas prête.
    return NextResponse.json({ isSetupComplete: false, error: 'Erreur serveur lors de la vérification du statut.' }, { status: 500 });
  }
} 
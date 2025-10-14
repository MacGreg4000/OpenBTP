import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/messaging/users?search=xxx - Rechercher des utilisateurs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const currentUserId = session.user.id;
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('search') || '';
    
    if (searchTerm.length < 2) {
      return NextResponse.json([]);
    }
    
    // Rechercher des utilisateurs correspondant au terme de recherche
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm } },
          { email: { contains: searchTerm } },
        ],
        id: { not: currentUserId }, // Exclure l'utilisateur actuel
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      take: 10, // Limiter le nombre de résultats
    });
    
    return NextResponse.json(users);
  } catch (error) {
    console.error('Erreur lors de la recherche d\'utilisateurs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 
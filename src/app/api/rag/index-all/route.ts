// API pour indexer toute la base de données
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ragService } from '@/lib/rag/rag-service';

export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 });
    }

    console.log('🔄 Début de l\'indexation complète par:', session.user.email);

    // Lancer l'indexation complète
    await ragService.indexAllData();

    console.log('✅ Indexation complète terminée');

    return NextResponse.json({ 
      success: true, 
      message: 'Indexation complète de la base de données terminée avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'indexation complète:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'indexation complète' },
      { status: 500 }
    );
  }
}

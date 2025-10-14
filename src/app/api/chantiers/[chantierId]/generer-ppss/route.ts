import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generatePPSS } from '@/lib/ppss-generator'
import * as path from 'path'

export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  const params = await props.params;
  try {
    console.log('Début de la génération du PPSS pour le chantier:', params.chantierId);
    console.log('Chemin du dossier uploads:', path.join(process.cwd(), 'public', 'uploads'));
    
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      console.log('Erreur d\'authentification: utilisateur non authentifié');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    
    console.log('Utilisateur authentifié:', session.user.id);
    
    // Générer le PPSS
    const document = await generatePPSS(params.chantierId, session.user.id)
    
    console.log('PPSS généré avec succès, URL:', document);
    return NextResponse.json(document)
  } catch (error: unknown) {
    console.error('Erreur détaillée lors de la génération du PPSS:', error)
    return NextResponse.json(
      { error: `Erreur lors de la génération du PPSS: ${(error as Error).message}` },
      { status: 500 }
    )
  }
} 
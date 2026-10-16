import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { envoyerDeclaration, piecesDeclaration, TAILLE_MAX_PIECES, type ModeDeclaration } from '@/lib/declarations/sous-traitance'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Aperçu des pièces jointes : ?soustraitants=id1,id2
 * → par sous-traitant, les personnes actives, les pièces jointes et ce qui manque.
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const ids = (new URL(request.url).searchParams.get('soustraitants') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const societes = await piecesDeclaration(ids)
  return NextResponse.json({
    tailleMax: TAILLE_MAX_PIECES,
    societes: societes.map((s) => ({
      id: s.id,
      nom: s.nom,
      tva: s.tva,
      personnes: s.personnes,
      pieces: s.pieces.map((p) => ({ personne: p.personne, libelle: p.libelle, nomFichier: p.nomFichier, taille: p.taille })),
      manques: s.manques,
    })),
  })
}

/** Envoi : { mode: 'simple' | 'documents', soustraitantIds: string[], destinataireEmail } */
export async function POST(request: Request, props: { params: Promise<{ chantierId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { chantierId } = await props.params
    const body = await request.json()
    const mode: ModeDeclaration = body.mode === 'documents' ? 'documents' : 'simple'
    const soustraitantIds: string[] = Array.isArray(body.soustraitantIds) ? body.soustraitantIds.filter((x: unknown) => typeof x === 'string') : []
    const destinataire = typeof body.destinataireEmail === 'string' ? body.destinataireEmail.trim() : ''

    if (!soustraitantIds.length) return NextResponse.json({ error: 'Sélectionnez au moins un sous-traitant' }, { status: 400 })
    if (!EMAIL.test(destinataire)) return NextResponse.json({ error: 'Adresse email du destinataire invalide' }, { status: 400 })

    const r = await envoyerDeclaration({ chantierId, mode, soustraitantIds, destinataire, userId: session.user?.id })
    if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: r.status || 500 })
    return NextResponse.json({ success: true, attachmentsCount: r.pieces })
  } catch (error) {
    console.error("Erreur lors de l'envoi de la déclaration:", error)
    return NextResponse.json({ error: "Erreur lors de l'envoi de la déclaration" }, { status: 500 })
  }
}

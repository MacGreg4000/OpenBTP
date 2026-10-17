import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ajouterPiece, ErreurPiece, listerPieces, trouverEtat } from '@/lib/etats/pieces-jointes'

type Params = { params: Promise<{ chantierId: string; etatId: string }> }

// GET : photos et fichiers joints à l'état (etatId = numéro de l'état)
export async function GET(_request: Request, props: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { chantierId, etatId } = await props.params
  const etat = await trouverEtat(chantierId, etatId)
  if (!etat) return NextResponse.json({ error: 'État introuvable' }, { status: 404 })
  return NextResponse.json({ pieces: await listerPieces(etat.id), estFinalise: etat.estFinalise })
}

// POST (multipart, champ « fichiers », plusieurs possibles)
export async function POST(request: Request, props: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { chantierId, etatId } = await props.params
  const etat = await trouverEtat(chantierId, etatId)
  if (!etat) return NextResponse.json({ error: 'État introuvable' }, { status: 404 })

  const form = await request.formData()
  const fichiers = form.getAll('fichiers').filter((f): f is File => typeof f === 'object' && f !== null && 'arrayBuffer' in f && (f as File).size > 0)
  if (!fichiers.length) return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })

  const ajoutees = []
  const erreurs: string[] = []
  for (const f of fichiers) {
    try {
      ajoutees.push(await ajouterPiece(etat.id, f, session.user?.name || session.user?.email || undefined))
    } catch (e) {
      erreurs.push(e instanceof ErreurPiece ? e.message : `${f.name} : erreur d'enregistrement`)
      if (!(e instanceof ErreurPiece)) console.error('[ETAT] Pièce jointe non enregistrée :', e)
    }
  }
  return NextResponse.json({ pieces: ajoutees, erreurs }, { status: ajoutees.length ? 201 : 400 })
}

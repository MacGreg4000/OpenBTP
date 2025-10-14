import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Depense } from '@/types/depense'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Définir le chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// GET /api/chantiers/[chantierId]/depenses/[depenseId]
export async function GET(
  request: Request,
  props: { params: Promise<{ chantierId: string, depenseId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const depenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE id = ${params.depenseId} AND chantierId = ${params.chantierId}
    `
    
    const depense = depenses[0]

    if (!depense) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    return NextResponse.json(depense)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de la dépense' },
      { status: 500 }
    )
  }
}

// PUT /api/chantiers/[chantierId]/depenses/[depenseId]
export async function PUT(
  request: Request,
  props: { params: Promise<{ chantierId: string, depenseId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData();
    
    // Extraire les données du formulaire
    const date = formData.get('date') as string;
    const montant = parseFloat(formData.get('montant') as string);
    const description = formData.get('description') as string;
    const categorie = formData.get('categorie') as string;
    const fournisseur = formData.get('fournisseur') as string || null;
    const reference = formData.get('reference') as string || null;
    
    // Vérifier les champs obligatoires
    if (!date || isNaN(montant) || !description || !categorie) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Vérifier si la dépense existe
    const existingDepenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE id = ${params.depenseId} AND chantierId = ${params.chantierId}
    `
    
    const existingDepense = existingDepenses[0]

    if (!existingDepense) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    // Gérer le justificatif si présent
    let justificatifUrl = existingDepense.justificatif;
    const file = formData.get('justificatif') as File;
    
    if (file && file.size > 0) {
      try {
        // Créer le dossier des documents si nécessaire
        const chantierDir = join(DOCUMENTS_BASE_PATH, params.chantierId)
        
        // Créer d'abord le dossier de base s'il n'existe pas
        await mkdir(DOCUMENTS_BASE_PATH, { recursive: true })
        // Puis créer le sous-dossier du chantier
        await mkdir(chantierDir, { recursive: true })
        
        // Générer un nom de fichier unique pour éviter les conflits
        const timestamp = Date.now()
        const fileName = `justificatif_${timestamp}_${file.name}`
        const filePath = join(chantierDir, fileName)
        
        // Écrire le fichier
        const buffer = Buffer.from(await file.arrayBuffer())
        await writeFile(filePath, buffer)
        
        // Créer l'entrée dans la table document
        const document = await prisma.document.create({
          data: {
            nom: fileName,
            type: 'justificatif-depense', // Type spécial pour les justificatifs de dépenses
            url: `/uploads/documents/${params.chantierId}/${fileName}`,
            taille: file.size,
            mimeType: file.type,
            chantierId: params.chantierId,
            createdBy: session.user.id || '',
            updatedAt: new Date()
          }
        })
        
        // Utiliser l'URL du document pour le justificatif
        justificatifUrl = document.url
      } catch (error) {
        console.error('Erreur lors du traitement du justificatif:', error)
        return NextResponse.json(
          { error: 'Erreur lors du traitement du justificatif' },
          { status: 500 }
        )
      }
    }

    // Mettre à jour la dépense
    await prisma.$executeRaw`
      UPDATE depense
      SET 
        date = ${new Date(date)},
        montant = ${montant},
        description = ${description},
        categorie = ${categorie},
        fournisseur = ${fournisseur},
        reference = ${reference},
        justificatif = ${justificatifUrl},
        updatedAt = NOW()
      WHERE id = ${params.depenseId}
    `
    
    // Récupérer la dépense mise à jour
    const updatedDepenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE id = ${params.depenseId}
    `
    
    const depense = updatedDepenses[0]

    return NextResponse.json(depense)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la dépense' },
      { status: 500 }
    )
  }
}

// DELETE /api/chantiers/[chantierId]/depenses/[depenseId]
export async function DELETE(
  request: Request,
  props: { params: Promise<{ chantierId: string, depenseId: string }> }
) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    // Vérifier si la dépense existe
    const existingDepenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE id = ${params.depenseId} AND chantierId = ${params.chantierId}
    `
    
    const existingDepense = existingDepenses[0]

    if (!existingDepense) {
      return NextResponse.json(
        { error: 'Dépense non trouvée' },
        { status: 404 }
      )
    }

    // Supprimer la dépense
    await prisma.$executeRaw`
      DELETE FROM depense
      WHERE id = ${params.depenseId}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la dépense' },
      { status: 500 }
    )
  }
} 
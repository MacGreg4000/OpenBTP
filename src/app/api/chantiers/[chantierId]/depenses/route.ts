import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Depense } from '@/types/depense'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// Définir le chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// GET /api/chantiers/[chantierId]/depenses
export async function GET(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const depenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE chantierId = ${chantierId}
      ORDER BY date DESC
    `

    return NextResponse.json(depenses)
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des dépenses' },
      { status: 500 }
    )
  }
}

// POST /api/chantiers/[chantierId]/depenses
export async function POST(
  request: Request,
  context: { params: Promise<{ chantierId: string }> }
) {
  try {
    // Récupérer et attendre les paramètres
    const params = await context.params;
    const chantierId = params.chantierId;
    
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    
    // Extraire les données du formulaire
    const date = formData.get('date') as string
    const montant = parseFloat(formData.get('montant') as string)
    const description = formData.get('description') as string
    const categorie = formData.get('categorie') as string
    const fournisseur = formData.get('fournisseur') as string || null
    const reference = formData.get('reference') as string || null
    
    // Vérifier les champs obligatoires
    if (!date || isNaN(montant) || !description || !categorie) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Gérer le justificatif si présent
    let justificatifUrl = null
    const file = formData.get('justificatif') as File
    
    if (file && file.size > 0) {
      try {
        // Créer le dossier des documents si nécessaire
        const chantierDir = join(DOCUMENTS_BASE_PATH, chantierId)
        
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
            url: `/uploads/documents/${chantierId}/${fileName}`,
            taille: file.size,
            mimeType: file.type,
            chantierId: chantierId,
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

    // Générer un ID unique pour la dépense
    const depenseId = crypto.randomUUID()
    
    // Créer la dépense sans utiliser RETURNING
    await prisma.$executeRaw`
      INSERT INTO depense (
        id, 
        chantierId, 
        date, 
        montant, 
        description, 
        categorie, 
        fournisseur, 
        reference, 
        justificatif, 
        createdBy, 
        createdAt, 
        updatedAt
      ) 
      VALUES (
        ${depenseId}, 
        ${chantierId}, 
        ${new Date(date)}, 
        ${montant}, 
        ${description}, 
        ${categorie}, 
        ${fournisseur}, 
        ${reference}, 
        ${justificatifUrl}, 
        ${session.user.id || ''}, 
        NOW(), 
        NOW()
      )
    `
    
    // Récupérer la dépense créée
    const newDepenses = await prisma.$queryRaw<Depense[]>`
      SELECT * FROM depense 
      WHERE id = ${depenseId}
    `
    
    const depense = newDepenses[0]

    return NextResponse.json(depense, { status: 201 })
  } catch (error) {
    console.error('Erreur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la dépense' },
      { status: 500 }
    )
  }
} 
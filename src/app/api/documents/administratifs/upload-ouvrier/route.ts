import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma/client'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { readPortalSessionFromCookie } from '@/app/public/portail/auth'

export async function POST(request: Request) {
  try {
    // Vérifier la session portail (code PIN)
    const cookieHeader = request.headers.get('cookie')
    const portalSession = readPortalSessionFromCookie(cookieHeader)

    if (!portalSession || portalSession.t !== 'OUVRIER_INTERNE') {
      return NextResponse.json({ 
        error: 'Accès non autorisé. Seuls les ouvriers internes connectés via code PIN peuvent uploader des documents.' 
      }, { status: 401 })
    }

    // Vérifier que l'ouvrier interne existe et est actif
    const ouvrierInterne = await prisma.ouvrierInterne.findUnique({
      where: {
        id: portalSession.id
      }
    })

    if (!ouvrierInterne || !ouvrierInterne.actif) {
      return NextResponse.json({ 
        error: 'Ouvrier interne non trouvé ou inactif.' 
      }, { status: 403 })
    }

    // Vérifier que le PIN est toujours actif
    const access = await prisma.publicAccessPIN.findFirst({
      where: {
        subjectType: 'OUVRIER_INTERNE',
        subjectId: portalSession.id,
        estActif: true,
      }
    })

    if (!access) {
      return NextResponse.json({ 
        error: 'Session invalide. Veuillez vous reconnecter.' 
      }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const nomDocument = formData.get('nom') as string | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const documentsBaseDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    const adminDocsDir = path.join(documentsBaseDir, 'administratifs')

    if (!existsSync(documentsBaseDir)) {
      await mkdir(documentsBaseDir, { recursive: true })
    }
    if (!existsSync(adminDocsDir)) {
      await mkdir(adminDocsDir, { recursive: true })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const uniqueFilename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`
    const filePath = path.join(adminDocsDir, uniqueFilename)
    const fileUrl = `/uploads/documents/administratifs/${uniqueFilename}`

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Créer ou récupérer le tag "Comptabilité"
    const tagComptabilite = await prisma.tag.upsert({
      where: { nom: 'Comptabilité' },
      update: {},
      create: { nom: 'Comptabilité' },
      select: { id: true }
    })

    // Nom du document : utiliser celui fourni ou générer un nom automatique
    const documentNom = nomDocument?.trim() || `Document_${new Date().toISOString().split('T')[0]}_${timestamp}`

    const calculatedFileType = file.type || path.extname(file.name).slice(1) || 'inconnu'

    // Pour les ouvriers internes, on doit utiliser un User système car createdBy est obligatoire
    // On cherche un User ADMIN ou MANAGER pour associer le document
    const systemUser = await prisma.user.findFirst({
      where: {
        role: {
          in: ['ADMIN', 'MANAGER']
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (!systemUser) {
      console.error('Aucun User ADMIN ou MANAGER trouvé pour associer le document')
      return NextResponse.json({ 
        error: 'Erreur de configuration système. Veuillez contacter un administrateur.' 
      }, { status: 500 })
    }

    // Créer le document avec le tag "Comptabilité"
    const newDocument = await prisma.document.create({
      data: {
        nom: documentNom,
        url: fileUrl,
        type: calculatedFileType,
        mimeType: calculatedFileType,
        taille: file.size,
        User: { connect: { id: systemUser.id } },
        tags: {
          connect: [{ id: tagComptabilite.id }]
        }
      },
      include: {
        User: true,
        tags: true
      }
    })

    const tagNamesFromDoc = newDocument.tags.map(tag => tag.nom)

    return NextResponse.json({ 
      message: 'Document uploadé avec succès',
      document: {
        id: newDocument.id.toString(),
        nom: newDocument.nom,
        url: newDocument.url,
        type: newDocument.type,
        taille: newDocument.taille,
        dateUpload: newDocument.createdAt.toISOString(),
        tags: tagNamesFromDoc,
        uploadedBy: ouvrierInterne ? `${ouvrierInterne.prenom || ''} ${ouvrierInterne.nom || ''}`.trim() || 'Ouvrier interne' : 'Ouvrier interne',
      }
    })
  } catch (error: unknown) {
    console.error('Erreur lors de l\'upload du document par ouvrier interne:', error)
    return NextResponse.json({ 
      error: 'Erreur serveur lors de l\'upload du document' 
    }, { status: 500 })
  }
}


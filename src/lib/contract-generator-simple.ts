import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { prisma } from '@/lib/prisma/client'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import crypto from 'crypto'
import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { readFile } from 'fs/promises'

// Chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

/**
 * Génère un contrat de sous-traitance professionnel en utilisant Puppeteer
 * @param soustraitantId Identifiant du sous-traitant
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns L'URL du contrat généré
 */
export async function generateContratSoustraitance(soustraitantId: string, _userId: string): Promise<string> {
  console.log('Début de la génération du contrat professionnel pour soustraitantId:', soustraitantId)
  
  try {
    // S'assurer que les répertoires existent
    const directoriesResult = await ensureDirectoriesExist()
    if (!directoriesResult.success) {
      console.error("Échec de la création des répertoires:", directoriesResult.error)
      throw new Error("Impossible de créer les répertoires nécessaires: " + 
        (directoriesResult.error instanceof Error ? directoriesResult.error.message : "Erreur inconnue"))
    }
    
    const soustraitantFolder = directoriesResult.soustraitantFolder
    console.log('Dossier du sous-traitant:', soustraitantFolder)
    
    // Récupérer les données du sous-traitant
    console.log('Récupération des données du sous-traitant...')
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })
    
    if (!soustraitant) {
      console.error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`)
      throw new Error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`)
    }
    
    console.log('Sous-traitant trouvé:', soustraitant.nom)
    
    // Récupérer les informations de l'entreprise
    console.log('Récupération des informations de l\'entreprise...')
    const companyInfo = await getCompanyInfo()
    console.log('Informations de l\'entreprise récupérées:', companyInfo.nom)
    
    // Générer le token unique pour la signature
    const token = crypto.randomBytes(32).toString('hex')
    
    // Récupérer le logo et la signature de l'entreprise en base64
    const logoBase64 = await getCompanyLogoBase64()
    const signatureBase64 = await getCompanySignatureBase64()
    
    // Lire le template HTML professionnel
    const templatePath = join(process.cwd(), 'templates', 'contrat-professionnel.html')
    let htmlContent = await readFile(templatePath, 'utf8')
    
    // Préparer les données pour le remplacement des variables
    const templateData = {
      // Informations entreprise
      nomEntreprise: companyInfo.nom,
      adresseEntreprise: companyInfo.adresse,
      zipCodeEntreprise: companyInfo.zipCode || '',
      villeEntreprise: companyInfo.city || '',
      emailEntreprise: companyInfo.email,
      telephoneEntreprise: companyInfo.telephone,
      tvaEntreprise: companyInfo.tva,
      representantEntreprise: companyInfo.representant || 'Directeur',
      
      // Informations sous-traitant
      nomSousTraitant: soustraitant.nom,
      adresseSousTraitant: soustraitant.adresse || '',
      emailSousTraitant: soustraitant.email || '',
      telephoneSousTraitant: soustraitant.telephone || '',
      tvaSousTraitant: soustraitant.tva || '',
      representantSousTraitant: soustraitant.contact || 'Représentant',
      
      // Dates
      dateGeneration: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
      dateDebut: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
      dateFin: format(addYears(new Date(), 1), 'dd/MM/yyyy', { locale: fr }),
      
      // Métadonnées
      referenceContrat: `CT-${Date.now()}`,
      tokenSignature: token,
      urlSignature: `${process.env.NEXT_PUBLIC_APP_URL}/contrats/${token}`,
      
      // Images en base64
      logoBase64: logoBase64,
      signatureBase64: signatureBase64
    }
    
    // Remplacer les variables dans le template HTML
    Object.entries(templateData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      htmlContent = htmlContent.replace(regex, String(value))
    })
    
    console.log('Variables remplacées dans le template')
    
    // Générer le PDF avec Puppeteer
    console.log('Génération du PDF avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    
    // Sauvegarder le PDF
    const fileName = `contrat-${soustraitant.nom.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    const pdfPath = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantFolder, fileName)
    
    await writeFile(pdfPath, pdfBuffer)
    console.log('PDF sauvegardé:', pdfPath)
    
    // Créer l'URL relative pour l'accès web
    const relativeUrl = `/uploads/documents/soustraitants/${soustraitantFolder}/${fileName}`
    
    // Sauvegarder les informations du contrat en base de données
    console.log('Sauvegarde des informations du contrat en base de données...')
    await prisma.contrat.create({
      data: {
        soustraitantId: soustraitantId,
        url: relativeUrl,
        token: token,
        estSigne: false
      }
    })
    
    console.log('Contrat généré avec succès:', relativeUrl)
    return relativeUrl
    
  } catch (error) {
    console.error('Erreur lors de la génération du contrat:', error)
    throw error
  }
}

/**
 * Signe un contrat existant en ajoutant la signature
 * @param token Token du contrat à signer
 * @param signatureBase64 Signature en base64
 * @returns L'URL du contrat signé
 */
interface AuditInfo {
  ipAddress?: string | null
  userAgent?: string | null
  identityConfirmed?: boolean
  consentGiven?: boolean
  horodatageCertifie?: Date
}

export async function signerContrat(
  token: string, 
  signatureBase64: string,
  auditInfo?: AuditInfo
): Promise<string> {
  console.log('Début de la signature du contrat avec token:', token)
  
  try {
    // Récupérer le contrat
    const contrat = await prisma.contrat.findUnique({
      where: { token },
      include: {
        soustraitant: true
      }
    })
    
    if (!contrat) {
      throw new Error('Contrat non trouvé')
    }
    
    if (contrat.estSigne) {
      throw new Error('Ce contrat a déjà été signé')
    }
    
    console.log('Contrat trouvé:', contrat.url)
    
    // Récupérer les informations de l'entreprise
    const companyInfo = await getCompanyInfo()
    
    // Récupérer le logo de l'entreprise
    const logoBase64 = await getCompanyLogoBase64()
    
    // Lire le template HTML professionnel
    const templatePath = join(process.cwd(), 'templates', 'contrat-professionnel.html')
    let htmlContent = await readFile(templatePath, 'utf8')
    
    // Préparer les données pour le remplacement des variables (version signée)
    const templateData = {
      // Informations entreprise
      nomEntreprise: companyInfo.nom,
      adresseEntreprise: companyInfo.adresse,
      zipCodeEntreprise: companyInfo.zipCode || '',
      villeEntreprise: companyInfo.city || '',
      emailEntreprise: companyInfo.email,
      telephoneEntreprise: companyInfo.telephone,
      tvaEntreprise: companyInfo.tva,
      representantEntreprise: companyInfo.representant || 'Directeur',
      
      // Informations sous-traitant
      nomSousTraitant: contrat.soustraitant.nom,
      adresseSousTraitant: contrat.soustraitant.adresse || '',
      emailSousTraitant: contrat.soustraitant.email || '',
      telephoneSousTraitant: contrat.soustraitant.telephone || '',
      tvaSousTraitant: contrat.soustraitant.tva || '',
      representantSousTraitant: contrat.soustraitant.contact || 'Représentant',
      
      // Dates
      dateGeneration: format(contrat.dateGeneration, 'dd/MM/yyyy', { locale: fr }),
      dateDebut: format(new Date(), 'dd/MM/yyyy', { locale: fr }),
      dateFin: format(addYears(new Date(), 1), 'dd/MM/yyyy', { locale: fr }),
      
      // Métadonnées
      referenceContrat: `CT-${contrat.dateGeneration.getTime()}`,
      tokenSignature: token,
      urlSignature: `${process.env.NEXT_PUBLIC_APP_URL}/contrats/${token}`,
      
      // Images en base64
      logoBase64: logoBase64,
      signatureBase64: signatureBase64
    }
    
    // Remplacer les variables dans le template HTML
    Object.entries(templateData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      htmlContent = htmlContent.replace(regex, String(value))
    })
    
    // Ajouter la signature du sous-traitant dans le HTML
    htmlContent = htmlContent.replace(
      /<div class="signature-box">[\s\S]*?<div class="signature-title">Pour le Sous-traitant<\/div>[\s\S]*?<div class="signature-name">[\s\S]*?<\/div>[\s\S]*?<div class="signature-line"><\/div>[\s\S]*?<div style="font-size: 10px; color: #6b7280; margin-top: 5px;">[\s\S]*?<\/div>[\s\S]*?<\/div>/g,
      `<div class="signature-box">
        <div class="signature-title">Pour le Sous-traitant</div>
        <div class="signature-name">${contrat.soustraitant.nom}</div>
        <img src="data:image/png;base64,${signatureBase64}" class="signature-image" alt="Signature Sous-traitant" />
        <div class="signature-line"></div>
        <div style="font-size: 10px; color: #6b7280; margin-top: 5px;">
          Signé électroniquement le ${format(auditInfo?.horodatageCertifie || new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}
        </div>
        ${auditInfo ? `
        <div style="font-size: 9px; color: #9ca3af; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
          <div style="margin-bottom: 4px;"><strong>Informations d'audit de signature :</strong></div>
          <div style="margin-bottom: 2px;">• Identité confirmée : Oui</div>
          <div style="margin-bottom: 2px;">• Consentement donné : Oui</div>
          ${auditInfo.ipAddress ? `<div style="margin-bottom: 2px;">• Adresse IP : ${auditInfo.ipAddress}</div>` : ''}
          <div style="margin-bottom: 2px;">• Horodatage certifié : ${format(auditInfo.horodatageCertifie || new Date(), 'dd/MM/yyyy à HH:mm:ss', { locale: fr })}</div>
          <div style="margin-top: 6px; font-size: 8px; color: #6b7280;">
            Signature électronique conforme au Règlement eIDAS (UE) 910/2014 et à la législation belge en vigueur.
          </div>
        </div>
        ` : ''}
      </div>`
    )
    
    // Générer le PDF signé avec Puppeteer
    console.log('Génération du PDF signé avec Puppeteer...')
    const pdfBuffer = await PDFGenerator.generatePDF(htmlContent, {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    })
    
    // Sauvegarder le PDF signé
    const fileName = `contrat-signe-${contrat.soustraitant.nom.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`
    const pdfPath = join(DOCUMENTS_BASE_PATH, 'soustraitants', 'signed', fileName)
    
    // Créer le dossier signed s'il n'existe pas
    await mkdir(join(DOCUMENTS_BASE_PATH, 'soustraitants', 'signed'), { recursive: true })
    
    await writeFile(pdfPath, pdfBuffer)
    console.log('PDF signé sauvegardé:', pdfPath)
    
    // Créer l'URL relative pour l'accès web
    const relativeUrl = `/uploads/documents/soustraitants/signed/${fileName}`
    
    // Mettre à jour le contrat en base de données avec les informations d'audit
    await prisma.contrat.update({
      where: { token },
      data: {
        url: relativeUrl,
        estSigne: true,
        dateSignature: auditInfo?.horodatageCertifie || new Date(),
        signatureIP: auditInfo?.ipAddress || null,
        signatureUserAgent: auditInfo?.userAgent || null,
        signatureConsentement: auditInfo?.consentGiven || null,
        signatureIdentiteConfirmee: auditInfo?.identityConfirmed || null,
        signatureHorodatageCertifie: auditInfo?.horodatageCertifie || new Date()
      }
    })
    
    console.log('Contrat signé avec succès:', relativeUrl)
    return relativeUrl
    
  } catch (error) {
    console.error('Erreur lors de la signature du contrat:', error)
    throw error
  }
}

/**
 * Récupère les informations de l'entreprise depuis la base de données
 */
async function getCompanyInfo() {
  try {
    const settings = await prisma.companysettings.findFirst()
    if (settings) {
      return {
        nom: settings.name || 'Secotech',
        adresse: settings.address || '',
        zipCode: settings.zipCode || '',
        city: settings.city || '',
        email: settings.email || 'info@secotech.be',
        telephone: settings.phone || '',
        tva: settings.tva || 'BE0537822042',
        representant: 'Directeur'
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des informations de l\'entreprise:', error)
  }
  
  // Valeurs par défaut si pas de configuration
  return {
    nom: 'Secotech',
    adresse: 'Adresse par défaut',
    zipCode: '',
    city: '',
    email: 'info@secotech.be',
    telephone: '',
    tva: 'BE0537822042',
    representant: 'Directeur'
  }
}

/**
 * Récupère le logo de l'entreprise en base64
 */
async function getCompanyLogoBase64(): Promise<string> {
  try {
    const settings = await prisma.companysettings.findFirst()
    if (settings?.logo) {
      // Si le logo est une URL, on le convertit en base64
      if (settings.logo.startsWith('http')) {
        console.warn('URL externe détectée pour le logo, utilisation du logo par défaut')
        return await getDefaultLogoBase64()
      } else if (settings.logo.startsWith('/')) {
        // Chemin relatif depuis public (ex: /images/logo.png)
        return await convertImageToBase64(settings.logo, false)
      } else if (settings.logo.startsWith('data:')) {
        // Si c'est déjà en base64 (data:image/...), extraire seulement la partie base64
        const base64Match = settings.logo.match(/base64,(.+)/)
        return base64Match ? base64Match[1] : settings.logo
      } else {
        // Si c'est un chemin relatif sans le / initial, on l'ajoute
        return await convertImageToBase64(`/${settings.logo}`, false)
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du logo:', error)
  }
  
  // Logo par défaut (logo Secotech)
  return await getDefaultLogoBase64()
}

/**
 * Récupère la signature de l'entreprise en base64
 */
async function getCompanySignatureBase64(): Promise<string> {
  try {
    const settings = await prisma.companysettings.findFirst()
    if (settings?.signature) {
      // Si la signature est une URL, on le convertit en base64
      if (settings.signature.startsWith('http')) {
        console.warn('URL externe détectée pour la signature, utilisation de la signature par défaut')
        return await getDefaultSignatureBase64()
      } else if (settings.signature.startsWith('/')) {
        // Chemin relatif depuis public (ex: /images/signature.png)
        return await convertImageToBase64(settings.signature, true)
      } else if (settings.signature.startsWith('data:')) {
        // Si c'est déjà en base64 (data:image/...), extraire seulement la partie base64
        const base64Match = settings.signature.match(/base64,(.+)/)
        return base64Match ? base64Match[1] : settings.signature
      } else {
        // Si c'est un chemin relatif sans le / initial, on l'ajoute
        return await convertImageToBase64(`/${settings.signature}`, true)
      }
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la signature:', error)
  }
  
  // Signature par défaut
  return await getDefaultSignatureBase64()
}

/**
 * Convertit une image (URL ou chemin) en base64
 */
async function convertImageToBase64(imagePath: string, isSignature: boolean = false): Promise<string> {
  try {
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    let fullPath: string
    if (imagePath.startsWith('http')) {
      // Pour les URLs externes, on retourne une image par défaut
      console.warn('URL externe détectée, utilisation d\'une image par défaut')
      return isSignature ? await getDefaultSignatureBase64() : await getDefaultLogoBase64()
    } else {
      // Chemin relatif depuis public (enlever le / initial si présent)
      const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath
      fullPath = join(process.cwd(), 'public', cleanPath)
    }
    
    console.log('Lecture du fichier image:', fullPath)
    const imageBuffer = await readFile(fullPath)
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 
                     imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg') ? 'image/jpeg' :
                     'image/png' // Par défaut PNG
    const base64 = imageBuffer.toString('base64')
    console.log(`Image convertie en base64, taille: ${base64.length} caractères, type: ${mimeType}`)
    // Retourner seulement le base64 sans le préfixe data: car le template l'ajoute déjà
    return base64
  } catch (error) {
    console.error('Erreur lors de la conversion de l\'image en base64:', error)
    console.error('Chemin de l\'image:', imagePath)
    return isSignature ? await getDefaultSignatureBase64() : await getDefaultLogoBase64()
  }
}

/**
 * Récupère le logo par défaut en base64
 */
async function getDefaultLogoBase64(): Promise<string> {
  try {
    const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
    console.log('Tentative de lecture du logo:', logoPath)
    const logoBuffer = await readFile(logoPath)
    console.log('Logo lu avec succès, taille:', logoBuffer.length, 'bytes')
    // Retourner seulement le base64 sans le préfixe data: car le template l'ajoute déjà
    return logoBuffer.toString('base64')
  } catch (error) {
    console.error('Erreur lors de la récupération du logo par défaut:', error)
    // Retourner un logo vide en base64 (1x1 pixel transparent) - seulement le base64
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
}

/**
 * Récupère la signature par défaut en base64
 */
async function getDefaultSignatureBase64(): Promise<string> {
  try {
    const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
    console.log('Tentative de lecture de la signature:', signaturePath)
    const signatureBuffer = await readFile(signaturePath)
    console.log('Signature lue avec succès, taille:', signatureBuffer.length, 'bytes')
    // Retourner seulement le base64 sans le préfixe data: car le template l'ajoute déjà
    return signatureBuffer.toString('base64')
  } catch (error) {
    console.error('Erreur lors de la récupération de la signature par défaut:', error)
    // Retourner une signature vide en base64 (1x1 pixel transparent) - seulement le base64
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  }
}

/**
 * S'assure que les répertoires nécessaires existent
 */
async function ensureDirectoriesExist() {
  try {
    // Créer un identifiant unique pour le dossier du sous-traitant
    const soustraitantFolder = `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    
    // Vérifier et créer le répertoire de base s'il n'existe pas
    const baseDirectoryPaths = [
      join(process.cwd(), 'public'),
      join(process.cwd(), 'public', 'uploads'),
      DOCUMENTS_BASE_PATH,
      join(DOCUMENTS_BASE_PATH, 'soustraitants')
    ]
    
    console.log('Création des répertoires requis:')
    for (const path of baseDirectoryPaths) {
      try {
        await stat(path)
        console.log(`Le répertoire existe déjà: ${path}`)
      } catch {
        console.log(`Création du répertoire: ${path}`)
        try {
          await mkdir(path, { recursive: true })
          console.log(`Répertoire créé avec succès: ${path}`)
        } catch (mkdirError) {
          console.error(`Erreur lors de la création du répertoire ${path}:`, mkdirError)
          throw mkdirError
        }
      }
    }
    
    // Créer le dossier spécifique pour ce sous-traitant
    const soustraitantPath = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantFolder)
    console.log(`Création du dossier pour le sous-traitant: ${soustraitantPath}`)
    
    try {
      await mkdir(soustraitantPath, { recursive: true })
      console.log(`Dossier du sous-traitant créé avec succès: ${soustraitantPath}`)
    } catch (mkdirError) {
      console.error(`Erreur lors de la création du dossier du sous-traitant ${soustraitantPath}:`, mkdirError)
      throw mkdirError
    }
    
    return {
      success: true,
      soustraitantFolder
    }
  } catch (error) {
    console.error('Erreur lors de la création des répertoires:', error)
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Erreur inconnue')
    }
  }
}

import { PDFGenerator } from '@/lib/pdf/pdf-generator'
import { prisma } from '@/lib/prisma/client'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import crypto from 'crypto'
import { writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { champsRepresentantManquants, formaterGsm } from '@/lib/soustraitants/representant'

// Chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

/**
 * Contrat impossible à générer faute de données obligatoires. Distinguée des
 * erreurs techniques pour que les routes renvoient le message tel quel (400)
 * au lieu d'un « erreur lors de la génération » générique.
 */
export class ContratIncompletError extends Error {}

interface DonneesSousTraitant {
  nom: string
  adresse: string | null
  email: string | null
  telephone: string | null
  tva: string | null
  contact: string | null
  representantNom?: string | null
  representantPrenom?: string | null
  representantFonction?: string | null
  representantEmail?: string | null
  representantGsm?: string | null
}

/**
 * Données injectées dans le template — construites par UNE seule fonction,
 * appelée à la génération ET à la signature.
 *
 * Avant, chaque étape construisait sa propre copie, et elles divergeaient :
 * référence CT-… recalculée, dates de début/fin recalculées au jour de la
 * signature, et surtout `signatureBase64` rempli à la signature avec la
 * signature du SOUS-TRAITANT au lieu de celle de l'entreprise — le cadre
 * « Entrepreneur principal » du contrat signé affichait donc la mauvaise
 * signature. Tout ce qui caractérise le contrat (référence, dates, version)
 * vient désormais de l'enregistrement créé à la génération.
 */
function construireDonneesTemplate(p: {
  soustraitant: DonneesSousTraitant
  companyInfo: Awaited<ReturnType<typeof getCompanyInfo>>
  dateGeneration: Date
  dateFin: Date
  token: string
  templateVersion: string
  logoBase64: string
  signatureEntrepriseBase64: string
}): Record<string, string> {
  const { soustraitant: st, companyInfo } = p
  const nomRepresentant = [st.representantPrenom, st.representantNom]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(' ')
  return {
    // Informations entreprise
    nomEntreprise: companyInfo.nom,
    adresseEntreprise: companyInfo.adresse,
    zipCodeEntreprise: companyInfo.zipCode || '',
    villeEntreprise: companyInfo.city || '',
    emailEntreprise: companyInfo.email,
    telephoneEntreprise: companyInfo.telephone,
    tvaEntreprise: companyInfo.tva,
    bceEntreprise: companyInfo.tva,
    numEntrepriseEntreprise: companyInfo.tva,
    representantEntreprise: companyInfo.representant || 'Directeur',

    // Informations sous-traitant
    nomSousTraitant: st.nom,
    adresseSousTraitant: st.adresse || '',
    emailSousTraitant: st.email || '',
    telephoneSousTraitant: st.telephone || '',
    tvaSousTraitant: st.tva || '',
    bceSousTraitant: st.tva || '',
    numEntrepriseSousTraitant: st.tva || '',
    // Repli sur `contact` : seuls les anciens contrats (générés avant les
    // champs représentant) peuvent encore arriver ici sans représentant.
    representantSousTraitant: nomRepresentant || st.contact || 'Représentant',
    fonctionRepresentantSousTraitant: st.representantFonction || '',
    emailRepresentantSousTraitant: st.representantEmail || '',
    gsmRepresentantSousTraitant: formaterGsm(st.representantGsm),

    // Dates — celles du contrat, jamais « aujourd'hui » au moment de signer
    dateGeneration: format(p.dateGeneration, 'dd/MM/yyyy', { locale: fr }),
    dateDebut: format(p.dateGeneration, 'dd/MM/yyyy', { locale: fr }),
    dateFin: format(p.dateFin, 'dd/MM/yyyy', { locale: fr }),

    // Métadonnées
    referenceContrat: referenceContrat(p.dateGeneration),
    versionContrat: p.templateVersion,
    tokenSignature: p.token,
    urlSignature: `${process.env.NEXT_PUBLIC_APP_URL}/contrats/${p.token}`,

    // Images en base64 — signatureBase64 est TOUJOURS celle de l'entreprise
    logoBase64: p.logoBase64,
    signatureBase64: p.signatureEntrepriseBase64,
  }
}

/** Texte d'attente du cadre sous-traitant dans le template — le seul marqueur fiable. */
export const MARQUEUR_SIGNATURE_SOUS_TRAITANT = 'Signature électronique via la plateforme'

/**
 * Insère la signature du sous-traitant dans CHAQUE cadre qui l'attend
 * (contrat + annexe).
 *
 * Historique, pour ne pas refaire les mêmes erreurs :
 *  1. La première version remplaçait « un <div class="signature-box"> suivi
 *     plus loin d'une ligne et d'un texte gris » : partant du cadre
 *     entrepreneur, elle fusionnait les deux cadres et effaçait la signature
 *     de l'entreprise.
 *  2. Le correctif suivant exigeait le titre « Pour le Sous-traitant » — celui
 *     des templates du dépôt, PAS celui du template de production (« Le
 *     Sous-traitant »). Plus aucun cadre ne correspondait : la signature du
 *     sous-traitant n'était plus insérée du tout.
 *
 * Ici, on ne dépend plus du titre : on repère le texte d'attente, qui n'existe
 * que dans le cadre sous-traitant, et le motif ne peut pas franchir
 * l'ouverture d'un autre cadre (il ne peut donc démarrer que sur le bon). Le
 * contenu du template (titre, nom du représentant) est conservé tel quel : on
 * ajoute seulement l'image avant la ligne, et on remplace le texte d'attente.
 */
export function insererSignatureSousTraitant(
  html: string,
  signatureBase64: string,
  auditInfo?: AuditInfo
): string {
  const horodatage = auditInfo?.horodatageCertifie || new Date()
  const mention = `Signé électroniquement le ${format(horodatage, 'dd/MM/yyyy à HH:mm', { locale: fr })}` +
    (auditInfo ? `
          <div style="font-size: 9px; color: #9ca3af; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <div style="margin-bottom: 4px;"><strong>Informations d'audit de signature :</strong></div>
            <div style="margin-bottom: 2px;">• Identité confirmée : Oui</div>
            <div style="margin-bottom: 2px;">• Consentement donné : Oui</div>
            ${auditInfo.ipAddress ? `<div style="margin-bottom: 2px;">• Adresse IP : ${auditInfo.ipAddress}</div>` : ''}
            <div style="margin-bottom: 2px;">• Horodatage certifié : ${format(horodatage, 'dd/MM/yyyy à HH:mm:ss', { locale: fr })}</div>
            <div style="margin-top: 6px; font-size: 8px; color: #6b7280;">
              Signature électronique conforme au Règlement eIDAS (UE) 910/2014 et à la législation belge en vigueur.
            </div>
          </div>` : '')
  const image = `<img src="data:image/png;base64,${signatureBase64}" class="signature-image" alt="Signature Sous-traitant" />`

  const cadre = new RegExp(
    `<div class="signature-box">(?:(?!<div class="signature-box">)[\\s\\S])*?${MARQUEUR_SIGNATURE_SOUS_TRAITANT}`,
    'g'
  )
  const resultat = html.replace(cadre, (bloc) => {
    const avecImage = bloc.includes('<div class="signature-line"></div>')
      ? bloc.replace('<div class="signature-line"></div>', `${image}\n        <div class="signature-line"></div>`)
      : bloc.replace(MARQUEUR_SIGNATURE_SOUS_TRAITANT, `${image}${MARQUEUR_SIGNATURE_SOUS_TRAITANT}`)
    return avecImage.replace(MARQUEUR_SIGNATURE_SOUS_TRAITANT, mention)
  })

  // Échec franc plutôt qu'un contrat « signé » sans signature visible.
  if (resultat === html) {
    throw new Error(
      `Signature non insérée : le template ne contient pas le texte « ${MARQUEUR_SIGNATURE_SOUS_TRAITANT} » ` +
        'dans le cadre du sous-traitant.'
    )
  }
  return resultat
}

/** Référence stable d'un contrat, dérivée de sa date de génération persistée. */
export function referenceContrat(dateGeneration: Date): string {
  return `CT-${dateGeneration.getTime()}`
}

function remplirTemplate(html: string, donnees: Record<string, string>): string {
  let resultat = html
  for (const [cle, valeur] of Object.entries(donnees)) {
    resultat = resultat.replace(new RegExp(`{{${cle}}}`, 'g'), String(valeur))
  }
  return resultat
}

/**
 * Génère un contrat de sous-traitance en utilisant Puppeteer et les templates de la base de données
 * @param soustraitantId Identifiant du sous-traitant
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns L'URL du contrat généré
 */
export async function generateContratSoustraitance(soustraitantId: string, _userId: string): Promise<string> {
  console.log('Début de la génération du contrat avec Puppeteer pour soustraitantId:', soustraitantId)
  
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
    
    // Récupérer le template actif (catégorie CONTRAT)
    console.log('Récupération du template actif...')
    const activeTemplate = await prisma.contractTemplate.findFirst({
      where: { isActive: true, category: 'CONTRAT' }
    })
    
    if (!activeTemplate) {
      console.error('Aucun template de contrat actif trouvé')
      throw new Error('Aucun template de contrat actif trouvé. Veuillez activer un template dans l\'administration.')
    }
    
    console.log('Template actif trouvé:', activeTemplate.name)
    
    // Contrat-cadre v2 : le représentant est le signataire ET le destinataire
    // des rappels Checkinatwork. Sans lui, pas de contrat.
    const manquants = champsRepresentantManquants(soustraitant)
    if (manquants.length > 0) {
      throw new ContratIncompletError(
        `Contrat non généré — à compléter sur la fiche du sous-traitant : ${manquants.join(', ')}.`
      )
    }
    // Double signature : le contrat part toujours signé par l'entreprise.
    const settingsSignature = await prisma.companysettings.findFirst({ select: { signature: true } })
    if (!settingsSignature?.signature) {
      throw new ContratIncompletError(
        "Contrat non généré — aucune signature d'entreprise configurée (Configuration → Signature)."
      )
    }

    // Générer le token unique pour la signature
    const token = crypto.randomBytes(32).toString('hex')

    // Un seul instant de référence : il devient Contrat.dateGeneration, dont
    // dérivent la référence CT-…, la date de début et la date de fin — à la
    // génération comme, plus tard, à la signature.
    const maintenant = new Date()
    const dateFinContrat = addYears(maintenant, 1)

    const htmlContent = remplirTemplate(
      activeTemplate.htmlContent,
      construireDonneesTemplate({
        soustraitant,
        companyInfo,
        dateGeneration: maintenant,
        dateFin: dateFinContrat,
        token,
        templateVersion: activeTemplate.name,
        logoBase64: await getCompanyLogoBase64(),
        signatureEntrepriseBase64: await getCompanySignatureBase64(),
      })
    )

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
        dateGeneration: maintenant,
        dateFin: dateFinContrat,
        templateVersion: activeTemplate.name,
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
 * @param auditInfo Informations d'audit pour renforcer la valeur juridique
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
    
    // Le template SIGNÉ doit être celui qui a été ENVOYÉ : si un nouveau
    // template a été activé entre-temps, le sous-traitant signerait sinon un
    // texte différent de celui qu'il a reçu. Repli sur le template actif pour
    // les contrats générés avant l'enregistrement de la version.
    const template = contrat.templateVersion
      ? await prisma.contractTemplate.findUnique({ where: { name: contrat.templateVersion } })
      : await prisma.contractTemplate.findFirst({ where: { isActive: true, category: 'CONTRAT' } })

    if (!template) {
      throw new Error(
        contrat.templateVersion
          ? `Le template « ${contrat.templateVersion} » utilisé pour ce contrat n'existe plus.`
          : 'Aucun template de contrat actif trouvé'
      )
    }

    const companyInfo = await getCompanyInfo()

    let htmlContent = remplirTemplate(
      template.htmlContent,
      construireDonneesTemplate({
        soustraitant: contrat.soustraitant,
        companyInfo,
        dateGeneration: contrat.dateGeneration,
        dateFin: contrat.dateFin ?? addYears(contrat.dateGeneration, 1),
        token,
        templateVersion: template.name,
        logoBase64: await getCompanyLogoBase64(),
        signatureEntrepriseBase64: await getCompanySignatureBase64(),
      })
    )

    // Ajouter la signature du sous-traitant dans le HTML.
    htmlContent = insererSignatureSousTraitant(htmlContent, signatureBase64, auditInfo)
    
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

    // Contrat-cadre signé → inscription au rappel Checkinatwork quotidien
    // (désactivable ensuite manuellement sur la fiche du sous-traitant).
    await prisma.soustraitant.update({
      where: { id: contrat.soustraitantId },
      data: { rappelCheckinActif: true },
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
        // Pour les URLs externes, on retourne le logo par défaut pour l'instant
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
        // Pour les URLs externes, on retourne la signature par défaut pour l'instant
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
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
    const logoBuffer = await readFile(logoPath)
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
    const { readFile } = await import('fs/promises')
    const { join } = await import('path')
    
    const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
    const signatureBuffer = await readFile(signaturePath)
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

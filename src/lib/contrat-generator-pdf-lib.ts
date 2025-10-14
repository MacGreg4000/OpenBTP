import { readFile, writeFile, mkdir, stat } from 'fs/promises'
import { join } from 'path'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { prisma } from '@/lib/prisma/client'
import { format, addYears } from 'date-fns'
import { fr } from 'date-fns/locale'
import crypto from 'crypto'

// Chemin de base pour les documents
const DOCUMENTS_BASE_PATH = join(process.cwd(), 'public', 'uploads', 'documents')

// Fonction pour s'assurer que les répertoires existent
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
    ];
    
    console.log('Création des répertoires requis:');
    for (const path of baseDirectoryPaths) {
      try {
        await stat(path);
        console.log(`Le répertoire existe déjà: ${path}`);
      } catch {
        console.log(`Création du répertoire: ${path}`);
        try {
          await mkdir(path, { recursive: true });
          console.log(`Répertoire créé avec succès: ${path}`);
        } catch (mkdirError) {
          console.error(`Erreur lors de la création du répertoire ${path}:`, mkdirError);
          throw mkdirError;
        }
      }
    }
    
    // Créer le dossier spécifique pour ce sous-traitant
    const soustraitantPath = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantFolder);
    console.log(`Création du dossier pour le sous-traitant: ${soustraitantPath}`);
    
    try {
      await mkdir(soustraitantPath, { recursive: true });
      console.log(`Dossier du sous-traitant créé avec succès: ${soustraitantPath}`);
    } catch (mkdirError) {
      console.error(`Erreur lors de la création du dossier du sous-traitant ${soustraitantPath}:`, mkdirError);
      throw mkdirError;
    }
    
    return {
      success: true,
      soustraitantFolder
    };
  } catch (error) {
    console.error("Erreur lors de la vérification/création des répertoires:", error);
    return {
      success: false,
      error,
      soustraitantFolder: ''
    };
  }
}

// Fonction pour récupérer les informations de l'entreprise depuis la base de données
async function getCompanyInfo() {
  try {
    const settings = await prisma.companysettings.findFirst();
    
    if (!settings) {
      console.warn("Aucune information d'entreprise trouvée dans la base de données");
      return {
        nom: 'Secotech SRL',
        adresse: 'Rue Frumhy, 20, 4671 Barchon',
        ville: 'Barchon',
        telephone: '0032(0)498 32 49 49',
        email: 'info@secotech.be',
        tva: 'BE0537822042'
      };
    }
    
    return {
      nom: settings.name,
      adresse: `${settings.address}, ${settings.zipCode} ${settings.city}`,
      ville: settings.city,
      telephone: settings.phone,
      email: settings.email,
      tva: settings.tva
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des informations de l'entreprise:", error);
    // Valeurs par défaut en cas d'erreur
    return {
      nom: 'Secotech SRL',
      adresse: 'Rue Frumhy, 20, 4671 Barchon',
      ville: 'Barchon',
      telephone: '0032(0)498 32 49 49',
      email: 'info@secotech.be',
      tva: 'BE0537822042'
    };
  }
}

/**
 * Génère un contrat de sous-traitance pour un sous-traitant
 * @param soustraitantId Identifiant du sous-traitant
 * @param userId Identifiant de l'utilisateur qui génère le document
 * @returns L'URL du contrat généré
 */
export async function generateContratSoustraitance(soustraitantId: string, _userId: string): Promise<string> {
    console.log('Utilisateur générateur du contrat:', _userId);
  try {
    console.log('Début de la génération du contrat pour soustraitantId:', soustraitantId);
    
    // S'assurer que les répertoires existent
    const directoriesResult = await ensureDirectoriesExist();
    if (!directoriesResult.success) {
      console.error("Échec de la création des répertoires:", directoriesResult.error);
      throw new Error("Impossible de créer les répertoires nécessaires: " + 
        (directoriesResult.error instanceof Error ? directoriesResult.error.message : "Erreur inconnue"));
    }
    
    const soustraitantFolder = directoriesResult.soustraitantFolder;
    console.log('Dossier du sous-traitant:', soustraitantFolder);
    
    // Récupérer les données du sous-traitant
    console.log('Récupération des données du sous-traitant...');
    const soustraitant = await prisma.soustraitant.findUnique({
      where: { id: soustraitantId }
    })
    
    if (!soustraitant) {
      console.error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`);
      throw new Error(`Sous-traitant avec l'ID ${soustraitantId} non trouvé`)
    }
    
    console.log('Sous-traitant trouvé:', soustraitant.nom);
    
    // Récupérer les informations de l'entreprise
    console.log('Récupération des informations de l\'entreprise...');
    const companyInfo = await getCompanyInfo();
    console.log('Informations de l\'entreprise récupérées:', companyInfo.nom);
    
    // Récupérer le logo de l'entreprise
    console.log('Récupération du logo de l\'entreprise...');
    let logoBuffer
    try {
      const logoPath = join(process.cwd(), 'public', 'images', 'logo.png')
      console.log('Chemin du logo:', logoPath);
      logoBuffer = await readFile(logoPath)
      console.log('Logo récupéré, taille:', logoBuffer.length, 'octets');
    } catch (error) {
      console.error('Erreur lors de la lecture du logo:', error)
    }
    
    // Récupérer l'image de la signature
    console.log('Récupération de l\'image de la signature...');
    let signatureBuffer
    try {
      const signaturePath = join(process.cwd(), 'public', 'images', 'signature.png')
      console.log('Chemin de la signature:', signaturePath);
      signatureBuffer = await readFile(signaturePath)
      console.log('Signature récupérée, taille:', signatureBuffer.length, 'octets');
    } catch (error) {
      console.error('Erreur lors de la lecture de la signature:', error)
    }
    
    // Date de génération formatée
    console.log('Formatage des dates...');
    const dateGeneration = format(new Date(), 'dd/MM/yyyy', { locale: fr })
    const dateFin = format(addYears(new Date(), 1), 'dd/MM/yyyy', { locale: fr })
    
    // Générer un token unique pour la signature électronique
    console.log('Génération du token...');
    const token = crypto.randomBytes(32).toString('hex')
    
    // Nom du fichier PDF
    console.log('Préparation du fichier PDF...');
    const fileName = `Contrat-${soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}.pdf`
    const filePath = join(DOCUMENTS_BASE_PATH, 'soustraitants', soustraitantFolder, fileName)
    console.log('Chemin du fichier PDF à créer:', filePath);
    
    // Créer un nouveau document PDF
    console.log('Création du document PDF...');
    const pdfDoc = await PDFDocument.create()
    pdfDoc.registerFontkit(fontkit)
    console.log('Document PDF créé');
    
    // Ajouter une page
    console.log('Ajout d\'une page...');
    const page = pdfDoc.addPage([595, 842]) // Format A4
    console.log('Page ajoutée');
    
    // Charger les polices
    console.log('Chargement des polices...');
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    console.log('Polices chargées');
    
    // Ajouter le logo s'il existe
    if (logoBuffer) {
      const logoImage = await pdfDoc.embedPng(logoBuffer)
      const logoSize = logoImage.scale(0.6) // Agrandir le logo à 60% au lieu de 45%
      
      // Centrer le logo en haut de la page
      page.drawImage(logoImage, {
        x: (page.getWidth() - logoSize.width) / 2, // Centrer horizontalement
        y: page.getHeight() - logoSize.height - 25, // Réduire l'espacement en haut
        width: logoSize.width,
        height: logoSize.height,
      })
    }
    
    // Ajouter le titre avec un espace réduit sous le logo
    page.drawText('CONTRAT DE SOUS-TRAITANCE', {
      x: 150,
      y: page.getHeight() - 170, // Réduire l'espacement (avant: 230)
      size: 16,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations des parties avec espacement réduit après le titre
    page.drawText('Entre les soussignés :', {
      x: 50,
      y: page.getHeight() - 200, // Réduire l'espacement (avant: 260)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations de l'entreprise avec espacement proportionnellement réduit
    page.drawText(`${companyInfo.nom}`, {
      x: 50,
      y: page.getHeight() - 230, // Réduire l'espacement (avant: 290)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`${companyInfo.adresse}`, {
      x: 50,
      y: page.getHeight() - 250, // Réduire l'espacement (avant: 310)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`TVA : ${companyInfo.tva}`, {
      x: 50,
      y: page.getHeight() - 270, // Réduire l'espacement (avant: 330)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Tél : ${companyInfo.telephone}`, {
      x: 50,
      y: page.getHeight() - 290, // Réduire l'espacement (avant: 350)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Email : ${companyInfo.email}`, {
      x: 50,
      y: page.getHeight() - 310, // Réduire l'espacement (avant: 370)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Représentée par Maccio Grégory`, {
      x: 50,
      y: page.getHeight() - 330, // Réduire l'espacement (avant: 390)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Ci-après dénommée "l'Entrepreneur principal"`, {
      x: 50,
      y: page.getHeight() - 350, // Réduire l'espacement (avant: 410)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Séparateur avec espacement proportionnellement réduit
    page.drawText(`Et`, {
      x: 50,
      y: page.getHeight() - 380, // Réduire l'espacement (avant: 440)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Informations du sous-traitant avec espacement proportionnellement réduit
    page.drawText(`${soustraitant.nom}`, {
      x: 50,
      y: page.getHeight() - 410, // Réduire l'espacement (avant: 470)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`${soustraitant.adresse || 'Adresse non spécifiée'}`, {
      x: 50,
      y: page.getHeight() - 430, // Réduire l'espacement (avant: 490)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`TVA : ${(soustraitant as unknown as { tva?: string | null }).tva || 'Non spécifié' }`, {
      x: 50,
      y: page.getHeight() - 450, // Réduire l'espacement (avant: 510)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Tél : ${soustraitant.telephone || 'Non spécifié'}`, {
      x: 50,
      y: page.getHeight() - 470, // Réduire l'espacement (avant: 530)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Email : ${soustraitant.email || 'Non spécifié'}`, {
      x: 50,
      y: page.getHeight() - 490, // Réduire l'espacement (avant: 550)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Représentée par ${soustraitant.contact || soustraitant.nom}`, {
      x: 50,
      y: page.getHeight() - 510, // Réduire l'espacement (avant: 570)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Ci-après dénommée "le Sous-traitant"`, {
      x: 50,
      y: page.getHeight() - 530, // Réduire l'espacement (avant: 590)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Titre des clauses avec espacement proportionnellement réduit
    page.drawText(`Il a été convenu ce qui suit :`, {
      x: 50,
      y: page.getHeight() - 570, // Réduire l'espacement (avant: 630)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Article 1 avec espacement proportionnellement réduit
    page.drawText(`Article 1 - Objet du contrat`, {
      x: 50,
      y: page.getHeight() - 600, // Réduire l'espacement (avant: 660)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`L'Entrepreneur principal confie au Sous-traitant, qui accepte, l'exécution des`, {
      x: 50,
      y: page.getHeight() - 620, // Réduire l'espacement (avant: 680)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`travaux de construction sur les chantiers qui lui seront confiés par bon de commande.`, {
      x: 50,
      y: page.getHeight() - 635, // Réduire l'espacement (avant: 695)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Article 2 avec espacement proportionnellement réduit
    page.drawText(`Article 2 - Durée du contrat`, {
      x: 50,
      y: page.getHeight() - 665, // Réduire l'espacement (avant: 725)
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    page.drawText(`Le présent contrat est conclu pour une période du ${format(new Date(), 'dd/MM/yyyy')} au ${dateFin}.`, {
      x: 50,
      y: page.getHeight() - 685, // Réduire l'espacement (avant: 745)
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Seconde page
    const page2 = pdfDoc.addPage([595, 842])
    
    // Articles 3-10 (version simplifiée)
    let yPos = page2.getHeight() - 50;
    
    // Article 3
    yPos -= 30;
    page2.drawText(`Article 3 - Prix et modalités de paiement`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page2.drawText(`Les prix des travaux seront fixés dans chaque bon de commande spécifique.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Le Sous-traitant établira une facture à la fin de chaque mois pour les travaux réalisés.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Les factures seront payables à 30 jours fin de mois, par virement bancaire.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Article 4
    yPos -= 30;
    page2.drawText(`Article 4 - Obligations du Sous-traitant`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`Le Sous-traitant s'engage à :`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const obligations = [
      `Exécuter les travaux avec le plus grand soin et dans les délais convenus`,
      `Respecter toutes les normes de sécurité en vigueur`,
      `Fournir tout le matériel nécessaire à l'exécution des travaux`,
      `Souscrire toutes les assurances nécessaires à son activité`,
      `Respecter la législation sociale et fiscale`,
      `Ne pas sous-traiter tout ou partie des travaux sans l'accord écrit de l'Entrepreneur`
    ];

    for (const obligation of obligations) {
      yPos -= 15;
      page2.drawText(`- ${obligation}`, {
        x: 60, // Indentation pour les puces
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Article 5
    yPos -= 30;
    page2.drawText(`Article 5 - Obligations de l'Entrepreneur principal`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`L'Entrepreneur principal s'engage à :`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    const obligationsEntrepreneur = [
      `Fournir au Sous-traitant toutes les informations nécessaires à la bonne exécution des travaux`,
      `Payer les factures du Sous-traitant dans les délais convenus`,
      `Permettre au Sous-traitant l'accès aux chantiers`
    ];

    for (const obligation of obligationsEntrepreneur) {
      yPos -= 15;
      page2.drawText(`- ${obligation}`, {
        x: 60,
        y: yPos,
        size: 10,
        font: helveticaFont,
        color: rgb(0.1, 0.1, 0.1),
      });
    }

    // Article 6
    yPos -= 30;
    page2.drawText(`Article 6 - Responsabilité et garanties`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 20;
    page2.drawText(`Le Sous-traitant est responsable de la bonne exécution des travaux qui lui sont confiés.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`Il garantit l'Entrepreneur principal contre tous recours et actions exercés contre ce dernier,`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    yPos -= 15;
    page2.drawText(`du fait de l'inexécution de ses obligations par le Sous-traitant.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Article 7
    yPos -= 30;
    page2.drawText(`Article 7 - Confidentialité`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page2.drawText(`Le Sous-traitant s'engage à garder confidentielles toutes les informations dont il pourrait`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 15;
    page2.drawText(`avoir connaissance dans le cadre de l'exécution du présent contrat.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Article 8
    yPos -= 30;
    page2.drawText(`Article 8 - Résiliation`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page2.drawText(`En cas de manquement par l'une des parties à l'une quelconque de ses obligations, l'autre partie`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 15;
    page2.drawText(`pourra résilier le présent contrat après mise en demeure restée sans effet pendant 15 jours.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Forcer un saut de page après l'article 8, peu importe l'espace restant
    // Créer une troisième page pour les articles 9, 10 et signatures
    const page3 = pdfDoc.addPage([595, 842]);
    yPos = page3.getHeight() - 50;
    
    // Article 9
    yPos -= 30;
    page3.drawText(`Article 9 - Litiges`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page3.drawText(`En cas de litige relatif à l'interprétation ou à l'exécution du présent contrat, les parties`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 15;
    page3.drawText(`s'efforceront de trouver une solution amiable. À défaut, le litige sera soumis aux tribunaux de Liège.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Article 10
    yPos -= 30;
    page3.drawText(`Article 10 - Droit applicable`, {
      x: 50,
      y: yPos,
      size: 12,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    page3.drawText(`Le présent contrat est soumis au droit belge.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Date et signatures
    yPos -= 60;
    page3.drawText(`Fait à ${companyInfo.ville}, le ${dateGeneration}, en deux exemplaires originaux.`, {
      x: 50,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Zone de signatures
    yPos -= 40;
    // Position des entêtes de signature mémorisée si besoin
    page3.drawText(`Pour l'Entrepreneur principal`, {
      x: 100,
      y: yPos,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    page3.drawText(`Pour le Sous-traitant`, {
      x: 350,
      y: yPos,
      size: 10,
      font: helveticaBoldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    yPos -= 20;
    const signatureNameY = yPos; // Mémoriser la position des noms
    page3.drawText(`Maccio Grégory`, {
      x: 100,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    page3.drawText(`${soustraitant.contact || soustraitant.nom}`, {
      x: 350,
      y: yPos,
      size: 10,
      font: helveticaFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    
    // Définir une position fixe pour les signatures (60 pixels sous les noms)
    const signatureY = signatureNameY - 60;
    
    // Ajouter la signature si elle existe
    if (signatureBuffer) {
      const signatureImagePrincipal = await pdfDoc.embedPng(signatureBuffer)
      const signatureSizePrincipal = signatureImagePrincipal.scale(0.2) // Réduire davantage la taille
      
      page3.drawImage(signatureImagePrincipal, {
        x: 100,
        y: signatureY,
        width: signatureSizePrincipal.width,
        height: signatureSizePrincipal.height,
      })
      
      // Ajouter la date et l'heure de signature
      const dateSignature = new Date()
      const dateFormatted = format(dateSignature, "dd/MM/yyyy à HH:mm", { locale: fr })
      
      // Positionner la date sous la signature
      page3.drawText(`Signé électroniquement le ${dateFormatted}`, {
        x: 100,
        y: signatureY - signatureSizePrincipal.height - 10,
        size: 8,
        font: await pdfDoc.embedFont(StandardFonts.Helvetica),
        color: rgb(0.1, 0.1, 0.1),
      })
    }
    
    // Sauvegarder le PDF
    const pdfBytes = await pdfDoc.save()
    await writeFile(filePath, pdfBytes)
    
    console.log('PDF généré avec succès:', filePath)
    
    // URL relative du fichier
    const fileUrl = `/uploads/documents/soustraitants/${soustraitantFolder}/${fileName}`
    console.log('URL relative du fichier:', fileUrl)
    
    // Créer l'entrée du contrat dans la base de données
    try {
      console.log('Création de l\'entrée dans la base de données...')
    await prisma.contrat.create({
        data: {
          soustraitantId: soustraitantId,
          url: fileUrl,
          token: token,
          estSigne: false,
          dateGeneration: new Date()
        }
      })
      console.log('Entrée créée avec succès dans la base de données')
    } catch (dbError) {
      console.error('Erreur lors de la création de l\'entrée dans la base de données:', dbError)
      // On continue malgré l'erreur pour retourner l'URL au client
    }
    
    return fileUrl
  } catch (error) {
    console.error("Erreur détaillée lors de la génération du contrat de sous-traitance:", error)
    console.error("Trace d'erreur:", error instanceof Error ? error.stack : "Pas de stack trace disponible")
    throw error
  }
}

/**
 * Signe un contrat de sous-traitance
 * @param token Token unique du contrat
 * @param signatureBase64 Signature du sous-traitant en base64
 * @returns L'URL du contrat signé
 */
export async function signerContrat(token: string, signatureBase64: string): Promise<string> {
  try {
    // Récupérer le contrat à partir du token
    const contrat = await prisma.contrat.findUnique({
      where: { token },
      include: { soustraitant: true }
    })
    
    if (!contrat) {
      throw new Error('Contrat non trouvé')
    }
    
    if (contrat.estSigne) {
      throw new Error('Ce contrat a déjà été signé')
    }
    
    // Informations d'entreprise non utilisées ici
    
    // Extraire le dossier de l'URL existante
    const urlParts = contrat.url.split('/')
    const folderName = urlParts[urlParts.length - 2]
    
    // Charger le PDF existant
    const pdfPath = join(process.cwd(), 'public', contrat.url)
    const pdfBytes = await readFile(pdfPath)
    const pdfDoc = await PDFDocument.load(pdfBytes)
    
    // Décoder la signature base64
    const signatureImageBytes = Buffer.from(signatureBase64, 'base64')
    
    // Incorporer la signature dans le document
    const signatureImage = await pdfDoc.embedPng(signatureImageBytes)
    
    // Récupérer la dernière page (pour les signatures)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    
    // Dessiner la signature du sous-traitant
    const signatureSize = signatureImage.scale(0.2) // Même échelle que la signature principale
    
    // Position fixe pour la signature du sous-traitant, alignée avec l'autre signature
    // La signature du principal est à une position de 100,220 approximativement
    const xPosition = 350;  // Aligné avec le texte "Pour le Sous-traitant"
    const yPosition = 220;  // Position fixe correspondant à celle du principal
    
    console.log("Position de la signature du sous-traitant:", xPosition, yPosition);
    
    lastPage.drawImage(signatureImage, {
      x: xPosition,
      y: yPosition,
      width: signatureSize.width,
      height: signatureSize.height,
    })
    
    // Ajouter la date et l'heure de signature
    const dateSignature = new Date()
    const dateFormatted = format(dateSignature, "dd/MM/yyyy à HH:mm", { locale: fr })
    
    // Positionner la date sous la signature
    lastPage.drawText(`Signé électroniquement le ${dateFormatted}`, {
      x: 350,
      y: yPosition - signatureSize.height - 10,
      size: 8,
      font: await pdfDoc.embedFont(StandardFonts.Helvetica),
      color: rgb(0.1, 0.1, 0.1),
    })
    
    // Chemin pour le nouveau PDF
    const fileName = `Contrat-${contrat.soustraitant.nom.replace(/\s+/g, '-')}-${format(new Date(), 'yyyyMMdd')}-signe.pdf`
    const folderPath = join(DOCUMENTS_BASE_PATH, 'soustraitants', folderName)
    const filePath = join(folderPath, fileName)
    
    console.log("Chemin du dossier:", folderPath)
    console.log("Chemin du fichier signé:", filePath)
    
    // Vérifier que le dossier existe
    try {
      await mkdir(folderPath, { recursive: true })
      console.log("Dossier créé ou existant vérifié")
    } catch (dirError) {
      console.error("Erreur lors de la création du dossier:", dirError)
      throw dirError
    }
    
    // Sauvegarder le PDF modifié
    try {
      const signedPdfBytes = await pdfDoc.save()
      await writeFile(filePath, signedPdfBytes)
      console.log(`Fichier signé sauvegardé avec succès (${signedPdfBytes.length} octets)`)
    } catch (fileError) {
      console.error("Erreur lors de la sauvegarde du fichier signé:", fileError)
      throw fileError
    }
    
    // URL relative du fichier
    const fileUrl = `/uploads/documents/soustraitants/${folderName}/${fileName}`
    console.log("URL relative du fichier:", fileUrl)
    
    // Mettre à jour le contrat dans la base de données
    await prisma.contrat.update({
      where: { id: contrat.id },
      data: {
        url: fileUrl,
        estSigne: true,
        dateSignature: new Date(),
        token: null // Invalider le token après signature
      }
    })
    
    return fileUrl
  } catch (error) {
    console.error("Erreur lors de la signature du contrat:", error)
    throw error
  }
} 
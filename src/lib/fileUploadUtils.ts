import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma/client'; // Adapter si prisma est initialisé différemment
// Retrait des types Prisma pour compatibilité build

// Fonction pour s'assurer que le répertoire de destination existe
export async function ensureDirectoryExists(directoryPath: string): Promise<void> {
  try {
    await fs.promises.access(directoryPath);
  } catch {
    await fs.promises.mkdir(directoryPath, { recursive: true });
  }
}

// Fonction pour sauvegarder un fichier sur le serveur
export async function saveFileToServer(file: File, savePath: string): Promise<string> {
  try {
    const directory = path.dirname(savePath);
    await ensureDirectoryExists(directory);
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.promises.writeFile(savePath, buffer);
    
    console.log(`Fichier sauvegardé avec succès à: ${savePath}`);
    return path.basename(savePath); // Retourne seulement le nom du fichier
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du fichier:', error);
    throw new Error(`Erreur lors de la sauvegarde du fichier`);
  }
}

// Fonction pour ajouter automatiquement une photo de remarque dans les documents du chantier
export async function ajouterPhotoAuxDocuments(
  chantierId: string, 
  remarqueId: string, 
  photoUrl: string, 
  descriptionRemarque: string, // Renommé pour plus de clarté
  userId: string,
  estPreuve: boolean = false // Ajout du paramètre estPreuve
): Promise<void> {
  try {
    const fileName = path.basename(photoUrl);
    // Simuler taille et mimetype, car on n'a pas le fichier original ici
    // Idéalement, ces infos seraient passées ou récupérées autrement si cruciales
    const fileSize = 100000; // Valeur placeholder
    const mimeType = 'image/jpeg'; // Valeur placeholder

    const metadata = {
      annotation: descriptionRemarque,
      origine: 'remarque',
      remarqueId: remarqueId,
      estPreuve: estPreuve,
      tags: ['Photo de chantier', ...(estPreuve ? ['Preuve de résolution'] : [])]
    };
    
    await prisma.document.create({
      data: {
        nom: `${estPreuve ? 'Preuve résolution' : 'Photo remarque'} - ${fileName}`,
        type: 'photo-chantier',
        url: photoUrl,
        taille: fileSize,
        mimeType: mimeType,
        chantierId: chantierId,
        createdBy: userId,
        updatedAt: new Date(), // Assure que updatedAt est toujours défini
        createdAt: new Date(), // Assure que createdAt est toujours défini
        metadata: metadata as unknown, // L'API Prisma acceptera JSON sérialisable
        estPlan: false // Une photo de remarque n'est pas un plan par défaut
      }
    });
    
    console.log(`Photo de remarque (${estPreuve ? 'preuve' : 'standard'}) ajoutée aux documents: ${photoUrl}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la photo aux documents:', error);
    // Ne pas bloquer le processus principal en cas d'échec ici
  }
}

// Potentiellement d'autres fonctions utilitaires de formatage si besoin
// function formatValues, formatDate, securiserUrlPhotos etc. 
'use client'

import { RefObject } from 'react'
// Imports lourds chargés à la demande dans la fonction

interface PDFGeneratorProps {
  elementRef: RefObject<HTMLDivElement>;
  title: string;
  subtitle: string;
  setGeneratingState: (isGenerating: boolean) => void;
}

export const generatePDF = async ({
  elementRef,
  title: _title,
  subtitle: _subtitle,
  setGeneratingState
}: PDFGeneratorProps): Promise<void> => {
  if (!elementRef.current) return;
  
  try {
    setGeneratingState(true);
    
    // TODO: Remplacer par une API Puppeteer pour la génération PDF
    console.log('Génération PDF désactivée - migration vers Puppeteer en cours');
    alert('Fonctionnalité PDF temporairement désactivée - migration vers Puppeteer en cours');
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
  } finally {
    setGeneratingState(false);
  }
}; 
export interface Depense {
  id: string;
  chantierId: string;
  date: string;
  montant: number;
  description: string;
  categorie: string;
  fournisseur?: string;
  reference?: string;
  justificatif?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepenseFormData {
  date: string;
  montant: number;
  description: string;
  categorie: string;
  fournisseur?: string;
  reference?: string;
  justificatif?: File | null;
}

export const CATEGORIES_DEPENSE = [
  'Matériaux',
  'Main d\'œuvre',
  'Équipement',
  'Transport',
  'Sous-traitance',
  'Administratif',
  'Autre'
]; 
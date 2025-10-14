export interface Rack {
  id: string;
  nom: string;
  position: string;
  lignes: number;
  colonnes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Emplacement {
  id: string;
  rackId: string;
  ligne: number;
  colonne: number;
  codeQR: string;
  statut: 'libre' | 'occupé';
  createdAt: Date;
  updatedAt: Date;
}

export interface Materiau {
  id: string;
  nom: string;
  description?: string;
  quantite: number;
  codeQR?: string;
  emplacementId?: string;
  createdAt: Date;
  updatedAt: Date;
  emplacement?: {
    id: string;
    ligne: number;
    colonne: number;
    statut: 'libre' | 'occupé';
    rack?: {
      id: string;
      nom: string;
      position: string;
    }
  };
}

export interface EmplacementWithMateriau extends Emplacement {
  materiaux: Materiau[];
}

export interface RackWithEmplacements extends Rack {
  emplacements: EmplacementWithMateriau[];
}

export type EmplacementCoordonnee = {
  rack: string;
  ligne: number;
  colonne: number;
}; 
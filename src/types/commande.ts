export interface Commande {
  id: number;
  chantierId: string;
  clientId?: string;
  dateCommande: Date;
  reference?: string;
  tauxTVA: number;
  sousTotal: number;
  totalOptions: number;
  tva: number;
  total: number;
  statut: string;
  estVerrouillee: boolean;
  createdAt: Date;
  updatedAt: Date;
  lignes: LigneCommande[];
}

export interface LigneCommande {
  id: number;
  commandeId: number;
  ordre: number;
  article: string;
  description: string;
  type: string;
  unite: string;
  prixUnitaire: number;
  quantite: number;
  total: number;
  estOption: boolean;
  createdAt: Date;
  updatedAt: Date;
} 
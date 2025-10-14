export interface LigneMarche {
  id: number
  article: number
  descriptif: string
  unite: string
  quantite: number
  prixUnitaire: number
  marcheId: number
}

export interface LigneAvenant {
  id: number
  article: number
  descriptif: string
  unite: string
  quantite: number
  prixUnitaire: number
  avenantId: number
}

export interface LigneEtat {
  id: number
  quantitePrecedente: number
  quantiteActuelle: number
  etatId: number
  ligneMarche?: LigneMarche
  ligneMarcheId?: number
  ligneAvenant?: LigneAvenant
  ligneAvenantId?: number
}

export interface Etat {
  id: number
  numero: number
  date: string
  chantierId: string
  lignes: LigneEtat[]
}

export interface Marche {
  id: number
  chantierId: string
  dateImport: string
  budget: number
  lignes: LigneMarche[]
  avenants: Avenant[]
}

export interface Avenant {
  id: number
  numero: number
  date: string
  description: string
  marcheId: number
  lignes: LigneAvenant[]
} 
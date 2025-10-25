export interface Pays {
  id: string
  nom: string
  code: string
  icone?: string
}

export interface Usine {
  id: string
  nom: string
  paysId: string
  pays?: Pays
}

export interface Chargement {
  id: string
  usineId: string
  usine?: Usine
  contenu: string // Poids, référence commande, ou les deux
  semaine: number // 1, 2, 3, 4...
  estCharge: boolean
  dateCreation: Date
  dateChargement?: Date
}

export interface PlanificationChargement {
  id: string
  usineId: string
  usine: Usine
  contenu: string
  semaine: number
  estCharge: boolean
  dateCreation: Date
  dateChargement?: Date
}

export interface ChargementCumule {
  usineId: string
  usine: Usine
  contenu: string
  semaine: number
  estCharge: boolean
  dateCreation: Date
  dateChargement?: Date
}

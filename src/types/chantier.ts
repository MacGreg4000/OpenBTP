export interface Chantier {
  id: string
  chantierId: string
  numeroIdentification: string | null
  clientId: string
  nomChantier: string
  dateCommencement: string
  etatChantier: string
  clientNom: string | null
  clientEmail: string | null
  clientAdresse: string | null
  client?: {
    id: string
    nom: string
  }
  adresseChantier: string | null
  latitude: number | null
  longitude: number | null
  budget: number
  dureeEnJours: number | null
  typeDuree: string
  createdAt: string
  updatedAt: string
} 
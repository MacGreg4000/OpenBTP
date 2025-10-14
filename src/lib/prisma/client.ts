/* eslint-disable @typescript-eslint/no-require-imports */
import type { PrismaClient as PrismaClientType } from '@prisma/client'
// Charger la classe à l'exécution pour éviter les soucis de type-only en build
type PrismaClientConstructor = new (...args: unknown[]) => PrismaClientType
const { PrismaClient } = require('@prisma/client') as { PrismaClient: PrismaClientConstructor }

// Étendre le client Prisma avec des types personnalisés
const prismaClientSingleton = () => {
  try {
    // Vérifier si nous sommes en mode de build statique et sans DATABASE_URL
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE === 'phase-production-build' && !process.env.DATABASE_URL) {
      // Créer un mock PrismaClient pour la compilation statique
      // console.log('🔶 Mode de build détecté, utilisation d\'un client Prisma mock')
      return createMockPrismaClient()
    }
    
    // Utiliser exclusivement la variable d'environnement DATABASE_URL
    // Ne jamais forcer une URL de base de données en dur ici
    
    const client = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    })
    
    // Ajouter des méthodes personnalisées si nécessaire
    return client
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de PrismaClient:', error)
    return createMockPrismaClient()
  }
}

// Créer un mock de PrismaClient pour le build statique
function createMockPrismaClient() {
  const handler = {
    get: function(_target: object, prop: string) {
      if (prop === '$connect') {
        return () => Promise.resolve()
      }
      if (prop === '$disconnect') {
        return () => Promise.resolve()
      }
      
      return new Proxy({}, {
        get: function() {
          return () => Promise.resolve([])
        }
      })
    }
  }
  
  return new Proxy({}, handler) as unknown as PrismaClientType
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined
}

// Typage permissif et stable pour build: conserve les délégués Prisma et les méthodes brutes
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaUntyped = { [key: string]: any } & {
  $queryRaw: <T = unknown>(...args: unknown[]) => Promise<T>
  $queryRawUnsafe: <T = unknown>(...args: unknown[]) => Promise<T>
  $executeRaw: (...args: unknown[]) => Promise<unknown>
  $executeRawUnsafe: (...args: unknown[]) => Promise<unknown>
}

export const prisma = (globalForPrisma.prisma ?? prismaClientSingleton()) as unknown as PrismaUntyped

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma as unknown as PrismaClientSingleton

// Types personnalisés pour les commandes sous-traitant
export interface CommandeSousTraitantWithRelations {
  id: number
  chantierId: string
  soustraitantId: string
  dateCommande: Date
  reference: string | null
  tauxTVA: number
  sousTotal: number
  tva: number
  total: number
  statut: string
  estVerrouillee: boolean
  createdAt: Date
  updatedAt: Date
  chantier: {
    id: number
    chantierId: string
    nomChantier: string
    // autres propriétés du chantier
  }
  soustraitant: {
    id: string
    nom: string
    email: string
    contact: string | null
    adresse: string | null
    telephone: string | null
    tva: string | null
    // autres propriétés du sous-traitant
  }
  lignes: {
    id: number
    commandeSousTraitantId: number
    ordre: number
    article: string
    description: string
    type: string
    unite: string
    prixUnitaire: number
    quantite: number
    total: number
    createdAt: Date
    updatedAt: Date
  }[]
} 
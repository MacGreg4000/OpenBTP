import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Type Prisma étendu sans utiliser de namespace
export type PrismaClientWithExtensions = PrismaClient & {
  // tolérance large pour les extensions non typées (évite erreurs de compilation)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rack?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emplacement?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  materiau?: any
}

// Utiliser le client centralisé et l'exposer avec le type étendu
const prismaWithExtensions = prisma as unknown as PrismaClientWithExtensions

export { prismaWithExtensions }
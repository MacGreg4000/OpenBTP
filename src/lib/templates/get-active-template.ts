import { prisma } from '@/lib/prisma/client'
import { TemplateCategory } from './template-categories'

/**
 * Récupère le contenu HTML du template actif pour une catégorie donnée.
 * Retourne null si aucun template actif n'est trouvé.
 */
export async function getActiveTemplateHtml(category: TemplateCategory): Promise<string | null> {
  const template = await prisma.contractTemplate.findFirst({
    where: {
      category,
      isActive: true
    },
    orderBy: {
      updatedAt: 'desc'
    }
  })

  return template?.htmlContent ?? null
}


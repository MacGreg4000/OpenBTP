export const TEMPLATE_CATEGORIES = ['CONTRAT', 'CGV'] as const

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number]

export function isTemplateCategory(value: unknown): value is TemplateCategory {
  return typeof value === 'string' && (TEMPLATE_CATEGORIES as readonly string[]).includes(value)
}


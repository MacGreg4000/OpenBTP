export const ADMIN_TASKS = [
  {
    id: 'declaration_chantier',
    label: 'Déclaration de chantier',
    category: 'administrative'
  },
  {
    id: 'cautionnement_collectif',
    label: 'Cautionnement collectif',
    category: 'administrative'
  },
  {
    id: 'declaration_sous_traitance',
    label: 'Déclaration de sous-traitance',
    category: 'administrative'
  },
  {
    id: 'fiche_technique',
    label: 'Fiche technique validée',
    category: 'technique'
  }
] as const

export type AdminTaskType = typeof ADMIN_TASKS[number]['id'] 
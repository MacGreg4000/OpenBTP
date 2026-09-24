// Libellés FR/PT des statuts publiés sur la page Checkinatwork. Module pur
// (sans Prisma) pour être importable par le composant client de la page.

export const LIBELLES_STATUT_CHECKIN: Record<string, { fr: string; pt: string }> = {
  EN_COURS: { fr: 'En cours', pt: 'Em curso' },
  A_VENIR: { fr: 'À venir', pt: 'A iniciar' },
  EN_PREPARATION: { fr: 'En préparation', pt: 'Em preparação' },
}

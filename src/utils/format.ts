/**
 * Formate un nombre en devise (EUR par défaut)
 * @param amount Le montant à formater
 * @param currency La devise (par défaut EUR)
 * @returns Le montant formaté en chaîne de caractères
 */
export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(amount);
};

/**
 * Formate un nombre avec séparateurs de milliers
 * @param num Le nombre à formater
 * @param decimals Le nombre de décimales (par défaut 2)
 * @returns Le nombre formaté en chaîne de caractères
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

/**
 * Formate un pourcentage
 * @param value La valeur à formater (ex: 0.15 pour 15%)
 * @param decimals Le nombre de décimales (par défaut 1)
 * @returns Le pourcentage formaté en chaîne de caractères
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Convertit différents formats de date en objet Date valide
 * @param date Une date sous forme string, timestamp ou objet Date
 * @returns Un objet Date ou null si la conversion échoue
 */
export function parseDate(date: unknown): Date | null {
  if (!date) return null;
  
  try {
    // Si c'est déjà un objet Date
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Si c'est un nombre (timestamp)
    if (typeof date === 'number' || !isNaN(Number(date as number))) {
      const dateObj = new Date(Number(date as number));
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
    
    // Si c'est une string
    if (typeof date === 'string') {
      // Format MySQL (YYYY-MM-DD HH:MM:SS)
      if (date.includes('-') && date.includes(':') && !date.includes('T')) {
        const dateObj = new Date(date.replace(' ', 'T'));
        return isNaN(dateObj.getTime()) ? null : dateObj;
      }
      
      // Standard ISO ou autres formats supportés par le constructeur Date
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }
  } catch (e) {
    console.error("Erreur lors du parsing de la date:", e, date);
    return null;
  }
  
  return null;
}

/**
 * Formate une date en format français (JJ/MM/AAAA)
 * @param date Une date sous forme string, timestamp ou objet Date
 * @param fallbackText Texte à retourner si la date est invalide (défaut: "Date non disponible")
 * @returns La date formatée ou le texte de fallback
 */
export function formatDate(date: unknown, fallbackText: string = "Date non disponible"): string {
  const dateObj = parseDate(date);
  if (!dateObj) return fallbackText;
  
  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Formate une date en format français long (JJ mois AAAA)
 * @param date Une date sous forme string, timestamp ou objet Date
 * @param fallbackText Texte à retourner si la date est invalide (défaut: "Date non disponible")
 * @returns La date formatée en format long ou le texte de fallback
 */
export function formatDateLong(date: unknown, fallbackText: string = "Date non disponible"): string {
  const dateObj = parseDate(date);
  if (!dateObj) return fallbackText;
  
  return dateObj.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Convertit une date en format ISO pour l'API
 * @param date Une date sous forme string, timestamp ou objet Date
 * @returns La date au format ISO ou null si invalide
 */
export function dateToISOString(date: unknown): string | null {
  const dateObj = parseDate(date);
  return dateObj ? dateObj.toISOString() : null;
} 
import { Depense } from '@/types/depense'

/**
 * Calcule le montant total des états d'avancement
 */
export function calculateTotalRevenue(etatsAvancement: Array<{ montantTotal?: number; lignes?: Array<{ montantTotal?: number }> }>): number {
  return etatsAvancement.reduce((total, etat) => {
    // Si l'état a un montant total, l'ajouter au total
    if (etat.montantTotal) {
      return total + etat.montantTotal
    }
    
    // Sinon, calculer à partir des lignes si disponibles
    if (etat.lignes && etat.lignes.length > 0) {
      const lignesTotal = etat.lignes.reduce((sum: number, ligne: { montantTotal?: number }) => sum + (ligne.montantTotal || 0), 0)
      return total + lignesTotal
    }
    
    return total
  }, 0)
}

/**
 * Calcule le montant total des états sous-traitants
 */
export function calculateTotalSubcontractorCosts(etatsSoustraitants: Array<{ montantTotal?: number }>): number {
  return etatsSoustraitants.reduce((total, etat) => {
    return total + (etat.montantTotal || 0)
  }, 0)
}

/**
 * Calcule le montant total des dépenses
 */
export function calculateTotalExpenses(depenses: Depense[]): number {
  return depenses.reduce((total, depense) => {
    return total + (depense.montant || 0)
  }, 0)
}

/**
 * Calcule le résultat net (revenus - coûts sous-traitants - dépenses)
 */
export function calculateNetResult(totalRevenue: number, totalSubcontractorCosts: number, totalExpenses: number): number {
  return totalRevenue - totalSubcontractorCosts - totalExpenses
}

/**
 * Calcule la marge en pourcentage
 */
export function calculateMargin(totalRevenue: number, netResult: number): number {
  if (totalRevenue === 0) return 0
  return (netResult / totalRevenue) * 100
}

/**
 * Regroupe les dépenses par catégorie
 */
export function groupExpensesByCategory(depenses: Depense[]): Record<string, number> {
  return depenses.reduce((grouped, depense) => {
    const categorie = depense.categorie || 'Autre'
    if (!grouped[categorie]) {
      grouped[categorie] = 0
    }
    grouped[categorie] += depense.montant || 0
    return grouped
  }, {} as Record<string, number>)
}

/**
 * Prépare les données pour le graphique en donut
 */
export function prepareDonutChartData(expensesByCategory: Record<string, number>): {
  labels: string[];
  data: number[];
  backgroundColor: string[];
} {
  const labels = Object.keys(expensesByCategory)
  const data = Object.values(expensesByCategory)
  
  // Couleurs pour chaque catégorie
  const colorMap: Record<string, string> = {
    'Matériaux': 'rgba(54, 162, 235, 0.8)',
    'Main d\'œuvre': 'rgba(255, 159, 64, 0.8)',
    'Équipement': 'rgba(75, 192, 192, 0.8)',
    'Transport': 'rgba(255, 99, 132, 0.8)',
    'Sous-traitance': 'rgba(153, 102, 255, 0.8)',
    'Administratif': 'rgba(255, 205, 86, 0.8)',
    'Autre': 'rgba(201, 203, 207, 0.8)'
  }
  
  const backgroundColor = labels.map(label => colorMap[label] || 'rgba(201, 203, 207, 0.8)')
  
  return {
    labels,
    data,
    backgroundColor
  }
}

/**
 * Prépare les données pour le graphique en ligne
 */
export function prepareLineChartData(
  etatsAvancement: Array<{ date: string | Date; montantTotal?: number }>, 
  etatsSoustraitants: Array<{ montantTotal?: number }>, 
  depenses: Depense[]
): {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
  }[];
} {
  // Trier les états par date
  const sortedEtats = [...etatsAvancement].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // Créer les labels (dates)
  const labels = sortedEtats.map(etat => 
    new Date(etat.date).toLocaleDateString('fr-FR')
  )
  
  // Calculer les revenus cumulés
  let cumulativeRevenue = 0
  const revenueData = sortedEtats.map(etat => {
    cumulativeRevenue += etat.montantTotal || 0
    return cumulativeRevenue
  })
  
  // Calculer les dépenses cumulées (sous-traitants + dépenses directes)
  // Pour simplifier, nous répartissons les dépenses uniformément entre les états
  const totalExpensesAmount = calculateTotalExpenses(depenses)
  const totalSubcontractorAmount = calculateTotalSubcontractorCosts(etatsSoustraitants)
  const totalCosts = totalExpensesAmount + totalSubcontractorAmount
  
  const expensesPerState = totalCosts / sortedEtats.length
  let cumulativeExpenses = 0
  const expensesData = sortedEtats.map(() => {
    cumulativeExpenses += expensesPerState
    return cumulativeExpenses
  })
  
  // Calculer le résultat net cumulé
  const netResultData = revenueData.map((revenue, index) => {
    return revenue - expensesData[index]
  })
  
  return {
    labels,
    datasets: [
      {
        label: 'Recettes',
        data: revenueData,
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        fill: false
      },
      {
        label: 'Dépenses',
        data: expensesData,
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        fill: false
      },
      {
        label: 'Résultat net',
        data: netResultData,
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        fill: false
      }
    ]
  }
} 
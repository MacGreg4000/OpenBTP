'use client';

import DashboardPage from '../page'; // Importe le composant DashboardPage de src/app/(dashboard)/page.tsx

// Assurez-vous que cet export est présent si le composant DashboardPage l'exigeait à l'origine
// (il était présent dans src/app/(dashboard)/page.tsx)
export const dynamic = 'force-dynamic';

export default function RoutedDashboardPage() {
  return <DashboardPage />;
} 
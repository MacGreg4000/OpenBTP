'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  ArrowPathIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'
import React from 'react'

export default function ReceptionPage({ 
  params 
}: { 
  params: Promise<{ chantierId: string }> 
}) {
  // Utiliser React.use pour déballer la Promise params
  const resolvedParams = React.use(params);
  const chantierId = resolvedParams.chantierId;
  
  const router = useRouter()
  const { data: session, status } = useSession()
  const [, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    // Fonction pour récupérer les réceptions et rediriger automatiquement
    const fetchAndRedirect = async () => {
      if (status === 'loading') return;
      
      if (!session) {
        router.push('/api/auth/signin');
        return;
      }
      
      try {
        console.log(`Tentative de récupération des réceptions pour le chantier: ${chantierId}`);
        
        // Récupérer toutes les réceptions pour ce chantier
        const receptionsRes = await fetch(`/api/chantiers/${chantierId}/reception`);
        
        if (!receptionsRes.ok) {
          const errorText = await receptionsRes.text();
          console.error(`Erreur API (${receptionsRes.status}):`, errorText);
          throw new Error(`Erreur lors du chargement des réceptions: ${receptionsRes.status} - ${errorText || 'Erreur inconnue'}`);
        }
        
        // Récupérer le texte de la réponse et vérifier qu'il est valide avant de le parser
        const responseText = await receptionsRes.text();
        console.log('Réponse brute reçue:', responseText.substring(0, 200) + '...');
        
        let receptionsData;
        try {
          receptionsData = JSON.parse(responseText);
          console.log('Réceptions récupérées:', receptionsData);
        } catch (jsonError) {
          console.error('Erreur de parsing JSON:', jsonError);
          const msg = jsonError instanceof Error ? jsonError.message : 'Erreur inconnue';
          throw new Error(`Erreur lors du parsing de la réponse JSON: ${msg}`);
        }
        
        // Vérifier que la réponse est un tableau
        if (!Array.isArray(receptionsData)) {
          console.error('Format de réponse invalide:', receptionsData);
          throw new Error(`Format de réponse invalide: la réponse n'est pas un tableau`);
        }
        
        // Vérifier si des réceptions existent
        if (receptionsData.length > 0) {
          // Si une réception existe déjà, rediriger vers celle-ci
          // D'après les spécifications, il ne devrait y avoir qu'une seule réception par chantier
          const receptionId = receptionsData[0].id;
          if (!receptionId) {
            throw new Error('ID de réception manquant dans la réponse');
          }
          router.push(`/chantiers/${chantierId}/reception/${receptionId}`);
        } else {
          // Si aucune réception n'existe, rediriger vers la page de création
          router.push(`/chantiers/${chantierId}/reception/nouveau`);
        }
      } catch (error) {
        console.error('Erreur:', error);
        setError(error instanceof Error ? error.message : 'Erreur inconnue');
        setLoading(false);
      }
    };
    
    fetchAndRedirect();
  }, [chantierId, router, session, status]);
  
  // Afficher un état de chargement ou une erreur
  if (error) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg w-full">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
            <h2 className="text-xl font-semibold text-red-700">Erreur lors du chargement</h2>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <div className="flex justify-between">
            <Button 
              onClick={() => window.location.reload()}
              variant="secondary"
            >
              Réessayer
            </Button>
            <Link href={`/chantiers/${chantierId}`}>
              <Button variant="primary">
                Retour au chantier
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex justify-center items-center">
      <ArrowPathIcon className="h-8 w-8 text-red-500 animate-spin" />
    </div>
  );
} 
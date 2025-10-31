'use client'
import { useState, useEffect, use } from 'react';
// import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  PencilSquareIcon,
  DocumentIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Breadcrumb } from '@/components/Breadcrumb'

interface Ouvrier {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  dateEntree: string
  poste: string
  _count?: {
    documentOuvrier: number
  }
}

interface SousTraitant {
  id: string
  nom: string
  ouvrier?: Ouvrier[]  // Ancien format (pour rétrocompatibilité)
  ouvriers?: Ouvrier[] // Nouveau format
}

// Modal de confirmation pour la suppression
function DeleteModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  ouvrierName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  ouvrierName: string 
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Confirmer la suppression</h3>
        <p className="text-sm text-gray-500 mb-4">
          Êtes-vous sûr de vouloir supprimer l'ouvrier {ouvrierName} ? Cette action est irréversible.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            onClick={onConfirm}
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OuvriersPage(
  props: { 
    params: Promise<{ id: string }> 
  }
) {
  const params = use(props.params);
  // const router = useRouter()
  const { data: session } = useSession()
  const [sousTraitant, setSousTraitant] = useState<SousTraitant | null>(null)
  const [ouvriers, setOuvriers] = useState<Ouvrier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [ouvrierToDelete, setOuvrierToDelete] = useState<Ouvrier | null>(null)

  // Charger les données du sous-traitant
  useEffect(() => {
    if (session) {
      console.log('Chargement des données pour le sous-traitant ID:', params.id);
      // Charger les informations du sous-traitant
      fetch(`/api/sous-traitants/${params.id}`)
        .then(res => {
          if (!res.ok) {
            console.error('Erreur HTTP:', res.status, res.statusText);
            throw new Error('Erreur lors du chargement du sous-traitant');
          }
          return res.json();
        })
        .then(data => {
          console.log('Données du sous-traitant reçues:', data.nom);
          setSousTraitant(data);
          
          // Vérifier d'abord ouvriers (nouveau format)
          if (data.ouvriers && Array.isArray(data.ouvriers)) {
            console.log(`${data.ouvriers.length} ouvriers trouvés (nouveau format)`);
            setOuvriers(data.ouvriers);
            setLoading(false);
          } 
          // Vérifier ensuite ouvrier (ancien format pour compatibilité)
          else if (data.ouvrier && Array.isArray(data.ouvrier)) {
            console.log(`${data.ouvrier.length} ouvriers trouvés (ancien format)`);
            setOuvriers(data.ouvrier);
            setLoading(false);
          } else {
            console.log('Aucun ouvrier trouvé ou format incorrect');
            setOuvriers([]);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('Erreur:', error);
          setError('Erreur lors du chargement des données');
          setLoading(false);
        });
    }
  }, [session, params.id]);

  // Fonction pour supprimer un ouvrier
  const handleDeleteOuvrier = async () => {
    if (!ouvrierToDelete) return
    
    try {
      const res = await fetch(`/api/sous-traitants/${params.id}/ouvriers/${ouvrierToDelete.id}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Erreur lors de la suppression')
      
      // Mettre à jour la liste des ouvriers
      setOuvriers(ouvriers.filter(o => o.id !== ouvrierToDelete.id))
      setDeleteModalOpen(false)
      setOuvrierToDelete(null)
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      setError('Erreur lors de la suppression de l\'ouvrier')
    }
  }

  // Ouvrir la modal de suppression
  const openDeleteModal = (ouvrier: Ouvrier) => {
    setOuvrierToDelete(ouvrier)
    setDeleteModalOpen(true)
  }

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!sousTraitant) return <div className="p-8">Sous-traitant non trouvé</div>

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Sous-traitants', href: '/sous-traitants' },
          { label: sousTraitant.nom, href: `/sous-traitants/${params.id}/ouvriers` },
          { label: 'Ouvriers' }
        ]}
      />

      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:tracking-tight">
            Ouvriers de {sousTraitant.nom}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link
            href="/sous-traitants"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Retour à la liste
          </Link>
          <Link
            href={`/sous-traitants/${params.id}/ouvriers/nouveau`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Ajouter un ouvrier
          </Link>
        </div>
      </div>

      {ouvriers.length === 0 ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <p className="text-gray-500">Aucun ouvrier trouvé pour ce sous-traitant.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poste
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'entrée
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documents
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ouvriers.map((ouvrier) => (
                <tr key={ouvrier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}`} className="text-blue-600 hover:text-blue-900">
                      {ouvrier.prenom} {ouvrier.nom}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ouvrier.poste}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ouvrier.email || ouvrier.telephone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {format(new Date(ouvrier.dateEntree), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {ouvrier._count?.documentOuvrier || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}/documents`}
                        className="text-gray-500 hover:text-gray-700"
                        title="Documents"
                      >
                        <DocumentIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => openDeleteModal(ouvrier)}
                        className="text-red-600 hover:text-red-900"
                        title="Supprimer"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      <DeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteOuvrier}
        ouvrierName={ouvrierToDelete ? `${ouvrierToDelete.prenom} ${ouvrierToDelete.nom}` : ''}
      />
    </div>
  )
} 
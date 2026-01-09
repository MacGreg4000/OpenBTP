'use client'
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  PencilSquareIcon,
  DocumentIcon,
  TrashIcon,
  PlusIcon,
  UserGroupIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import PageHeader from '@/components/PageHeader'

interface Ouvrier {
  id: string
  nom: string
  prenom: string
  email: string | null
  telephone: string | null
  dateEntree: string
  poste: string
  _count?: {
    DocumentOuvrier: number
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
    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Confirmer la suppression</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Êtes-vous sûr de vouloir supprimer l'ouvrier {ouvrierName} ? Cette action est irréversible.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 dark:bg-red-500 border border-transparent rounded-md hover:bg-red-700 dark:hover:bg-red-600"
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
  const router = useRouter()
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

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    </div>
  )
  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 dark:text-red-400">{error}</div>
      </div>
    </div>
  )
  if (!sousTraitant) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500 dark:text-gray-400">Sous-traitant non trouvé</div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title={`Ouvriers de ${sousTraitant.nom}`}
        subtitle="Gestion des ouvriers du sous-traitant"
        icon={UserGroupIcon}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/sous-traitants')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <button
              onClick={() => router.push(`/sous-traitants/${params.id}/ouvriers/nouveau`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter un ouvrier</span>
            </button>
          </div>
        }
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {ouvriers.length === 0 ? (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400">Aucun ouvrier trouvé pour ce sous-traitant.</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Nom
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Poste
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Contact
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Date d'entrée
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Documents
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {ouvriers.map((ouvrier) => (
                <tr key={ouvrier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}`} className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300">
                      {ouvrier.prenom} {ouvrier.nom}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {ouvrier.poste}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {ouvrier.email || ouvrier.telephone || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(ouvrier.dateEntree), 'dd/MM/yyyy', { locale: fr })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {ouvrier._count?.DocumentOuvrier ?? 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}/documents`}
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                        title="Documents"
                      >
                        <DocumentIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/sous-traitants/${params.id}/ouvriers/${ouvrier.id}/edit`}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Modifier"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => openDeleteModal(ouvrier)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
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
    </div>
  )
} 
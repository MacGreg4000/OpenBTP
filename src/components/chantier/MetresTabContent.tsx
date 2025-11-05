'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface MetreLigne {
  id: string
  description: string
  unite: string
  longueur: number | null
  largeur: number | null
  hauteur: number | null
  quantite: number
  notes: string | null
}

interface MetreCategorie {
  id: string
  nom: string
  unite: string
  lignes: MetreLigne[]
}

interface Metre {
  id: string
  date: string
  commentaire: string | null
  createdAt: string
  categories: MetreCategorie[]
  createdByUser: {
    id: string
    name: string | null
    email: string
  }
}

interface MetresTabContentProps {
  chantierId: string
}

export default function MetresTabContent({ chantierId }: MetresTabContentProps) {
  const router = useRouter()
  const [metres, setMetres] = useState<Metre[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMetres, setExpandedMetres] = useState<Set<string>>(new Set())
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [deletingMetreId, setDeletingMetreId] = useState<string | null>(null)

  useEffect(() => {
    loadMetres()
  }, [chantierId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMetres = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/chantiers/${chantierId}/metres`)
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des métrés')
      }
      const data = await response.json()
      setMetres(data)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMetre = (metreId: string) => {
    setExpandedMetres((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(metreId)) {
        newSet.delete(metreId)
      } else {
        newSet.add(metreId)
      }
      return newSet
    })
  }

  const toggleCategorie = (categorieId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(categorieId)) {
        newSet.delete(categorieId)
      } else {
        newSet.add(categorieId)
      }
      return newSet
    })
  }

  const calculateTotalCategorie = (categorie: MetreCategorie): number => {
    return categorie.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
  }

  const calculateTotalMetre = (metre: Metre): number => {
    return metre.categories.reduce(
      (sum, cat) => sum + calculateTotalCategorie(cat),
      0
    )
  }

  const handleDeleteMetre = async (metreId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce métré ?')) return

    try {
      setDeletingMetreId(metreId)
      const response = await fetch(
        `/api/chantiers/${chantierId}/metres/${metreId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression')
      }

      await loadMetres()
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de la suppression du métré')
    } finally {
      setDeletingMetreId(null)
    }
  }

  const handleEditMetre = (metreId: string) => {
    // Rediriger vers la page mobile pour l'édition
    // Ou ouvrir un modal d'édition (à implémenter si nécessaire)
    router.push(`/mobile/metres/${metreId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement des métrés...</span>
      </div>
    )
  }

  if (metres.length === 0) {
    return (
      <div className="text-center py-12">
        <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium mb-2">Aucun métré pour ce chantier</p>
        <p className="text-sm text-gray-500 mb-4">
          Créez un nouveau métré depuis l'application mobile
        </p>
        <button
          onClick={() => router.push('/mobile/metres/nouveau')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau métré
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Métrés du chantier
        </h3>
        <button
          onClick={() => router.push('/mobile/metres/nouveau')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau métré
        </button>
      </div>

      <div className="space-y-4">
        {metres.map((metre) => {
          const isExpanded = expandedMetres.has(metre.id)
          const totalMetre = calculateTotalMetre(metre)
          const totalLignes = metre.categories.reduce(
            (sum, cat) => sum + cat.lignes.length,
            0
          )

          return (
            <div
              key={metre.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden"
            >
              {/* En-tête du métré */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleMetre(metre.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Métré du{' '}
                            {format(new Date(metre.date), 'dd/MM/yyyy', {
                              locale: fr,
                            })}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {metre.categories.length} catégorie
                            {metre.categories.length > 1 ? 's' : ''} • {totalLignes}{' '}
                            ligne{totalLignes > 1 ? 's' : ''} • Total : {totalMetre.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditMetre(metre.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                      title="Éditer"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMetre(metre.id)}
                      disabled={deletingMetreId === metre.id}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg disabled:opacity-50"
                      title="Supprimer"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenu du métré (déplié) */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Catégories */}
                  {metre.categories.map((categorie) => {
                    const isCatExpanded = expandedCategories.has(categorie.id)
                    const totalCategorie = calculateTotalCategorie(categorie)

                    return (
                      <div
                        key={categorie.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {/* En-tête de catégorie */}
                        <button
                          onClick={() => toggleCategorie(categorie.id)}
                          className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <div className="flex items-center gap-2">
                            {isCatExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">
                              {categorie.nom}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({categorie.unite})
                            </span>
                          </div>
                          {!isCatExpanded && (
                            <span className="text-sm text-gray-500">
                              {categorie.lignes.length} ligne
                              {categorie.lignes.length > 1 ? 's' : ''} •{' '}
                              {totalCategorie.toFixed(2)} {categorie.unite}
                            </span>
                          )}
                        </button>

                        {/* Lignes de la catégorie (dépliée) */}
                        {isCatExpanded && (
                          <div className="p-4 bg-white dark:bg-gray-800">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Description
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Longueur
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Largeur
                                    </th>
                                    <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Hauteur
                                    </th>
                                    <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Quantité
                                    </th>
                                    <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">
                                      Notes
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {categorie.lignes.map((ligne) => (
                                    <tr
                                      key={ligne.id}
                                      className="border-b border-gray-100 dark:border-gray-700/50"
                                    >
                                      <td className="py-2 px-3 text-gray-900 dark:text-white">
                                        {ligne.description}
                                      </td>
                                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                                        {ligne.longueur ? `${ligne.longueur} m` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                                        {ligne.largeur ? `${ligne.largeur} m` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                                        {ligne.hauteur ? `${ligne.hauteur} m` : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-right font-medium text-gray-900 dark:text-white">
                                        {ligne.quantite.toFixed(2)} {ligne.unite}
                                      </td>
                                      <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                        {ligne.notes || '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                                    <td
                                      colSpan={4}
                                      className="py-2 px-3 text-right text-gray-700 dark:text-gray-300"
                                    >
                                      Total catégorie :
                                    </td>
                                    <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                                      {totalCategorie.toFixed(2)} {categorie.unite}
                                    </td>
                                    <td></td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Commentaire global */}
                  {metre.commentaire && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="font-medium">Commentaire :</span>{' '}
                        {metre.commentaire}
                      </p>
                    </div>
                  )}

                  {/* Total général */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        Total général :
                      </span>
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {totalMetre.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Informations */}
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Créé le{' '}
                    {format(new Date(metre.createdAt), 'dd/MM/yyyy à HH:mm', {
                      locale: fr,
                    })}{' '}
                    par {metre.createdByUser.name || metre.createdByUser.email}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


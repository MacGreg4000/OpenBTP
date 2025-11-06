'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { use } from 'react'
import {
  ArrowLeftIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface MetreLigne {
  id: string
  description: string
  unite: string
  longueur: number | null
  largeur: number | null
  hauteur: number | null
  quantite: number
  notes: string
}

interface MetreCategorie {
  id: string
  nom: string
  unite: string
  lignes: MetreLigne[]
  isExpanded: boolean
}

export default function NouveauMetrePage(props: { params: Promise<{ chantierId: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const { chantierId } = params
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [commentaire, setCommentaire] = useState('')
  const [categories, setCategories] = useState<MetreCategorie[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chantier, setChantier] = useState<{ nomChantier: string } | null>(null)
  const [showAddCategorieModal, setShowAddCategorieModal] = useState(false)
  const [newCategorieNom, setNewCategorieNom] = useState('')
  const [newCategorieUnite, setNewCategorieUnite] = useState('m²')
  const [editingCategorieId, setEditingCategorieId] = useState<string | null>(null)

  useEffect(() => {
    // Charger les informations du chantier
    const loadChantier = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}`)
        if (response.ok) {
          const data = await response.json()
          setChantier(data)
        }
      } catch (error) {
        console.error('Erreur lors du chargement du chantier:', error)
      } finally {
        setLoading(false)
      }
    }
    loadChantier()
  }, [chantierId])

  const toggleCategorie = (categorieId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categorieId ? { ...cat, isExpanded: !cat.isExpanded } : cat
      )
    )
  }

  const addCategorie = () => {
    if (!newCategorieNom.trim()) {
      toast.error('Veuillez saisir un nom de catégorie')
      return
    }

    const newCategorie: MetreCategorie = {
      id: Math.random().toString(36).substring(2, 9),
      nom: newCategorieNom.trim(),
      unite: newCategorieUnite,
      lignes: [],
      isExpanded: true,
    }

    setCategories((prev) => [...prev, newCategorie])
    setNewCategorieNom('')
    setNewCategorieUnite('m²')
    setShowAddCategorieModal(false)
  }

  const deleteCategorie = (categorieId: string) => {
    if (!confirm('Supprimer cette catégorie ?')) return
    setCategories((prev) => prev.filter((cat) => cat.id !== categorieId))
  }

  const editCategorie = (categorieId: string, newNom: string, newUnite: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categorieId ? { ...cat, nom: newNom, unite: newUnite } : cat
      )
    )
    setEditingCategorieId(null)
  }

  const addLigne = (categorieId: string) => {
    const newLigne: MetreLigne = {
      id: Math.random().toString(36).substring(2, 9),
      description: '',
      unite: categories.find((c) => c.id === categorieId)?.unite || 'm²',
      longueur: null,
      largeur: null,
      hauteur: null,
      quantite: 0,
      notes: '',
    }

    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categorieId
          ? { ...cat, lignes: [...cat.lignes, newLigne] }
          : cat
      )
    )
  }

  const updateLigne = (
    categorieId: string,
    ligneId: string,
    updates: Partial<MetreLigne>
  ) => {
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id !== categorieId) return cat
        const updatedLignes = cat.lignes.map((ligne) => {
          if (ligne.id !== ligneId) return ligne

          const updated = { ...ligne, ...updates }

          // Calcul automatique de la quantité
          if (
            (updates.longueur !== undefined ||
              updates.largeur !== undefined ||
              updates.hauteur !== undefined) &&
            (updated.longueur !== null || updated.largeur !== null || updated.hauteur !== null)
          ) {
            // Si longueur ET largeur → surface
            if (updated.longueur && updated.largeur) {
              updated.quantite = updated.longueur * updated.largeur
            }
            // Si longueur ET hauteur → surface
            else if (updated.longueur && updated.hauteur) {
              updated.quantite = updated.longueur * updated.hauteur
            }
            // Sinon, utiliser la longueur si disponible
            else if (updated.longueur) {
              updated.quantite = updated.longueur
            }
          }

          return updated
        })
        return { ...cat, lignes: updatedLignes }
      })
    )
  }

  const deleteLigne = (categorieId: string, ligneId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categorieId
          ? { ...cat, lignes: cat.lignes.filter((l) => l.id !== ligneId) }
          : cat
      )
    )
  }

  const calculateTotalCategorie = (categorie: MetreCategorie): number => {
    return categorie.lignes.reduce((sum, ligne) => sum + ligne.quantite, 0)
  }

  const handleSubmit = async () => {
    if (categories.length === 0) {
      toast.error('Veuillez ajouter au moins une catégorie')
      return
    }

    // Vérifier que chaque catégorie a au moins une ligne
    for (const cat of categories) {
      if (cat.lignes.length === 0) {
        toast.error(`La catégorie "${cat.nom}" doit avoir au moins une ligne`)
        return
      }

      // Vérifier que chaque ligne a une description
      for (const ligne of cat.lignes) {
        if (!ligne.description.trim()) {
          toast.error('Veuillez remplir toutes les descriptions')
          return
        }
      }
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/chantiers/${chantierId}/metres`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          commentaire: commentaire || null,
          categories: categories.map((cat, catIndex) => ({
            nom: cat.nom,
            unite: cat.unite,
            ordre: catIndex,
            lignes: cat.lignes.map((ligne, ligneIndex) => ({
              description: ligne.description,
              unite: ligne.unite,
              longueur: ligne.longueur,
              largeur: ligne.largeur,
              hauteur: ligne.hauteur,
              quantite: ligne.quantite,
              notes: ligne.notes || null,
              ordre: ligneIndex,
            })),
          })),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }

      toast.success('Métré créé avec succès !')
      router.push(`/chantiers/${chantierId}/documents`)
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/chantiers/${chantierId}/documents`)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Nouveau métré
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Chantier: {chantier?.nomChantier || 'Chargement...'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le métré'}
            </button>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Catégories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Catégories
              </h3>
              <button
                onClick={() => setShowAddCategorieModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <PlusIcon className="h-5 w-5" />
                Ajouter une catégorie
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucune catégorie. Ajoutez-en une pour commencer.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.map((categorie) => (
                  <div
                    key={categorie.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  >
                    {/* En-tête de catégorie */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 flex items-center justify-between">
                      <button
                        onClick={() => toggleCategorie(categorie.id)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        {categorie.isExpanded ? (
                          <ChevronDownIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                        {editingCategorieId === categorie.id ? (
                          <div className="flex-1 flex items-center gap-3">
                            <input
                              type="text"
                              value={categorie.nom}
                              onChange={(e) =>
                                setCategories((prev) =>
                                  prev.map((cat) =>
                                    cat.id === categorie.id
                                      ? { ...cat, nom: e.target.value }
                                      : cat
                                  )
                                )
                              }
                              onBlur={() =>
                                editCategorie(
                                  categorie.id,
                                  categorie.nom,
                                  categorie.unite
                                )
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  editCategorie(
                                    categorie.id,
                                    categorie.nom,
                                    categorie.unite
                                  )
                                }
                              }}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                              autoFocus
                            />
                            <select
                              value={categorie.unite}
                              onChange={(e) =>
                                setCategories((prev) =>
                                  prev.map((cat) =>
                                    cat.id === categorie.id
                                      ? { ...cat, unite: e.target.value }
                                      : cat
                                  )
                                )
                              }
                              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                            >
                              <option value="m²">m²</option>
                              <option value="m">m</option>
                              <option value="U">U</option>
                              <option value="L">L</option>
                              <option value="kg">kg</option>
                            </select>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900 dark:text-white">
                            {categorie.nom} ({categorie.unite})
                          </span>
                        )}
                        {!categorie.isExpanded && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                            {categorie.lignes.length} ligne{categorie.lignes.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCategorieId(categorie.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => deleteCategorie(categorie.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Contenu de la catégorie (déplié) */}
                    {categorie.isExpanded && (
                      <div className="p-4 space-y-4 bg-white dark:bg-gray-800">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Description</th>
                                <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">Longueur (m)</th>
                                <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">Largeur (m)</th>
                                <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">Hauteur (m)</th>
                                <th className="text-right py-2 px-3 text-gray-700 dark:text-gray-300">Quantité</th>
                                <th className="text-left py-2 px-3 text-gray-700 dark:text-gray-300">Notes</th>
                                <th className="text-center py-2 px-3 text-gray-700 dark:text-gray-300">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {categorie.lignes.map((ligne) => (
                                <tr
                                  key={ligne.id}
                                  className="border-b border-gray-100 dark:border-gray-700/50"
                                >
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      placeholder="Description"
                                      value={ligne.description}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          description: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="m"
                                      value={ligne.longueur || ''}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          longueur: e.target.value
                                            ? parseFloat(e.target.value)
                                            : null,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="m"
                                      value={ligne.largeur || ''}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          largeur: e.target.value
                                            ? parseFloat(e.target.value)
                                            : null,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="m"
                                      value={ligne.hauteur || ''}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          hauteur: e.target.value
                                            ? parseFloat(e.target.value)
                                            : null,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={ligne.quantite}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          quantite: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white text-right"
                                    />
                                    <span className="text-xs text-gray-500 ml-1">{ligne.unite}</span>
                                  </td>
                                  <td className="py-2 px-3">
                                    <input
                                      type="text"
                                      placeholder="Notes"
                                      value={ligne.notes}
                                      onChange={(e) =>
                                        updateLigne(categorie.id, ligne.id, {
                                          notes: e.target.value,
                                        })
                                      }
                                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-700 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <button
                                      onClick={() => deleteLigne(categorie.id, ligne.id)}
                                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="bg-gray-50 dark:bg-gray-700/50 font-semibold">
                                <td colSpan={4} className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                                  Total catégorie :
                                </td>
                                <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                                  {calculateTotalCategorie(categorie).toFixed(2)} {categorie.unite}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                        <button
                          onClick={() => addLigne(categorie.id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Ajouter une ligne
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Commentaire global */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commentaire global
            </label>
            <textarea
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              placeholder="Notes générales sur le métré..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Modal Ajouter catégorie */}
      {showAddCategorieModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Nouvelle catégorie
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  value={newCategorieNom}
                  onChange={(e) => setNewCategorieNom(e.target.value)}
                  placeholder="Ex: Carrelage sol, Plinthes..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Unité par défaut
                </label>
                <select
                  value={newCategorieUnite}
                  onChange={(e) => setNewCategorieUnite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="m²">m²</option>
                  <option value="m">m</option>
                  <option value="U">U</option>
                  <option value="L">L</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddCategorieModal(false)
                  setNewCategorieNom('')
                  setNewCategorieUnite('m²')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={addCategorie}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


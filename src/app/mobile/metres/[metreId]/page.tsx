'use client'

import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
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

export default function MobileEditMetrePage() {
  const router = useRouter()
  const params = useParams()
  const { selectedChantier } = useSelectedChantier()
  const metreId = params.metreId as string

  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [commentaire, setCommentaire] = useState('')
  const [categories, setCategories] = useState<MetreCategorie[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddCategorieModal, setShowAddCategorieModal] = useState(false)
  const [newCategorieNom, setNewCategorieNom] = useState('')
  const [newCategorieUnite, setNewCategorieUnite] = useState('m²')
  const [editingCategorieId, setEditingCategorieId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedChantier) {
      router.push('/mobile')
      return
    }
    loadMetre()
  }, [selectedChantier, metreId, router])

  const loadMetre = async () => {
    if (!selectedChantier) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/metres/${metreId}`
      )

      if (!response.ok) {
        throw new Error('Métré non trouvé')
      }

      const data = await response.json()

      setDate(format(new Date(data.date), 'yyyy-MM-dd'))
      setCommentaire(data.commentaire || '')
      setCategories(
        data.categories.map((cat: any) => ({
          id: cat.id,
          nom: cat.nom,
          unite: cat.unite,
          lignes: cat.lignes.map((ligne: any) => ({
            id: ligne.id,
            description: ligne.description,
            unite: ligne.unite,
            longueur: ligne.longueur,
            largeur: ligne.largeur,
            hauteur: ligne.hauteur,
            quantite: ligne.quantite,
            notes: ligne.notes || '',
          })),
          isExpanded: false,
        }))
      )
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du métré')
      router.push('/mobile/dashboard')
    } finally {
      setLoading(false)
    }
  }

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

  const calculateTotalGeneral = (): number => {
    return categories.reduce(
      (sum, cat) => sum + calculateTotalCategorie(cat),
      0
    )
  }

  const handleSubmit = async () => {
    if (!selectedChantier) return

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
      const response = await fetch(
        `/api/chantiers/${selectedChantier.chantierId}/metres/${metreId}`,
        {
          method: 'PATCH',
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
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la sauvegarde')
      }

      toast.success('Métré mis à jour avec succès !')
      router.push('/mobile/dashboard')
    } catch (error) {
      console.error('Erreur:', error)
      toast.error(
        error instanceof Error ? error.message : 'Erreur lors de la sauvegarde'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!selectedChantier) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/mobile/dashboard')}
              className="p-2 -ml-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-2xl font-black truncate flex-1 text-center -ml-6">
              Éditer le métré
            </h1>
          </div>
          <p className="text-sm text-blue-100 mt-1 text-center">
            {selectedChantier.nomChantier}
          </p>
        </div>
      </div>

      {/* Contenu - Même structure que la page nouveau */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {/* Date */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Catégories */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Catégories</h3>
            <button
              onClick={() => setShowAddCategorieModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              Ajouter
            </button>
          </div>

          {categories.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              Aucune catégorie. Ajoutez-en une pour commencer.
            </p>
          ) : (
            <div className="space-y-3">
              {categories.map((categorie) => (
                <div
                  key={categorie.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* En-tête de catégorie */}
                  <div className="bg-gray-50 p-3 flex items-center justify-between">
                    <button
                      onClick={() => toggleCategorie(categorie.id)}
                      className="flex-1 flex items-center gap-2 text-left"
                    >
                      {categorie.isExpanded ? (
                        <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                      ) : (
                        <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                      )}
                      {editingCategorieId === categorie.id ? (
                        <div className="flex-1 flex items-center gap-2">
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
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
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
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="m²">m²</option>
                            <option value="m">m</option>
                            <option value="U">U</option>
                            <option value="L">L</option>
                            <option value="kg">kg</option>
                          </select>
                        </div>
                      ) : (
                        <span className="font-medium text-gray-900">
                          {categorie.nom} ({categorie.unite})
                        </span>
                      )}
                      {!categorie.isExpanded && (
                        <span className="text-sm text-gray-500 ml-2">
                          {categorie.lignes.length} ligne{categorie.lignes.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingCategorieId(categorie.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteCategorie(categorie.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Contenu de la catégorie (déplié) */}
                  {categorie.isExpanded && (
                    <div className="p-3 space-y-3">
                      {categorie.lignes.map((ligne) => (
                        <div
                          key={ligne.id}
                          className="border border-gray-200 rounded-lg p-3 bg-white"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-xs font-medium text-gray-500">
                              Ligne
                            </span>
                            <button
                              onClick={() => deleteLigne(categorie.id, ligne.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Description (ex: Salon, Cuisine...)"
                            value={ligne.description}
                            onChange={(e) =>
                              updateLigne(categorie.id, ligne.id, {
                                description: e.target.value,
                              })
                            }
                            className="w-full mb-2 px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />

                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <label className="text-xs text-gray-500">Longueur</label>
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
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Largeur</label>
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
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500">Hauteur</label>
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
                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              />
                            </div>
                          </div>

                          <div className="mb-2">
                            <label className="text-xs text-gray-500">Quantité</label>
                            <input
                              type="number"
                              step="0.01"
                              value={ligne.quantite}
                              onChange={(e) =>
                                updateLigne(categorie.id, ligne.id, {
                                  quantite: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Notes (optionnel)"
                            value={ligne.notes}
                            onChange={(e) =>
                              updateLigne(categorie.id, ligne.id, {
                                notes: e.target.value,
                              })
                            }
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                          />
                        </div>
                      ))}

                      <button
                        onClick={() => addLigne(categorie.id)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Ajouter une ligne
                      </button>

                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            Total catégorie
                          </span>
                          <span className="text-lg font-bold text-gray-900">
                            {calculateTotalCategorie(categorie).toFixed(2)}{' '}
                            {categorie.unite}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Commentaire global */}
        <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commentaire global
          </label>
          <textarea
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            placeholder="Notes générales sur le métré..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Total général */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900">
              Total général
            </span>
            <span className="text-2xl font-bold text-blue-600">
              {calculateTotalGeneral().toFixed(2)}
            </span>
          </div>
        </div>

        {/* Bouton de sauvegarde */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Enregistrement...
            </>
          ) : (
            '💾 Enregistrer les modifications'
          )}
        </button>
      </div>

      {/* Modal Ajouter catégorie */}
      {showAddCategorieModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Nouvelle catégorie
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  value={newCategorieNom}
                  onChange={(e) => setNewCategorieNom(e.target.value)}
                  placeholder="Ex: Carrelage sol, Plinthes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unité par défaut
                </label>
                <select
                  value={newCategorieUnite}
                  onChange={(e) => setNewCategorieUnite(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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

      <BottomNav />
    </div>
  )
}


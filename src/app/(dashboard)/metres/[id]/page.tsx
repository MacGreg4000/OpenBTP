'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PageHeader } from '@/components/PageHeader'
import { SearchableSelect } from '@/components/SearchableSelect'
import { ChartBarIcon, ArrowLeftIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface MetreLigne {
  id: string
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  estSupplement: boolean
}

interface Metre {
  id: string
  statut: string
  commentaire?: string | null
  piecesJointes?: string[] | null
  createdAt: string
  updatedAt: string
  chantier: {
    chantierId: string
    nomChantier: string
    clientNom?: string | null
  }
  soustraitant: {
    id: string
    nom: string
    email?: string | null
  }
  commande?: {
    id: number
    reference?: string | null
  } | null
  lignes: MetreLigne[]
}

interface Chantier {
  chantierId: string
  nomChantier: string
  clientNom?: string | null
}

export default function MetreDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const metreId = params.id as string
  const [metre, setMetre] = useState<Metre | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [selectedChantierId, setSelectedChantierId] = useState<string | null>(null)
  const [loadingChantiers, setLoadingChantiers] = useState(false)

  const isAdminOrManager = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'

  const loadMetre = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/metres/${metreId}`)
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Métré non trouvé')
        }
        throw new Error('Erreur lors du chargement du métré')
      }
      const data = await response.json()
      setMetre(data)
    } catch (err) {
      console.error('Erreur:', err)
      setError(err instanceof Error ? err.message : 'Impossible de charger le métré')
    } finally {
      setLoading(false)
    }
  }, [metreId])

  const loadChantiers = useCallback(async () => {
    try {
      setLoadingChantiers(true)
      const response = await fetch('/api/chantiers?pageSize=1000')
      if (response.ok) {
        const data = await response.json()
        const chantiersList = Array.isArray(data) ? data : (data.data || [])
        setChantiers(chantiersList.filter((c: Chantier) => !c.chantierId.startsWith('CH-LIBRE-')))
      }
    } catch (err) {
      console.error('Erreur lors du chargement des chantiers:', err)
    } finally {
      setLoadingChantiers(false)
    }
  }, [])

  useEffect(() => {
    if (!metreId) return
    loadMetre()
  }, [metreId, loadMetre])

  useEffect(() => {
    if (metre && metre.chantier.chantierId.startsWith('CH-LIBRE-') && isAdminOrManager) {
      loadChantiers()
    }
  }, [metre, isAdminOrManager, loadChantiers])

  const updateStatut = async (nouveauStatut: string) => {
    if (!metre) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/metres/${metreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nouveauStatut }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour du statut')
      }

      await loadMetre()
    } catch (err) {
      console.error('Erreur:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise à jour')
    } finally {
      setUpdating(false)
    }
  }

  const associerChantier = async () => {
    if (!selectedChantierId || !metre) return

    try {
      setUpdating(true)
      const response = await fetch(`/api/metres/${metreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chantierId: selectedChantierId }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de l\'association du chantier')
      }

      await loadMetre()
      setSelectedChantierId(null)
    } catch (err) {
      console.error('Erreur:', err)
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'association')
    } finally {
      setUpdating(false)
    }
  }

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(montant)
  }

  const getStatutBadgeClass = (statut: string) => {
    const classes = {
      'SOUMIS': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      'PARTIELLEMENT_VALIDE': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700',
      'VALIDE': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700',
      'REJETE': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700',
      'BROUILLON': 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400 border-gray-300 dark:border-gray-600',
    }
    return classes[statut as keyof typeof classes] || classes['BROUILLON']
  }

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      'SOUMIS': 'Soumis',
      'PARTIELLEMENT_VALIDE': 'Partiellement validé',
      'VALIDE': 'Validé',
      'REJETE': 'Rejeté',
      'BROUILLON': 'Brouillon',
    }
    return labels[statut] || statut
  }

  const total = metre?.lignes.reduce((sum, ligne) => sum + (ligne.prixUnitaire * ligne.quantite), 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-indigo-50/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
      <PageHeader
        title="Détail du métré"
        subtitle={metre ? `Métré soumis par ${metre.soustraitant.nom} pour ${metre.chantier.nomChantier}` : 'Chargement...'}
        icon={ChartBarIcon}
        badgeColor="from-purple-600 via-indigo-600 to-blue-700"
        gradientColor="from-purple-600/10 via-indigo-600/10 to-blue-700/10"
        leftAction={
          <button 
            onClick={() => router.push('/metres')}
            className="group relative inline-flex items-center justify-center rounded-full border border-purple-200/60 dark:border-purple-900/40 bg-white/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-200 shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 hover:border-purple-300 dark:hover:border-purple-700 transition-all w-8 h-8 flex-shrink-0"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-100/70 via-purple-200/60 to-indigo-200/60 dark:from-purple-900/30 dark:via-purple-800/20 dark:to-indigo-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <ArrowLeftIcon className="relative h-4 w-4" />
          </button>
        }
      />

      {/* Contenu principal */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">Chargement du métré...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <Link
              href="/metres"
              className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline"
            >
              Retour à la liste
            </Link>
          </div>
        ) : metre ? (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Informations générales</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chantier</label>
                    <Link
                      href={`/chantiers/${metre.chantier.chantierId}`}
                      className="mt-1 block text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {metre.chantier.nomChantier}
                    </Link>
                    {metre.chantier.clientNom && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{metre.chantier.clientNom}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sous-traitant</label>
                    <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{metre.soustraitant.nom}</p>
                    {metre.soustraitant.email && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{metre.soustraitant.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Statut</label>
                    <div className="mt-1">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-sm font-semibold border ${getStatutBadgeClass(metre.statut)}`}>
                        {getStatutLabel(metre.statut)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date de soumission</label>
                    <p className="mt-1 text-base text-gray-900 dark:text-white">
                      {new Date(metre.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {metre.commande && (
                    <div>
                      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commande associée</label>
                      <p className="mt-1 text-base text-gray-900 dark:text-white">
                        {metre.commande.reference || `Commande #${metre.commande.id}`}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</label>
                    <p className="mt-1 text-2xl font-black text-gray-900 dark:text-white">
                      {formatMontant(total)} €
                    </p>
                  </div>
                </div>

                {metre.commentaire && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Commentaire</label>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{metre.commentaire}</p>
                  </div>
                )}

                {/* Actions pour ADMIN/MANAGER */}
                {isAdminOrManager && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg mb-4">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Actions</h3>
                    </div>
                    
                    {/* Association chantier (si chantier libre) */}
                    {metre.chantier.chantierId.startsWith('CH-LIBRE-') && (
                      <div className="mb-6 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-xl shadow-lg">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                          Associer à un chantier existant
                        </label>
                        <div className="flex gap-3">
                          <div className="flex-1">
                            <SearchableSelect
                              options={chantiers.map((c) => ({
                                value: c.chantierId,
                                label: c.nomChantier,
                                subtitle: c.clientNom || undefined,
                              }))}
                              value={selectedChantierId}
                              onChange={(v) => setSelectedChantierId(v as string)}
                              placeholder={loadingChantiers ? "Chargement..." : "Sélectionner un chantier"}
                              searchPlaceholder="Rechercher un chantier..."
                              emptyMessage="Aucun chantier trouvé"
                              showAllOption={false}
                              disabled={loadingChantiers || updating}
                            />
                          </div>
                          <button
                            onClick={associerChantier}
                            disabled={!selectedChantierId || updating}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm"
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Association...
                              </>
                            ) : (
                              <>
                                <CheckIcon className="h-4 w-4" />
                                Associer
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Boutons de statut */}
                    <div className="flex flex-wrap gap-3">
                      {metre.statut === 'SOUMIS' && (
                        <>
                          <button
                            onClick={() => updateStatut('VALIDE')}
                            disabled={updating}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm ring-2 ring-green-300/50 dark:ring-green-500/50"
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Validation...
                              </>
                            ) : (
                              <>
                                <CheckIcon className="h-5 w-5" />
                                Valider
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => updateStatut('REJETE')}
                            disabled={updating}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm ring-2 ring-red-300/50 dark:ring-red-500/50"
                          >
                            {updating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Rejet...
                              </>
                            ) : (
                              <>
                                <XMarkIcon className="h-5 w-5" />
                                Rejeter
                              </>
                            )}
                          </button>
                        </>
                      )}
                      {(metre.statut === 'VALIDE' || metre.statut === 'REJETE') && (
                        <button
                          onClick={() => updateStatut('SOUMIS')}
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm ring-2 ring-gray-300/50 dark:ring-gray-500/50"
                        >
                          {updating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              Mise à jour...
                            </>
                          ) : (
                            'Remettre en attente'
                          )}
                        </button>
                      )}
                      {metre.statut === 'VALIDE' && (
                        <button
                          onClick={() => updateStatut('REJETE')}
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm ring-2 ring-red-300/50 dark:ring-red-500/50"
                        >
                          {updating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              Rejet...
                            </>
                          ) : (
                            <>
                              <XMarkIcon className="h-5 w-5" />
                              Rejeter
                            </>
                          )}
                        </button>
                      )}
                      {metre.statut === 'REJETE' && (
                        <button
                          onClick={() => updateStatut('VALIDE')}
                          disabled={updating}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 font-semibold text-sm ring-2 ring-green-300/50 dark:ring-green-500/50"
                        >
                          {updating ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                              Validation...
                            </>
                          ) : (
                            <>
                              <CheckIcon className="h-5 w-5" />
                              Valider
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lignes du métré */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500/10 to-indigo-500/10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Lignes du métré ({metre.lignes.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Article</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Unité</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Prix unitaire</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Quantité</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {metre.lignes.map((ligne) => (
                      <tr key={ligne.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {ligne.article}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <div className="max-w-md">{ligne.description}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full">
                            {ligne.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-700 dark:text-gray-300">
                          {ligne.unite}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {formatMontant(ligne.prixUnitaire)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700 dark:text-gray-300">
                          {ligne.quantite.toLocaleString('fr-FR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          {formatMontant(ligne.prixUnitaire * ligne.quantite)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <td colSpan={6} className="px-4 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Total
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-black text-gray-900 dark:text-white">
                        {formatMontant(total)} €
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Pièces jointes */}
            {metre.piecesJointes && metre.piecesJointes.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Pièces jointes ({metre.piecesJointes.length})
                  </h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metre.piecesJointes.map((pj, index) => (
                      <div key={index} className="relative">
                        <img
                          src={pj}
                          alt={`Pièce jointe ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                        />
                        <a
                          href={pj}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors rounded-lg"
                        >
                          <span className="text-white opacity-0 hover:opacity-100 text-sm font-medium">Voir</span>
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}


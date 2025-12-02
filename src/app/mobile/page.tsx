'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import { useSelectedChantier } from '@/contexts/SelectedChantierContext'
import { BottomNav } from '@/components/mobile/BottomNav'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowRightIcon,
  MagnifyingGlassIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline'

interface Chantier {
  id: string
  chantierId: string
  nomChantier: string
  statut?: string
  etatChantier?: string
  adresseChantier?: string | null
  clientNom?: string | null
  etat?: string
}

export default function MobileHomePage() {
  const router = useRouter()
  const { selectedChantier, setSelectedChantier } = useSelectedChantier()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [filteredChantiers, setFilteredChantiers] = useState<Chantier[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadChantiers()
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredChantiers(chantiers)
    } else {
      const filtered = chantiers.filter(
        (c) =>
          c.nomChantier.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.clientNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.adresseChantier?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredChantiers(filtered)
    }
  }, [searchTerm, chantiers])

  const loadChantiers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/chantiers?pageSize=100')
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Données API reçues:', data)
        
        // L'API retourne { chantiers: [...], meta: {...} } ou directement un tableau
        const chantiersList = Array.isArray(data) ? data : (data.chantiers || [])
        console.log('📋 Liste des chantiers:', chantiersList.length, 'chantiers')
        
        // Filtrer seulement EN_COURS et EN_PREPARATION
        // L'API retourne etatChantier (libellé) : 'En cours', 'En préparation'
        interface ChantierFromAPI {
          chantierId: string
          nomChantier: string
          statut?: string
          etat?: string
          etatChantier?: string
        }
        const actifs = chantiersList.filter((c: ChantierFromAPI) => {
          const statut = c.statut || c.etat
          const etatChantier = c.etatChantier || c.etat
          
          return (
            statut === 'EN_COURS' ||
            statut === 'EN_PREPARATION' ||
            etatChantier === 'En cours' ||
            etatChantier === 'En préparation'
          )
        })
        
        console.log('✅ Chantiers actifs filtrés:', actifs.length)
        setChantiers(actifs)
        setFilteredChantiers(actifs)
      } else {
        console.error('❌ Erreur API:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des chantiers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectChantier = (chantier: Chantier) => {
    setSelectedChantier({
      id: chantier.id,
      chantierId: chantier.chantierId,
      nomChantier: chantier.nomChantier,
      statut: chantier.statut || chantier.etatChantier || chantier.etat || '',
      adresseChantier: chantier.adresseChantier,
      clientNom: chantier.clientNom,
      clientId: undefined,
    })
    router.push('/mobile/dashboard')
  }

  const getStatusBadge = (statut: string | undefined, etatChantier?: string | undefined) => {
    const status = statut || etatChantier
    if (status === 'EN_COURS' || status === 'En cours') {
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold">
          En cours
        </span>
      )
    }
    if (status === 'EN_PREPARATION' || status === 'En préparation') {
      return (
        <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
          En préparation
        </span>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 text-white">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black">OpenBTP Mobile</h1>
              <p className="text-sm text-blue-100 mt-1">Sélectionnez un chantier</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login?callbackUrl=/mobile' })}
              className="flex items-center gap-2 px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-white transition-colors duration-200 border border-white/30"
              title="Déconnexion"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="text-sm font-medium hidden sm:inline">Déconnexion</span>
            </button>
          </div>

          {/* Chantier actuellement sélectionné */}
          {selectedChantier && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 mb-4 border border-white/30">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-blue-100 mb-1">Chantier actuel</p>
                  <p className="font-semibold truncate">{selectedChantier.nomChantier}</p>
                </div>
                <button
                  onClick={() => router.push('/mobile/dashboard')}
                  className="ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Ouvrir
                </button>
              </div>
            </div>
          )}

          {/* Barre de recherche */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-200" />
            <input
              type="text"
              placeholder="Rechercher un chantier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Liste des chantiers */}
      <div className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des chantiers...</p>
          </div>
        ) : filteredChantiers.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">
              {searchTerm ? 'Aucun chantier trouvé' : 'Aucun chantier actif'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 text-sm font-medium"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredChantiers.map((chantier) => (
              <button
                key={chantier.id || chantier.chantierId}
                onClick={() => handleSelectChantier(chantier)}
                className="w-full bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate text-lg">
                      {chantier.nomChantier}
                    </h3>
                    {chantier.clientNom && (
                      <p className="text-sm text-gray-600 mt-1">{chantier.clientNom}</p>
                    )}
                  </div>
                  {getStatusBadge(chantier.statut, chantier.etatChantier)}
                </div>

                {chantier.adresseChantier && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                    <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{chantier.adresseChantier}</span>
                  </div>
                )}

                <div className="flex items-center justify-end mt-3 text-blue-600">
                  <span className="text-sm font-medium">Sélectionner</span>
                  <ArrowRightIcon className="h-4 w-4 ml-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}


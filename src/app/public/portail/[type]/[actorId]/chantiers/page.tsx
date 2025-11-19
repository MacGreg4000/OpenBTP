'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, MapPinIcon, MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline'
import { PortalI18nProvider, usePortalI18n } from '../../../i18n'

interface Chantier {
  chantierId: string
  nomChantier: string
  numeroIdentification: string | null
  adresse: string | null
  ville: string | null
  latitude: number | null
  longitude: number | null
  statut: string
}

function InnerChantiersPage(props: { params: { type: 'ouvrier'|'soustraitant'; actorId: string } }) {
  const { type, actorId } = props.params
  const router = useRouter()
  const { t, lang, setLang } = usePortalI18n()
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const loadChantiers = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/public/portail/${type}/${actorId}/chantiers`, {
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && Array.isArray(data.chantiers)) {
            setChantiers(data.chantiers)
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des chantiers:', error)
      } finally {
        setLoading(false)
      }
    }

    loadChantiers()
  }, [type, actorId])

  // Filtrer les chantiers selon le terme de recherche
  const chantiersFiltres = chantiers.filter(chantier => {
    const search = searchTerm.toLowerCase()
    return (
      chantier.nomChantier.toLowerCase().includes(search) ||
      (chantier.numeroIdentification && chantier.numeroIdentification.toLowerCase().includes(search)) ||
      (chantier.adresse && chantier.adresse.toLowerCase().includes(search)) ||
      (chantier.ville && chantier.ville.toLowerCase().includes(search))
    )
  })

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'EN_COURS':
        return 'En cours'
      case 'EN_PREPARATION':
        return 'En préparation'
      case 'A_VENIR':
        return 'À venir'
      case 'TERMINE':
        return 'Terminé'
      default:
        return statut
    }
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'EN_COURS':
        return 'bg-green-50 text-green-700'
      case 'EN_PREPARATION':
        return 'bg-blue-50 text-blue-700'
      case 'A_VENIR':
        return 'bg-gray-100 text-gray-700'
      case 'TERMINE':
        return 'bg-gray-200 text-gray-600'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const openMap = (latitude: number | null, longitude: number | null, _nomChantier: string) => {
    if (latitude && longitude) {
      const url = `https://www.google.com/maps?q=${latitude},${longitude}`
      window.open(url, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl shadow text-white">
          <div className="p-4 flex items-center gap-2">
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center text-white/90 hover:text-white"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1"/>
              {t('back')}
            </button>
            <div className="flex items-center ml-auto gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-white/90"/>
              <span className="font-medium">Chantiers</span>
              <select value={lang} onChange={(e)=> setLang(e.target.value as 'fr'|'en'|'pt'|'ro')} className="ml-2 bg-white/90 text-gray-900 border-0 rounded px-2 py-1 text-sm">
                <option value="fr">FR</option>
                <option value="en">EN</option>
                <option value="pt">PT</option>
                <option value="ro">RO</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filtre de recherche */}
        <div className="bg-white rounded-xl p-4 shadow border border-gray-100">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Liste des chantiers */}
        {loading ? (
          <div className="bg-white rounded-xl p-4 shadow text-center">{t('loading')}</div>
        ) : chantiersFiltres.length === 0 ? (
          <div className="bg-white rounded-xl p-6 shadow text-center text-gray-500">
            {searchTerm ? 'Aucun chantier trouvé' : t('none')}
          </div>
        ) : (
          <div className="space-y-3">
            {chantiersFiltres.map((chantier) => (
              <div key={chantier.chantierId} className="bg-white rounded-xl p-4 shadow border border-gray-100">
                <div className="font-semibold text-gray-900 mb-1">{chantier.nomChantier}</div>
                
                {chantier.numeroIdentification && (
                  <div className="text-xs text-gray-500 mb-2">
                    ID: {chantier.numeroIdentification}
                  </div>
                )}
                
                {(chantier.adresse || chantier.ville) && (
                  <div className="text-sm text-gray-700 mb-2">
                    {chantier.adresse && <div>{chantier.adresse}</div>}
                    {chantier.ville && <div className="text-gray-500">{chantier.ville}</div>}
                  </div>
                )}
                
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {chantier.latitude && chantier.longitude ? (
                    <button
                      onClick={() => openMap(chantier.latitude, chantier.longitude, chantier.nomChantier)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      Voir sur la carte
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Localisation non disponible</span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatutColor(chantier.statut)}`}>
                    {getStatutLabel(chantier.statut)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compteur de résultats */}
        {!loading && chantiersFiltres.length > 0 && (
          <div className="text-sm text-gray-600 text-center">
            {chantiersFiltres.length} {chantiersFiltres.length === 1 ? 'chantier trouvé' : 'chantiers trouvés'}
            {searchTerm && chantiers.length !== chantiersFiltres.length && (
              <span> sur {chantiers.length}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChantiersPage(props: { params: Promise<{ type: 'ouvrier'|'soustraitant'; actorId: string }> }) {
  const p = React.use(props.params)
  return (
    <PortalI18nProvider>
      <InnerChantiersPage params={p} />
    </PortalI18nProvider>
  )
}


'use client'
import { useState, useEffect, use } from 'react';
// import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  PencilSquareIcon,
  DocumentIcon
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
  sousTraitant: {
    id: string
    nom: string
  }
}

export default function OuvrierPage(
  props: { 
    params: Promise<{ id: string, ouvrierId: string }> 
  }
) {
  const params = use(props.params);
  // const router = useRouter()
  const { data: session } = useSession()
  const [ouvrier, setOuvrier] = useState<Ouvrier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      fetch(`/api/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}`)
        .then(res => res.json())
        .then(data => {
          setOuvrier(data)
          setLoading(false)
        })
        .catch(error => {
          console.error('Erreur:', error)
          setError('Erreur lors du chargement des données')
          setLoading(false)
        })
    }
  }, [session, params.id, params.ouvrierId])

  if (loading) return <div className="p-8">Chargement...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!ouvrier) return <div className="p-8">Ouvrier non trouvé</div>

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumb
        items={[
          { label: 'Sous-traitants', href: '/sous-traitants' },
          { label: ouvrier.sousTraitant.nom, href: `/sous-traitants/${params.id}/ouvriers` },
          { label: `${ouvrier.prenom} ${ouvrier.nom}` }
        ]}
      />

      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:tracking-tight">
            {ouvrier.prenom} {ouvrier.nom}
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
          <Link
            href={`/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}/documents`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentIcon className="h-4 w-4 mr-2" />
            Documents
          </Link>
          <Link
            href={`/sous-traitants/${params.id}/ouvriers/${params.ouvrierId}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PencilSquareIcon className="h-4 w-4 mr-2" />
            Modifier
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Informations de l'ouvrier
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Nom complet</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {ouvrier.prenom} {ouvrier.nom}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {ouvrier.email || '-'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Téléphone</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {ouvrier.telephone || '-'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Poste</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {ouvrier.poste}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Date d'entrée</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {format(new Date(ouvrier.dateEntree), 'dd MMMM yyyy', { locale: fr })}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
} 
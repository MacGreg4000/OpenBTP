'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

interface Document {
  id: string
  type: string
  dateExpiration: string
  isExpired: boolean
  ouvrier: {
    id: string
    nom: string
    prenom: string
    sousTraitant: {
      id: string
      nom: string
    }
  }
}

export function DocumentExpirationAlert() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    fetch('/api/documents/expiring')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Erreur HTTP: ${res.status}`)
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDocuments(data)
          setIsOpen(data.length > 0)
        } else {
          console.error('Format de données inattendu:', data)
          setDocuments([])
        }
      })
      .catch(error => {
        console.error('Erreur:', error)
        setError(error.message)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  if (isLoading) return null
  if (error) return null
  if (!isOpen || documents.length === 0) return null

  const getDocumentTypeName = (type: string) => {
    const types: { [key: string]: string } = {
      carte_identite: "Carte d'identité",
      limosa: "Certificat Limosa",
      a1: "Attestation A1",
      livre_parts: "Livre des parts",
      attestation_onss: "Attestation ONSS"
    }
    return types[type] || type
  }

  return (
    <div className="rounded-md bg-yellow-50 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            Documents à surveiller
          </h3>
          <div className="mt-2">
            <ul className="list-disc pl-5 space-y-1">
              {documents.map((doc) => (
                <li key={doc.id} className={doc.isExpired ? 'text-red-700' : 'text-yellow-700'}>
                  <Link 
                    href={`/sous-traitants/${doc.ouvrier.sousTraitant.id}/ouvriers/${doc.ouvrier.id}/documents`}
                    className="underline hover:text-yellow-900"
                  >
                    {getDocumentTypeName(doc.type)} de {doc.ouvrier.prenom} {doc.ouvrier.nom} 
                    ({doc.ouvrier.sousTraitant.nom}) - 
                    {doc.isExpired ? ' Expiré depuis le ' : ' Expire le '}
                    {format(new Date(doc.dateExpiration), 'dd/MM/yyyy', { locale: fr })}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex rounded-md bg-yellow-50 p-1.5 text-yellow-500 hover:bg-yellow-100"
            >
              <span className="sr-only">Fermer</span>
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 
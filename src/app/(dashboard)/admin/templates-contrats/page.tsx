'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DocumentTextIcon, PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface ContractTemplate {
  id: string
  name: string
  description: string | null
  htmlContent: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function TemplatesContratsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }

    if (session && session.user && session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }

    fetchTemplates()
  }, [router, session, status])

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/admin/contract-templates')
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      } else {
        setError('Erreur lors du chargement des templates')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors du chargement des templates')
    } finally {
      setLoading(false)
    }
  }

  const activateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/contract-templates/${templateId}/activate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchTemplates()
      } else {
        setError('Erreur lors de l\'activation du template')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de l\'activation du template')
    }
  }

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) return

    try {
      const response = await fetch(`/api/admin/contract-templates/${templateId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchTemplates()
      } else {
        setError('Erreur lors de la suppression du template')
      }
    } catch (error) {
      console.error('Erreur:', error)
      setError('Erreur lors de la suppression du template')
    }
  }

  const previewTemplate = (template: ContractTemplate) => {
    setEditingTemplate(template)
    setShowPreview(true)
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
          <DocumentTextIcon className="h-8 w-8" />
          Gestion des Templates de Contrats
        </h1>
        <button
          onClick={() => router.push('/admin/templates-contrats/nouveau')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
          Nouveau Template
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Templates disponibles
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Gérez les modèles de contrats de sous-traitance
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {templates.map((template) => (
            <div key={template.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </h3>
                    {template.isActive && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Actif
                      </span>
                    )}
                  </div>
                  {template.description && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {template.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                    Créé le {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                    {template.updatedAt !== template.createdAt && (
                      <span> • Modifié le {new Date(template.updatedAt).toLocaleDateString('fr-FR')}</span>
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => previewTemplate(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    title="Aperçu"
                  >
                    <DocumentTextIcon className="h-5 w-5" />
                  </button>
                  
                  {!template.isActive && (
                    <button
                      onClick={() => activateTemplate(template.id)}
                      className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      title="Activer"
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => router.push(`/admin/templates-contrats/${template.id}/modifier`)}
                    className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                    title="Modifier"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="Supprimer"
                    disabled={template.isActive}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            Aucun template de contrat trouvé.
          </div>
        )}
      </div>

      {/* Modal d'aperçu */}
      {showPreview && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Aperçu du template: {editingTemplate.name}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div 
                className="prose max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: editingTemplate.htmlContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
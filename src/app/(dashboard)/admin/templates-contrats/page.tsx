'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import type { TemplateCategory } from '@/lib/templates/template-categories'
import { TEMPLATE_CATEGORIES } from '@/lib/templates/template-categories'
import { PageHeader } from '@/components/PageHeader'

interface ContractTemplate {
  id: string
  name: string
  description: string | null
  htmlContent: string
  isActive: boolean
  category: TemplateCategory
  createdAt: string
  updatedAt: string
}

const CATEGORY_META: Record<TemplateCategory, { label: string; description: string }> = {
  CONTRAT: {
    label: 'Contrats',
    description: 'Modèles utilisés pour les contrats générés automatiquement.'
  },
  CGV: {
    label: 'Conditions générales de vente',
    description: 'Texte inséré dans les PDFs devis & commandes pour vos clients.'
  }
}

export default function TemplatesContratsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('CONTRAT')

  const fetchTemplates = useCallback(async (category: TemplateCategory) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/contract-templates?category=${category}`)
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
  }, [])

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

    fetchTemplates(selectedCategory)
  }, [router, session, status, selectedCategory, fetchTemplates])

  const activateTemplate = async (templateId: string) => {
    try {
      const response = await fetch(`/api/admin/contract-templates/${templateId}/activate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchTemplates(selectedCategory)
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
        await fetchTemplates(selectedCategory)
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

  const actions = (
    <button
      onClick={() => router.push(`/admin/templates-contrats/nouveau?category=${selectedCategory}`)}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:scale-[1.02] hover:shadow-xl"
    >
      <PlusIcon className="h-4 w-4" />
      Nouveau template
    </button>
  )

  const activeCount = templates.filter((tpl) => tpl.isActive).length

  const currentPalette = {
    badgeColor: 'from-emerald-500 via-emerald-500 to-emerald-600',
    gradientColor: 'from-emerald-500/12 via-emerald-500/12 to-emerald-600/12'
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Templates"
        subtitle="Centralisez tous les contenus HTML injectés dans vos documents et communications."
        icon={ClipboardDocumentListIcon}
        badgeColor={currentPalette.badgeColor}
        gradientColor={currentPalette.gradientColor}
        actions={actions}
        stats={(
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-left shadow-inner dark:bg-gray-900/50">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Templates actifs</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{activeCount}</p>
            </div>
            <div className="rounded-2xl bg-white/70 px-4 py-3 text-left shadow-inner dark:bg-gray-900/50">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Templates disponibles</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{templates.length}</p>
            </div>
          </div>
        )}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATE_CATEGORIES.map((category) => {
            const isActive = category === selectedCategory
            const { label, description } = CATEGORY_META[category]
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`relative overflow-hidden rounded-2xl border px-5 py-6 text-left transition-all ${
                  isActive
                    ? 'border-emerald-400 bg-gradient-to-br from-emerald-100/60 via-green-100/60 to-teal-100/60 dark:from-emerald-500/10 dark:via-green-500/10 dark:to-teal-500/10 shadow-lg shadow-emerald-200/40'
                    : 'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/40 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-200/40'
                }`}
              >
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-white/10 to-white/20" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-300 flex items-center gap-1">
                      <SparklesIcon className="h-4 w-4" />
                      {label}
                    </p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {description}
                    </p>
                  </div>
                  {isActive && (
                    <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-emerald-600 shadow-sm shadow-emerald-200 dark:bg-gray-900/60 dark:text-emerald-200">
                      Catégorie active
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="h-6 w-6 text-emerald-500" />
              {CATEGORY_META[selectedCategory]?.label ?? 'Templates'}
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {templates.length} template{templates.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="rounded-3xl border border-white/40 bg-white/70 shadow-xl shadow-gray-200/50 dark:border-gray-800/60 dark:bg-gray-900/60 dark:shadow-black/30">
            <div className="divide-y divide-gray-100/80 dark:divide-gray-800/60">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group relative px-6 py-5 transition-all hover:bg-white dark:hover:bg-gray-900"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                          {template.name}
                        </h3>
                        <span className="rounded-full border border-gray-200/70 bg-white/80 px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-gray-500 dark:border-gray-700/60 dark:bg-gray-900/50 dark:text-gray-300">
                          {template.category === 'CONTRAT' ? 'Contrat' : 'CGV'}
                        </span>
                        {template.isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-200">
                            <ShieldCheckIcon className="h-3.5 w-3.5" />
                            Actif
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Créé le {new Date(template.createdAt).toLocaleDateString('fr-FR')}
                        {template.updatedAt !== template.createdAt && (
                          <span> • Modifié le {new Date(template.updatedAt).toLocaleDateString('fr-FR')}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-start">
                      <button
                        onClick={() => previewTemplate(template)}
                        className="rounded-lg border border-transparent p-2 text-gray-400 transition hover:border-blue-200 hover:text-blue-600 dark:hover:border-blue-400/40 dark:hover:text-blue-300"
                        title="Aperçu"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                      {!template.isActive && (
                        <button
                          onClick={() => activateTemplate(template.id)}
                          className="rounded-lg border border-transparent p-2 text-gray-400 transition hover:border-emerald-200 hover:text-emerald-600 dark:hover:border-emerald-400/40 dark:hover:text-emerald-300"
                          title="Activer"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => router.push(`/admin/templates-contrats/${template.id}/modifier?category=${template.category}`)}
                        className="rounded-lg border border-transparent p-2 text-gray-400 transition hover:border-amber-200 hover:text-amber-600 dark:hover:border-amber-400/40 dark:hover:text-amber-300"
                        title="Modifier"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="rounded-lg border border-transparent p-2 text-gray-400 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:border-transparent disabled:text-gray-300 dark:hover:border-rose-400/40 dark:hover:text-rose-300"
                        title="Supprimer"
                        disabled={template.isActive}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {templates.length === 0 && !loading && (
                <div className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                  Aucun template disponible pour cette catégorie.
                </div>
              )}

              {loading && (
                <div className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                  Chargement des templates...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Modal d'aperçu */}
      {showPreview && editingTemplate && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-white/40 dark:border-gray-700/60">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Aperçu du template : {editingTemplate.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Catégorie : {editingTemplate.category === 'CONTRAT' ? 'Contrat' : 'Conditions générales de vente'}
                </p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="rounded-full border border-gray-200/70 p-2 text-gray-400 transition hover:border-gray-300 hover:text-gray-600 dark:border-gray-700/60 dark:hover:border-gray-600/60 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)] bg-gray-50 dark:bg-gray-900">
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
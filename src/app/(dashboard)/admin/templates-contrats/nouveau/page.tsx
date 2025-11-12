'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast, { Toaster } from 'react-hot-toast'
import TemplateVariablesHelp from '@/components/admin/TemplateVariablesHelp'
import type { TemplateCategory } from '@/lib/templates/template-categories'
import { isTemplateCategory } from '@/lib/templates/template-categories'

export default function NouveauTemplatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const rawInitialCategory = searchParams?.get('category')
  const initialCategory: TemplateCategory = rawInitialCategory && isTemplateCategory(rawInitialCategory) ? rawInitialCategory : 'CONTRAT'
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [category, setCategory] = useState<TemplateCategory>(initialCategory)

  const categories: Array<{ id: TemplateCategory; label: string; description: string }> = [
    {
      id: 'CONTRAT',
      label: 'Contrat',
      description: 'Modèle complet pour les contrats de sous-traitance générés depuis la plateforme.'
    },
    {
      id: 'CGV',
      label: 'Conditions générales de vente',
      description: 'Bloc de texte inséré à la fin des devis et commandes PDF destinés aux clients.'
    }
  ]

  // Redirection si non authentifié ou non admin
  if (status === 'loading') {
    return <div className="p-8">Chargement...</div>
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  if (session && session.user && session.user.role !== 'ADMIN') {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !htmlContent.trim()) {
      toast.error('Le nom et le contenu HTML sont requis')
      return
    }

    try {
      setSaving(true)
      const response = await fetch('/api/admin/contract-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          htmlContent: htmlContent.trim(),
          category
        })
      })

      if (response.ok) {
        toast.success('Template créé avec succès')
        router.push('/admin/templates-contrats')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la création du template')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la création du template')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Toaster position="top-right" />
      
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/templates-contrats')}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          ← Retour à la liste
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-6 dark:text-white">
          Nouveau template
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de template *
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((item) => {
                const isActive = category === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCategory(item.id)}
                    className={`text-left border rounded-xl p-4 transition-colors ${
                      isActive
                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:bg-amber-50/40 dark:hover:border-amber-400 dark:hover:bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-amber-600 dark:text-amber-300 uppercase tracking-wide">
                        {item.label}
                      </span>
                      {isActive && (
                        <span className="text-[11px] font-medium text-amber-700 dark:text-amber-100">
                          Sélectionné
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      {item.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom du template *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contenu HTML *
            </label>
            
            {category === 'CONTRAT' && (
              <div className="mb-3">
                <TemplateVariablesHelp />
              </div>
            )}
            {category === 'CGV' && (
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                Astuce : vous pouvez utiliser du HTML simple (titres, listes, paragraphes). Le bloc sera automatiquement injecté à la fin des devis et commandes PDF.
              </p>
            )}

            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-gray-700 dark:text-white"
              placeholder="Entrez le code HTML du template..."
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Création...' : 'Créer le template'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/admin/templates-contrats')}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


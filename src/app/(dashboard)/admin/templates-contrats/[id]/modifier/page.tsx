'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast, { Toaster } from 'react-hot-toast'

interface ContractTemplate {
  id: string
  name: string
  description: string | null
  htmlContent: string
  isActive: boolean
}

export default function ModifierTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session, status } = useSession()
  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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

    fetchTemplate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, session, status])

  const fetchTemplate = async () => {
    try {
      const response = await fetch(`/api/admin/contract-templates/${id}`)
      if (response.ok) {
        const data = await response.json()
        setTemplate(data)
        setName(data.name)
        setDescription(data.description || '')
        setHtmlContent(data.htmlContent)
      } else {
        toast.error('Template non trouvé')
        router.push('/admin/templates-contrats')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors du chargement du template')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !htmlContent.trim()) {
      toast.error('Le nom et le contenu HTML sont requis')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/admin/contract-templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          htmlContent: htmlContent.trim()
        })
      })

      if (response.ok) {
        toast.success('Template modifié avec succès')
        router.push('/admin/templates-contrats')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erreur lors de la modification du template')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la modification du template')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Chargement...</div>
  }

  if (!template) {
    return null
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
          Modifier le Template: {template.name}
        </h1>

        {template.isActive && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            ⚠️ Ce template est actuellement actif. Les modifications affecteront les nouveaux contrats générés.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm dark:bg-gray-700 dark:text-white"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Utilisez des variables comme {'{'}{'{'} nom {'}'}{'}'}, {'{'}{'{'} siret {'}'}{'}'}, etc. pour les données dynamiques
            </p>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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


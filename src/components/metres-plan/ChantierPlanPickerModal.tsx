'use client'
import React, { useEffect, useState } from 'react'
import {
  XMarkIcon,
  DocumentIcon,
  FolderOpenIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { DocumentTextIcon } from '@heroicons/react/24/solid'

interface ChantierDocument {
  id: string
  nom: string
  url: string
  mimeType: string
  estPlan: boolean
  createdAt?: string
}

interface MetrePlanProject {
  id: string
  nom: string
  updatedAt: string
  pdfFileName?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  chantierId: string
  onSelectPdf: (url: string, fileName: string) => void
  onSelectMplan: (metrePlanId: string) => void
}

type Tab = 'plans' | 'mprojets'

const ChantierPlanPickerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  chantierId,
  onSelectPdf,
  onSelectMplan,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('plans')
  const [documents, setDocuments] = useState<ChantierDocument[]>([])
  const [projects, setProjects] = useState<MetrePlanProject[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !chantierId) return

    setError(null)
    setLoading(true)

    const fetchData = async () => {
      try {
        const [docsRes, projectsRes] = await Promise.all([
          fetch(`/api/chantiers/${chantierId}/documents`),
          fetch(`/api/metres-plan?chantierId=${chantierId}`),
        ])

        if (docsRes.ok) {
          const data: ChantierDocument[] = await docsRes.json()
          // Filtre : PDF ou estPlan:true
          setDocuments(
            data.filter(
              d =>
                d.estPlan === true ||
                d.mimeType === 'application/pdf' ||
                d.nom?.toLowerCase().endsWith('.pdf')
            )
          )
        } else {
          setDocuments([])
        }

        if (projectsRes.ok) {
          const data: MetrePlanProject[] = await projectsRes.json()
          setProjects(data)
        } else {
          setProjects([])
        }
      } catch (err) {
        console.error(err)
        setError('Erreur lors du chargement des données')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isOpen, chantierId])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: '80vh' }}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpenIcon className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Charger depuis le chantier
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Onglets */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-5 shrink-0">
          <TabButton active={activeTab === 'plans'} onClick={() => setActiveTab('plans')}>
            Plans PDF
            {documents.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                {documents.length}
              </span>
            )}
          </TabButton>
          <TabButton active={activeTab === 'mprojets'} onClick={() => setActiveTab('mprojets')}>
            Projets métré
            {projects.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
                {projects.length}
              </span>
            )}
          </TabButton>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ArrowPathIcon className="w-7 h-7 text-indigo-400 animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && activeTab === 'plans' && (
            <>
              {documents.length === 0 ? (
                <EmptyState message="Aucun plan PDF trouvé dans ce chantier" />
              ) : (
                <ul className="space-y-1">
                  {documents.map(doc => (
                    <li key={doc.id}>
                      <button
                        type="button"
                        onClick={() => onSelectPdf(doc.url, doc.nom)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                      >
                        <div className="shrink-0 w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                            {doc.nom}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {doc.estPlan ? 'Plan architectural' : 'Document PDF'}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {!loading && !error && activeTab === 'mprojets' && (
            <>
              {projects.length === 0 ? (
                <EmptyState message="Aucun projet métré trouvé pour ce chantier" />
              ) : (
                <ul className="space-y-1">
                  {projects.map(proj => (
                    <li key={proj.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMplan(proj.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group"
                      >
                        <div className="shrink-0 w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <DocumentIcon className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                            {proj.nom}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Modifié le{' '}
                            {new Date(proj.updatedAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {proj.pdfFileName && ` · ${proj.pdfFileName}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Pied */}
        <div className="shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-700 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---- sous-composants ---- */

interface TabButtonProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex items-center px-1 py-3 mr-6 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
    }`}
  >
    {children}
  </button>
)

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-2">
    <DocumentIcon className="w-10 h-10 text-gray-200 dark:text-gray-700" />
    <p className="text-sm text-gray-400 dark:text-gray-500 text-center">{message}</p>
  </div>
)

export default ChantierPlanPickerModal

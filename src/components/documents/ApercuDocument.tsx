'use client'
import { useEffect } from 'react'
import { XMarkIcon, ArrowDownTrayIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

const IMAGES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif']

/**
 * Aperçu d'un document (PDF ou image) dans une fenêtre, sans le télécharger.
 * Les formats que le navigateur n'affiche pas (HEIC…) proposent le téléchargement.
 */
export default function ApercuDocument({
  document,
  onClose,
}: {
  document: { nom: string; url: string } | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!document) return
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', surTouche)
    return () => window.removeEventListener('keydown', surTouche)
  }, [document, onClose])

  if (!document) return null

  // L'extension se lit sur l'URL (le nom affiché n'en a pas toujours)
  const extension = (document.url.split('?')[0].split('.').pop() || '').toLowerCase()
  const estImage = IMAGES.includes(extension)
  const estPdf = extension === 'pdf'
  // /uploads/… reçoit « X-Frame-Options: DENY » (règle générale de next.config.js) :
  // l'iframe passe par la route de service, autorisée dans un cadre de la même origine.
  const urlAffichage = document.url.startsWith('/uploads/')
    ? `/api/documents/serve/${document.url.slice('/uploads/'.length)}`
    : document.url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-6" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{document.nom}</h3>
          <div className="flex shrink-0 items-center gap-1">
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Ouvrir dans un nouvel onglet"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
            <a
              href={document.url}
              download={document.nom}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Télécharger"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Fermer (Échap)"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-auto bg-gray-100 dark:bg-gray-900">
          {estImage ? (
            <img src={urlAffichage} alt={document.nom} className="max-h-full max-w-full object-contain" />
          ) : estPdf ? (
            <iframe src={urlAffichage} title={document.nom} className="h-full w-full border-0" />
          ) : (
            <div className="p-8 text-center text-sm text-gray-600 dark:text-gray-300">
              <p className="mb-4">Ce format (.{extension}) ne peut pas être affiché dans le navigateur.</p>
              <a
                href={document.url}
                download={document.nom}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                Télécharger
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

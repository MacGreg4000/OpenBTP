'use client'
import React from 'react'
import {
  FolderOpenIcon,
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  ShareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  MagnifyingGlassMinusIcon,
  ArrowsPointingOutIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { RulerIcon } from 'lucide-react'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'
import { useProjectStore } from '@/store/metres-plan/useProjectStore'

interface MetrePlanHeaderProps {
  metrePlanId: string | null
  chantierId: string | null
  chantierNom: string | null
  onSaveToServer: () => Promise<void>
  onDownloadLocal: () => void
  onLoadFromFile: () => void
  onOpenChantierPicker: () => void
  onExportAnnotatedToChantier: () => Promise<void>
  onGenerateShareLink: () => Promise<void>
  isSaving: boolean
}

const MetrePlanHeader: React.FC<MetrePlanHeaderProps> = ({
  metrePlanId,
  chantierId,
  chantierNom,
  onSaveToServer,
  onDownloadLocal,
  onLoadFromFile,
  onOpenChantierPicker,
  onExportAnnotatedToChantier,
  onGenerateShareLink,
  isSaving,
}) => {
  const {
    pdfDocument,
    currentPage,
    totalPages,
    setCurrentPage,
    zoom,
    zoomIn,
    zoomOut,
    zoomFit,
  } = usePdfStore()

  const {
    projectName,
    setProjectName,
    canUndo,
    canRedo,
    undo,
    redo,
    calibration,
    measurements,
    pageRotations,
    setPageRotation,
  } = useProjectStore()

  const rotationLocked = calibration !== null || measurements.length > 0
  const currentRotation = pageRotations[currentPage] ?? 0

  const rotatePage = (delta: number) => {
    const next = ((currentRotation + delta) % 360 + 360) % 360
    setPageRotation(currentPage, next)
  }

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex items-center px-4 gap-3 shrink-0 select-none z-10">
      {/* Logo + titre */}
      <div className="flex items-center gap-2 mr-1">
        <RulerIcon size={18} className="text-indigo-600 dark:text-indigo-400" />
        <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm whitespace-nowrap">
          Métré sur plan
        </span>
        {chantierNom && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ml-1 max-w-36 truncate" title={chantierNom}>
            {chantierNom}
          </span>
        )}
      </div>

      <Divider />

      {/* Nom du projet — input éditable */}
      <input
        className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-transparent outline-none border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 transition-colors px-1 min-w-0 w-44"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        title="Nom du projet"
        placeholder="Nom du projet"
      />

      <Divider />

      {/* Actions fichier */}
      <div className="flex items-center gap-1">
        <HeaderBtn onClick={onLoadFromFile} title="Ouvrir un fichier PDF ou .mplan (Ctrl+O)">
          <FolderOpenIcon className="w-4 h-4" />
          <span>Ouvrir</span>
        </HeaderBtn>

        <HeaderBtn
          onClick={onOpenChantierPicker}
          disabled={!chantierId}
          title={chantierId ? 'Charger depuis le chantier' : 'Aucun chantier sélectionné'}
        >
          <CloudArrowDownIcon className="w-4 h-4" />
          <span>Chantier</span>
        </HeaderBtn>
      </div>

      <Divider />

      {/* Undo / Redo */}
      <div className="flex items-center gap-1">
        <HeaderBtn onClick={undo} disabled={!canUndo()} title="Annuler (Ctrl+Z)">
          {/* rotate CCW */}
          <ArrowPathIcon className="w-4 h-4 scale-x-[-1]" />
        </HeaderBtn>
        <HeaderBtn onClick={redo} disabled={!canRedo()} title="Refaire (Ctrl+Y)">
          <ArrowPathIcon className="w-4 h-4" />
        </HeaderBtn>
      </div>

      {/* Navigation pages — visible seulement quand un PDF est chargé */}
      {pdfDocument && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
            <HeaderBtn
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              title="Page précédente"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </HeaderBtn>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap px-1">
              {currentPage} / {totalPages}
            </span>
            <HeaderBtn
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              title="Page suivante"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </HeaderBtn>
          </div>
        </>
      )}

      {/* Zoom — visible seulement quand un PDF est chargé */}
      {pdfDocument && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
            <HeaderBtn onClick={zoomOut} title="Zoom arrière">
              <MagnifyingGlassMinusIcon className="w-4 h-4" />
            </HeaderBtn>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-center">
              {zoom === -1 ? 'Ajusté' : `${Math.round(zoom * 100)}%`}
            </span>
            <HeaderBtn onClick={zoomIn} title="Zoom avant">
              <MagnifyingGlassPlusIcon className="w-4 h-4" />
            </HeaderBtn>
            <HeaderBtn onClick={zoomFit} title="Ajuster à la fenêtre">
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </HeaderBtn>
          </div>
        </>
      )}

      {/* Rotation — visible seulement quand un PDF est chargé */}
      {pdfDocument && (
        <>
          <Divider />
          <div className="flex items-center gap-1">
            <HeaderBtn
              onClick={() => rotatePage(-90)}
              disabled={rotationLocked}
              title={rotationLocked ? 'Rotation verrouillée (calibration ou mesures présentes)' : 'Pivoter à gauche 90°'}
            >
              <ArrowPathIcon className="w-4 h-4 scale-x-[-1] -rotate-90" />
            </HeaderBtn>
            <HeaderBtn
              onClick={() => rotatePage(90)}
              disabled={rotationLocked}
              title={rotationLocked ? 'Rotation verrouillée (calibration ou mesures présentes)' : 'Pivoter à droite 90°'}
            >
              <ArrowPathIcon className="w-4 h-4 rotate-90" />
            </HeaderBtn>
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions serveur / export */}
      <div className="flex items-center gap-1">
        <HeaderBtn
          onClick={onSaveToServer}
          disabled={!metrePlanId || isSaving}
          title={metrePlanId ? 'Sauvegarder dans le chantier (Ctrl+S)' : 'Aucun projet serveur (mode à la volée)'}
          variant="primary"
        >
          {isSaving ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
          ) : (
            <CloudArrowUpIcon className="w-4 h-4" />
          )}
          <span>Sauvegarder</span>
        </HeaderBtn>

        <HeaderBtn onClick={onDownloadLocal} title="Télécharger en local (.mplan)">
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span>.mplan</span>
        </HeaderBtn>

        <Divider />

        <HeaderBtn
          onClick={onExportAnnotatedToChantier}
          title="Exporter le plan annoté vers le chantier"
          disabled={!pdfDocument || !metrePlanId}
        >
          <DocumentArrowUpIcon className="w-4 h-4" />
          <span>Export PDF</span>
        </HeaderBtn>

        <HeaderBtn
          onClick={onGenerateShareLink}
          title="Générer un lien de partage"
          disabled={!metrePlanId}
        >
          <ShareIcon className="w-4 h-4" />
          <span>Partager</span>
        </HeaderBtn>
      </div>
    </header>
  )
}

/* ---- sous-composants ---- */

const Divider: React.FC = () => (
  <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 shrink-0" />
)

interface HeaderBtnProps {
  onClick?: () => void
  disabled?: boolean
  title?: string
  children: React.ReactNode
  variant?: 'default' | 'primary'
}

const HeaderBtn: React.FC<HeaderBtnProps> = ({ onClick, disabled, title, children, variant = 'default' }) => {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

  const styles = {
    default: disabled
      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white cursor-pointer',
    primary: disabled
      ? 'bg-indigo-300 dark:bg-indigo-900/40 text-white cursor-not-allowed'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm',
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${styles[variant]}`}
    >
      {children}
    </button>
  )
}

export default MetrePlanHeader

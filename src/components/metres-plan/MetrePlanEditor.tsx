'use client'
import React, { useEffect, useState, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import * as pdfjs from 'pdfjs-dist'

import MetrePlanHeader from './Header'
import Toolbar from './Toolbar'
import CanvasArea from './CanvasArea'
import RightPanel from './RightPanel'
import CalibrationModal from './CalibrationModal'
import ChantierPlanPickerModal from './ChantierPlanPickerModal'

import { useProjectStore } from '@/store/metres-plan/useProjectStore'
import { usePdfStore } from '@/store/metres-plan/usePdfStore'

import {
  saveProjectToServer,
  downloadProject,
  loadProjectFromFile,
} from '@/lib/metres-plan/projectStorage'
import { exportAnnotatedPdf } from '@/lib/metres-plan/exportAnnotatedPdf'

interface MetrePlanEditorProps {
  metrePlanId: string | null
  chantierId?: string | null
  chantierNom?: string | null
}

const MetrePlanEditor: React.FC<MetrePlanEditorProps> = ({
  metrePlanId,
  chantierId = null,
  chantierNom = null,
}) => {
  const [isSaving, setIsSaving] = useState(false)
  const [chantierPickerOpen, setChantierPickerOpen] = useState(false)

  const { pdfDocument, pdfBytes, pdfFileName, setPdfDocument, setPdfBytes } = usePdfStore()
  const { getProject, loadProject, undo, redo, canUndo, canRedo } = useProjectStore()

  /* ------------------------------------------------------------------ */
  /* Actions                                                              */
  /* ------------------------------------------------------------------ */

  const handleSaveToServer = useCallback(async () => {
    if (!metrePlanId) return
    setIsSaving(true)
    try {
      const project = { ...getProject(), pdfFileName }
      await saveProjectToServer(metrePlanId, project, pdfBytes, pdfFileName || null)
      toast.success('Projet sauvegardé dans le chantier')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setIsSaving(false)
    }
  }, [metrePlanId, getProject, pdfBytes, pdfFileName])

  const handleDownloadLocal = useCallback(() => {
    const project = { ...getProject(), pdfFileName }
    downloadProject(project, pdfBytes, pdfFileName || null)
  }, [getProject, pdfBytes, pdfFileName])

  const handleLoadFromFile = useCallback(async () => {
    const result = await loadProjectFromFile()
    if (!result) return
    loadProject(result.project)
    if (result.pdfBytes) {
      const doc = await pdfjs.getDocument({ data: result.pdfBytes }).promise
      setPdfDocument(doc, result.pdfFileName ?? 'document.pdf')
      setPdfBytes(result.pdfBytes)
    }
    toast.success('Projet chargé')
  }, [loadProject, setPdfDocument, setPdfBytes])

  const handleExportAnnotatedToChantier = useCallback(async () => {
    if (!pdfDocument || !metrePlanId) return
    try {
      const project = { ...getProject(), pdfFileName }
      const annotatedBytes = await exportAnnotatedPdf(project, pdfDocument)
      const blob = new Blob([annotatedBytes as BlobPart], { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('pdf', blob, `${project.name}_annote.pdf`)
      const res = await fetch(`/api/metres-plan/${metrePlanId}/export`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      toast.success('Plan annoté exporté vers le chantier')
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'export")
    }
  }, [pdfDocument, metrePlanId, getProject, pdfFileName])

  const handleGenerateShareLink = useCallback(async () => {
    if (!metrePlanId) return
    try {
      const res = await fetch(`/api/metres-plan/${metrePlanId}/share`, { method: 'POST' })
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
      const { shareUrl } = await res.json()
      await navigator.clipboard.writeText(shareUrl)
      toast.success(`Lien copié : ${shareUrl}`, { duration: 5000 })
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la génération du lien')
    }
  }, [metrePlanId])

  /* ------------------------------------------------------------------ */
  /* Keyboard shortcuts                                                   */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const inInput = ['input', 'textarea', 'select'].includes(
        (e.target as Element)?.tagName?.toLowerCase()
      )
      if (inInput) return

      const ctrl = e.ctrlKey || e.metaKey

      if (ctrl && e.key === 's') {
        e.preventDefault()
        handleSaveToServer()
      } else if (ctrl && e.key === 'o') {
        e.preventDefault()
        handleLoadFromFile()
      } else if (ctrl && e.key === 'z') {
        e.preventDefault()
        if (canUndo()) undo()
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault()
        if (canRedo()) redo()
      } else if (ctrl && e.key === 'd') {
        e.preventDefault()
        handleDownloadLocal()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSaveToServer, handleLoadFromFile, handleDownloadLocal, undo, redo, canUndo, canRedo])

  /* ------------------------------------------------------------------ */
  /* ChantierPicker callbacks                                             */
  /* ------------------------------------------------------------------ */

  const handleSelectPdf = useCallback(async (url: string, fileName: string) => {
    setChantierPickerOpen(false)
    try {
      const res = await fetch(url)
      const arrayBuf = await res.arrayBuffer()
      const bytes = new Uint8Array(arrayBuf)
      const doc = await pdfjs.getDocument({ data: bytes }).promise
      setPdfDocument(doc, fileName)
      setPdfBytes(bytes)
      toast.success(`PDF chargé : ${fileName}`)
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du chargement du PDF')
    }
  }, [setPdfDocument, setPdfBytes])

  const handleSelectMplan = useCallback(async (selectedMetrePlanId: string) => {
    setChantierPickerOpen(false)
    try {
      const res = await fetch(`/api/metres-plan/${selectedMetrePlanId}/file`)
      if (!res.ok) throw new Error(`${res.status}`)
      const arrayBuf = await res.arrayBuffer()
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(arrayBuf)
      const projectEntry = zip.file('project.json')
      if (!projectEntry) throw new Error('project.json manquant')
      const projectJson = await projectEntry.async('string')
      const { version: _, ...project } = JSON.parse(projectJson)
      loadProject(project)
      const pdfEntry = zip.file('document.pdf')
      if (pdfEntry) {
        const bytes = await pdfEntry.async('uint8array')
        const doc = await pdfjs.getDocument({ data: bytes }).promise
        setPdfDocument(doc, project.pdfFileName ?? 'document.pdf')
        setPdfBytes(bytes)
      }
      toast.success('Projet métré chargé')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors du chargement du projet métré')
    }
  }, [loadProject, setPdfDocument, setPdfBytes])

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <MetrePlanHeader
        metrePlanId={metrePlanId}
        chantierId={chantierId}
        chantierNom={chantierNom}
        onSaveToServer={handleSaveToServer}
        onDownloadLocal={handleDownloadLocal}
        onLoadFromFile={handleLoadFromFile}
        onOpenChantierPicker={() => setChantierPickerOpen(true)}
        onExportAnnotatedToChantier={handleExportAnnotatedToChantier}
        onGenerateShareLink={handleGenerateShareLink}
        isSaving={isSaving}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar />
        <CanvasArea />
        <RightPanel />
      </div>

      {/* Modales */}
      <CalibrationModal />

      {chantierPickerOpen && chantierId && (
        <ChantierPlanPickerModal
          isOpen={chantierPickerOpen}
          onClose={() => setChantierPickerOpen(false)}
          chantierId={chantierId}
          onSelectPdf={handleSelectPdf}
          onSelectMplan={handleSelectMplan}
        />
      )}
    </div>
  )
}

export default MetrePlanEditor

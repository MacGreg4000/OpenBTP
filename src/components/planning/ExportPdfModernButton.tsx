'use client'

import { useState } from 'react'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'

type TaskStatus = 'PREVU' | 'EN_COURS' | 'TERMINE'

type ApiTask = {
  id: string
  title: string
  start: string
  end: string
  status: TaskStatus
  ouvriersInternes?: Array<{ ouvrierInterne: { id: string } }>
  sousTraitants?: Array<{ soustraitant: { id: string } }>
}

type ResourceItem = { 
  id: string
  title: string
  kind: 'I' | 'S' 
}

interface ExportPdfModernButtonProps {
  title?: string
  fileName?: string
  getPlanningData: () => {
    days: string[]
    resources: ResourceItem[]
    tasks: ApiTask[]
    periodText: string
  }
}

export default function ExportPdfModernButton({ 
  title = 'PDF Moderne', 
  fileName = 'planning-ressources-moderne.pdf', 
  getPlanningData 
}: ExportPdfModernButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExportModern = async () => {
    try {
      setIsGenerating(true)
      console.log('🎯 Début export PDF moderne du planning...')

      // Récupérer le HTML du planning
      const planningElement = document.getElementById('resource-scheduler-capture')
      if (!planningElement) {
        throw new Error('Élément de planning non trouvé')
      }

      // Utiliser l'API de capture d'écran
      const response = await fetch('/api/planning/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planningHTML: planningElement.outerHTML,
          fileName: fileName.replace('.pdf', ''),
          periodText: getPlanningData().periodText
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`)
      }

      // Télécharger le PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      console.log('✅ PDF téléchargé avec succès')

    } catch (error) {
      console.error('❌ Erreur lors de l\'export PDF moderne:', error)
      alert(`Échec de l'export PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleExportModern}
      disabled={isGenerating}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
        transition-all duration-200 shadow-lg hover:shadow-xl
        ${isGenerating 
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105'
        }
        border border-blue-500/30 backdrop-blur-sm
      `}
    >
      <DocumentArrowDownIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
      {isGenerating ? 'Génération...' : title}
    </button>
  )
}


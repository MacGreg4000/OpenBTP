'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import React from 'react'
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui'

// Interface pour les données du PDF
interface PDFData {
  reception: {
    id: string
    chantier: string
    dateCreation: string
    dateLimite: string
    estFinalise: boolean
    codePIN: string
  }
  remarques: Array<{
    id: string
    description: string
    localisation: string
    statut: string
    date: string
  }>
  generePar: string
  dateGeneration: string
}

export default function PDFViewPage({ 
  params 
}: { 
  params: Promise<{ chantierId: string, id: string }> 
}) {
  // Utiliser React.use pour déballer la Promise params
  const { chantierId, id } = React.use(params)
  const [pdfData, setPdfData] = useState<PDFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/chantiers/${chantierId}/reception/${id}/pdf`)
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erreur lors de la génération du PDF')
        }
        
        const data = await response.json()
        setPdfData(data.data)
        setLoading(false)
      } catch (error) {
        console.error('Erreur:', error)
        setError(error instanceof Error ? error.message : 'Une erreur est survenue')
        setLoading(false)
      }
    }
    
    fetchData()
  }, [chantierId, id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) return <div className="p-8">Chargement du PDF...</div>
  if (error) return <div className="p-8 text-red-500">Erreur: {error}</div>
  if (!pdfData) return <div className="p-8">Aucune donnée disponible</div>

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link 
          href={`/chantiers/${chantierId}/reception/${id}`}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Retour
        </Link>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handlePrint}
            className="flex items-center"
          >
            <PrinterIcon className="h-5 w-5 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
        {/* En-tête */}
        <div className="bg-red-600 text-white p-6">
          <h1 className="text-2xl font-bold">Rapport de réception de chantier</h1>
          <p className="text-white/80 mt-1">
            Généré le {pdfData.dateGeneration} par {pdfData.generePar}
          </p>
        </div>

        {/* Informations de la réception */}
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-4">Informations générales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Chantier :</p>
              <p className="font-medium">{pdfData.reception.chantier}</p>
            </div>
            <div>
              <p className="text-gray-600">Date de création :</p>
              <p className="font-medium">{pdfData.reception.dateCreation}</p>
            </div>
            <div>
              <p className="text-gray-600">Date limite :</p>
              <p className="font-medium">{pdfData.reception.dateLimite}</p>
            </div>
            <div>
              <p className="text-gray-600">Statut :</p>
              <p className="font-medium">{pdfData.reception.estFinalise ? 'Finalisée' : 'En cours'}</p>
            </div>
            {pdfData.reception.codePIN !== 'Aucun' && (
              <div>
                <p className="text-gray-600">Code PIN :</p>
                <p className="font-medium">{pdfData.reception.codePIN}</p>
              </div>
            )}
          </div>
        </div>

        {/* Liste des remarques */}
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Remarques ({pdfData.remarques.length})</h2>
          
          {pdfData.remarques.length === 0 ? (
            <p className="text-gray-500 italic">Aucune remarque enregistrée.</p>
          ) : (
            <div className="space-y-6">
              {pdfData.remarques.map((remarque, index) => (
                <div key={remarque.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{index + 1}. {remarque.description}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Localisation: {remarque.localisation}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${remarque.statut === 'Validée' ? 'bg-green-100 text-green-800' : 
                          remarque.statut === 'Rejetée' ? 'bg-red-100 text-red-800' : 
                          remarque.statut === 'En attente de validation' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'}`
                      }>
                        {remarque.statut}
                      </span>
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {remarque.date}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div className="p-6 bg-gray-50 text-center text-sm text-gray-600">
          <p>Ce document est un rapport officiel généré par le système de gestion de réception de chantier.</p>
          <p>Référence: {pdfData.reception.id}</p>
        </div>
      </div>
    </div>
  )
} 
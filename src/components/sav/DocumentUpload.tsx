'use client'

import { useState, useRef } from 'react'
import { 
  DocumentIcon, 
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { TypeDocumentSAV, LABELS_TYPE_DOCUMENT_SAV } from '@/types/sav'
// import { Button } from '@/components/ui'

interface DocumentUploadProps {
  onDocumentsChange: (documents: DocumentFile[]) => void
  existingDocuments?: DocumentFile[]
  maxDocuments?: number
}

export interface DocumentFile {
  id?: string
  file?: File
  url: string
  nom: string
  nomOriginal: string
  description?: string
  type: TypeDocumentSAV
  taille?: number
  mimeType?: string
}

export default function DocumentUpload({ 
  onDocumentsChange, 
  existingDocuments = [], 
  maxDocuments = 20
}: DocumentUploadProps) {
  const [documents, setDocuments] = useState<DocumentFile[]>(existingDocuments)
  const [isDragging, setIsDragging] = useState(false)
  // const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (files: FileList) => {
    const newDocuments: DocumentFile[] = []
    
    Array.from(files).forEach(file => {
      if (documents.length + newDocuments.length < maxDocuments) {
        const url = URL.createObjectURL(file)
        newDocuments.push({
          id: `temp-${Date.now()}-${Math.random()}`,
          file,
          url,
          nom: file.name,
          nomOriginal: file.name,
          type: TypeDocumentSAV.AUTRE,
          description: '',
          taille: file.size,
          mimeType: file.type
        })
      }
    })

    const updatedDocuments = [...documents, ...newDocuments]
    setDocuments(updatedDocuments)
    onDocumentsChange(updatedDocuments)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeDocument = (index: number) => {
    const document = documents[index]
    if (document.url.startsWith('blob:')) {
      URL.revokeObjectURL(document.url)
    }
    
    const updatedDocuments = documents.filter((_, i) => i !== index)
    setDocuments(updatedDocuments)
    onDocumentsChange(updatedDocuments)
  }

  const updateDocumentDetails = (index: number, field: keyof DocumentFile, value: string | TypeDocumentSAV) => {
    const updatedDocuments = documents.map((doc, i) => 
      i === index ? { ...doc, [field]: value } : doc
    )
    setDocuments(updatedDocuments)
    onDocumentsChange(updatedDocuments)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <DocumentIcon className="h-8 w-8" />
    
    if (mimeType.includes('pdf')) return <DocumentIcon className="h-8 w-8 text-red-500" />
    if (mimeType.includes('word')) return <DocumentIcon className="h-8 w-8 text-blue-500" />
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return <DocumentIcon className="h-8 w-8 text-green-500" />
    if (mimeType.includes('image')) return <DocumentIcon className="h-8 w-8 text-purple-500" />
    
    return <DocumentIcon className="h-8 w-8 text-gray-500" />
  }

  return (
    <div className="space-y-4">
      {/* Zone d'upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-2">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Glissez-déposez vos documents ici ou{' '}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-500 underline"
              onClick={() => fileInputRef.current?.click()}
            >
              parcourez
            </button>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            PDF, DOC, DOCX, XLS, XLSX, images jusqu&apos;à 50MB ({documents.length}/{maxDocuments} documents)
          </p>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
        />
      </div>

      {/* Liste des documents */}
      {documents.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Documents ajoutés ({documents.length})
          </h4>
          
          <div className="space-y-3">
            {documents.map((document, index) => (
              <div key={document.id || index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
                <div className="flex items-start space-x-4">
                  {/* Icône du fichier */}
                  <div className="flex-shrink-0">
                    {getFileIcon(document.mimeType)}
                  </div>
                  
                  {/* Détails du fichier */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                          {document.nomOriginal}
                        </h5>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {document.taille && formatFileSize(document.taille)} • {document.mimeType}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Type de document
                        </label>
                        <select
                          value={document.type}
                          onChange={(e) => updateDocumentDetails(index, 'type', e.target.value as TypeDocumentSAV)}
                          className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        >
                          {Object.values(TypeDocumentSAV).map(type => (
                            <option key={type} value={type}>
                              {LABELS_TYPE_DOCUMENT_SAV[type]}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Nom du document
                        </label>
                        <input
                          type="text"
                          value={document.nom}
                          onChange={(e) => updateDocumentDetails(index, 'nom', e.target.value)}
                          className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={2}
                        value={document.description || ''}
                        onChange={(e) => updateDocumentDetails(index, 'description', e.target.value)}
                        placeholder="Description du document..."
                        className="w-full text-sm p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 
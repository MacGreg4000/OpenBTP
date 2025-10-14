'use client'
import { useState, useEffect } from 'react'
import { 
  FolderIcon, 
  DocumentIcon, 
  PlusCircleIcon, 
  XCircleIcon, 
  FolderPlusIcon,
  ArrowUpOnSquareIcon,
  TrashIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

// Types pour la structure des dossiers et fichiers
interface File {
  id: string
  name: string
  path: string
  type: string
  size: number
  updatedAt: string
}

interface Folder {
  id: string
  name: string
  path: string
  isExpanded?: boolean
  subfolders: Folder[]
  files: File[]
}

export default function DocumentManager() {
  const [rootFolder, setRootFolder] = useState<Folder>({
    id: 'root',
    name: 'Documents techniques',
    path: '/',
    isExpanded: true,
    subfolders: [],
    files: []
  })
  
  const [selectedItem, setSelectedItem] = useState<Folder | File | null>(null)
  const [loading, setLoading] = useState(true)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [currentPath, setCurrentPath] = useState('/')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const fetchFolderStructure = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/documents/structure')
        
        if (!response.ok) {
          throw new Error('Erreur lors du chargement de la structure des dossiers')
        }
        
        const data = await response.json()
        setRootFolder(data)
      } catch (error) {
        console.error('Erreur lors du chargement des dossiers:', error)
        toast.error('Erreur lors du chargement des dossiers')
      } finally {
        setLoading(false)
      }
    }

    fetchFolderStructure()
  }, [])

  const toggleFolder = (folder: Folder) => {
    const updateFolders = (folders: Folder[]): Folder[] => {
      return folders.map(f => {
        if (f.id === folder.id) {
          return { ...f, isExpanded: !f.isExpanded }
        }
        
        if (f.subfolders.length > 0) {
          return { ...f, subfolders: updateFolders(f.subfolders) }
        }
        
        return f
      })
    }
    
    setRootFolder(prevRoot => ({
      ...prevRoot,
      subfolders: updateFolders(prevRoot.subfolders)
    }))
  }

  const selectItem = (item: Folder | File) => {
    setSelectedItem(item)
    
    // Si c'est un fichier, générer l'URL de prévisualisation
    if ('type' in item) {
      setPreviewUrl(`/api/documents/preview?path=${encodeURIComponent(item.path)}`)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Veuillez entrer un nom de dossier')
      return
    }
    
    try {
      const response = await fetch('/api/documents/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newFolderName,
          path: currentPath
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création du dossier')
      }
      
      const newFolder = await response.json()
      
      toast.success(`Dossier '${newFolderName}' créé`)
      setNewFolderName('')
      setShowNewFolderInput(false)
      
      // Mettre à jour l'état local avec le nouveau dossier
      const addFolderToPath = (folders: Folder[], path: string): Folder[] => {
        if (path === '/') {
          return [...folders, newFolder]
        }
        
        return folders.map(folder => {
          if (folder.path === path || path.startsWith(folder.path + '/')) {
            return {
              ...folder,
              subfolders: path === folder.path 
                ? [...folder.subfolders, newFolder]
                : addFolderToPath(folder.subfolders, path)
            }
          }
          return folder
        })
      }
      
      setRootFolder(prev => ({
        ...prev,
        subfolders: addFolderToPath(prev.subfolders, currentPath)
      }))
      
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création du dossier')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return
    
    // Pour chaque fichier sélectionné
    Array.from(files).forEach(async (file) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('path', currentPath)
        
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Erreur lors du téléchargement de '${file.name}'`)
        }
        
        const uploadedFile = await response.json()
        
        toast.success(`Fichier '${file.name}' téléchargé`)
        
        // Mettre à jour l'état local avec le nouveau fichier
        const addFileToPath = (folders: Folder[], path: string): Folder[] => {
          return folders.map(folder => {
            if (folder.path === path) {
              return {
                ...folder,
                files: [...folder.files, uploadedFile]
              }
            }
            
            if (folder.subfolders.length > 0) {
              return {
                ...folder,
                subfolders: addFileToPath(folder.subfolders, path)
              }
            }
            
            return folder
          })
        }
        
        setRootFolder(prev => {
          if (currentPath === '/') {
            return {
              ...prev,
              files: [...prev.files, uploadedFile]
            }
          }
          
          return {
            ...prev,
            subfolders: addFileToPath(prev.subfolders, currentPath)
          }
        })
        
      } catch (error) {
        console.error('Erreur lors du téléchargement du fichier:', error)
        toast.error(error instanceof Error ? error.message : `Erreur lors du téléchargement de '${file.name}'`)
      }
    })
    
    // Réinitialiser le champ de fichier pour permettre la sélection du même fichier
    event.target.value = ''
  }

  const handleDeleteItem = async () => {
    if (!selectedItem) return
    
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${selectedItem.name}" ?`)) {
      return
    }
    
    try {
      const isFolder = !('type' in selectedItem)
      const pathToRemove = selectedItem.path
      
      const response = await fetch(`/api/documents?path=${encodeURIComponent(pathToRemove)}&isFolder=${isFolder}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la suppression')
      }
      
      toast.success(`'${selectedItem.name}' supprimé`)
      
      // Mettre à jour l'état local
      const removeItem = (folders: Folder[]): Folder[] => {
        return folders.filter(folder => folder.path !== pathToRemove)
          .map(folder => {
            if (isFolder) {
              return {
                ...folder,
                subfolders: removeItem(folder.subfolders)
              }
            } else {
              return {
                ...folder,
                files: folder.files.filter(file => file.path !== pathToRemove),
                subfolders: removeItem(folder.subfolders)
              }
            }
          })
      }
      
      if (isFolder) {
        setRootFolder(prev => ({
          ...prev,
          subfolders: removeItem(prev.subfolders)
        }))
      } else {
        setRootFolder(prev => ({
          ...prev,
          files: prev.files.filter(file => file.path !== pathToRemove),
          subfolders: prev.subfolders.map(folder => ({
            ...folder,
            files: folder.files.filter(file => file.path !== pathToRemove),
            subfolders: removeItem(folder.subfolders)
          }))
        }))
      }
      
      setSelectedItem(null)
      setPreviewUrl(null)
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression')
    }
  }

  const renderFolder = (folder: Folder) => {
    return (
      <div key={folder.id} className="ml-4">
        <div 
          className={`flex items-center p-2 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
            selectedItem?.id === folder.id ? 'bg-blue-100 dark:bg-blue-700/30' : ''
          }`}
          onClick={() => {
            selectItem(folder)
            setCurrentPath(folder.path)
          }}
        >
          <button 
            className="p-1 mr-1"
            onClick={(e) => {
              e.stopPropagation()
              toggleFolder(folder)
            }}
          >
            {folder.isExpanded ? 
              <ChevronDownIcon className="h-4 w-4 text-gray-500" /> : 
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            }
          </button>
          <FolderIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="text-sm">{folder.name}</span>
        </div>
        
        {folder.isExpanded && (
          <div>
            {folder.subfolders.map(subfolder => renderFolder(subfolder))}
            {folder.files.map(file => (
              <div 
                key={file.id}
                className={`flex items-center p-2 ml-6 cursor-pointer rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  selectedItem?.id === file.id ? 'bg-blue-100 dark:bg-blue-700/30' : ''
                }`}
                onClick={() => selectItem(file)}
              >
                <DocumentIcon className="h-5 w-5 text-blue-500 mr-2" />
                <span className="text-sm">{file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB'
    else return (bytes / 1073741824).toFixed(1) + ' GB'
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Gestion des fiches techniques
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Organisez et gérez les documents liés aux fiches techniques des projets
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row h-[600px]">
        {/* Panneau de gauche - Arborescence */}
        <div className="w-full md:w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4">
          <div className="mb-4 flex space-x-2">
            <button 
              onClick={() => setShowNewFolderInput(true)}
              className="flex items-center text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-700"
            >
              <FolderPlusIcon className="h-4 w-4 mr-1" />
              Nouveau dossier
            </button>
            
            <label className="flex items-center text-sm bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 px-3 py-1 rounded-md hover:bg-green-200 dark:hover:bg-green-700 cursor-pointer">
              <ArrowUpOnSquareIcon className="h-4 w-4 mr-1" />
              Importer
              <input 
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
          
          {showNewFolderInput && (
            <div className="mb-4 flex items-center">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nom du dossier"
                className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-l-md text-sm dark:bg-gray-700 dark:text-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateFolder()
                  if (e.key === 'Escape') {
                    setShowNewFolderInput(false)
                    setNewFolderName('')
                  }
                }}
                autoFocus
              />
              <button
                onClick={handleCreateFolder}
                className="bg-blue-600 text-white px-2 py-1 text-sm rounded-r-md hover:bg-blue-700"
              >
                <PlusCircleIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setShowNewFolderInput(false)
                  setNewFolderName('')
                }}
                className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircleIcon className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Chemin actuel: {currentPath}
          </div>
          
          {/* Arborescence de fichiers */}
          <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
            {renderFolder(rootFolder)}
          </div>
        </div>
        
        {/* Panneau de droite - Aperçu et détails */}
        <div className="w-full md:w-2/3 p-4 overflow-y-auto">
          {selectedItem ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedItem.name}
                </h3>
                <div className="flex space-x-2">
                  {'type' in selectedItem ? (
                    <a 
                      href={`/api/documents/download?path=${encodeURIComponent(selectedItem.path)}`}
                      download={selectedItem.name}
                      className="flex items-center text-sm bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-md hover:bg-blue-200 dark:hover:bg-blue-700"
                    >
                      <ArrowUpOnSquareIcon className="h-4 w-4 mr-1 transform rotate-180" />
                      Télécharger
                    </a>
                  ) : null}
                  <button 
                    onClick={handleDeleteItem}
                    className="flex items-center text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-3 py-1 rounded-md hover:bg-red-200 dark:hover:bg-red-700"
                  >
                    <TrashIcon className="h-4 w-4 mr-1" />
                    Supprimer
                  </button>
                </div>
              </div>
              
              {/* Détails de l'élément sélectionné */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>{' '}
                    {'type' in selectedItem ? selectedItem.type.split('/')[1].toUpperCase() : 'Dossier'}
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Chemin:</span>{' '}
                    {selectedItem.path}
                  </div>
                  {'type' in selectedItem && (
                    <>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Taille:</span>{' '}
                        {formatFileSize(selectedItem.size)}
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Dernière modification:</span>{' '}
                        {new Date(selectedItem.updatedAt).toLocaleDateString('fr-FR')}
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Aperçu du fichier si c'est un fichier et prévisualisable */}
              {'type' in selectedItem && previewUrl && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Aperçu</h4>
                  <div className="border border-gray-200 dark:border-gray-600 rounded-md overflow-hidden bg-white dark:bg-gray-800">
                    {selectedItem.type.startsWith('image/') ? (
                      <img 
                        src={previewUrl} 
                        alt={selectedItem.name} 
                        className="max-w-full max-h-[400px] mx-auto object-contain"
                      />
                    ) : selectedItem.type === 'application/pdf' ? (
                      <div className="h-[400px] w-full">
                        <iframe 
                          src={`${previewUrl}#toolbar=0`} 
                          className="w-full h-full"
                          title={selectedItem.name}
                        />
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                        <DocumentIcon className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                        Aperçu non disponible pour ce type de fichier
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <DocumentIcon className="h-16 w-16 mb-4" />
              <p>Sélectionnez un dossier ou un fichier pour afficher les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
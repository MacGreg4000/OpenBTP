'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  DocumentTextIcon, 
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  PencilSquareIcon,
  CurrencyEuroIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'

interface ChantierHeaderProps {
  chantierId: string
  chantier: {
    nomChantier: string
    numeroIdentification?: string | null
    etatChantier: string
  }
}

export function ChantierHeader({ chantierId, chantier }: ChantierHeaderProps) {
  const pathname = usePathname();
  
  // Fonction pour déterminer si un lien est actif
  const isActive = (path: string) => {
    return pathname.includes(path);
  };

  // Définir les couleurs des icônes
  const getIconColor = (path: string) => {
    if (isActive(path)) {
      return "text-blue-600 dark:text-blue-400";
    }
    
    // Couleurs spécifiques pour chaque type d'action
    switch (path) {
      case '/edit':
        return "text-yellow-500 group-hover:text-yellow-600 dark:text-yellow-400 dark:group-hover:text-yellow-300";
      case '/commande':
        return "text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300";
      case '/etats':
        return "text-blue-500 group-hover:text-blue-600 dark:text-blue-400 dark:group-hover:text-blue-300";
      case '/documents':
        return "text-green-500 group-hover:text-green-600 dark:text-green-400 dark:group-hover:text-green-300";
      case '/notes':
        return "text-purple-500 group-hover:text-purple-600 dark:text-purple-400 dark:group-hover:text-purple-300";
      case '/rapports':
        return "text-red-500 group-hover:text-red-600 dark:text-red-400 dark:group-hover:text-red-300";
      case '/reception':
        return "text-red-500 group-hover:text-red-600 dark:text-red-400 dark:group-hover:text-red-300";
      default:
        return "text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4">
          {/* Titre du chantier - section séparée pour éviter les problèmes d'alignement */}
          <div className="transform transition-all duration-300 hover:scale-[1.01]">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent break-words">
              {chantier.nomChantier}
            </h1>
            {chantier.numeroIdentification && (
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mt-1">
                ID: {chantier.numeroIdentification}
              </p>
            )}
            {/* Statut du chantier supprimé pour éviter l'affichage incorrect */}
          </div>
          
          {/* Navigation - section séparée pour un meilleur alignement */}
          <nav className="flex flex-wrap gap-2 md:gap-3 justify-start md:justify-end">
            {/* Éditer */}
            <Link
              href={`/chantiers/${chantierId}/edit`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/edit') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <PencilSquareIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/edit')}`} />
              Éditer
            </Link>
            
            {/* Commande */}
            <Link
              href={`/chantiers/${chantierId}/commande`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/commande') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <CurrencyEuroIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/commande')}`} />
              Commande
            </Link>
            
            {/* États d'avancement */}
            <Link
              href={`/chantiers/${chantierId}/etats`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/etats') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <ChartBarIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/etats')}`} />
              États
            </Link>
            
            {/* Documents */}
            <Link
              href={`/chantiers/${chantierId}/documents`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/documents') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <DocumentDuplicateIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/documents')}`} />
              Documents
            </Link>
            
            {/* Notes */}
            <Link
              href={`/chantiers/${chantierId}/notes`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/notes') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <ClipboardDocumentListIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/notes')}`} />
              Notes
            </Link>
            
            {/* Rapports de visite */}
            <Link
              href={`/chantiers/${chantierId}/rapports`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 
                ${isActive('/rapports') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <DocumentTextIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/rapports')}`} />
              Rapports
            </Link>
            
            {/* Réception */}
            <Link
              href={`/chantiers/${chantierId}/reception`}
              className={`group inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-all duration-300
                ${isActive('/reception') 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-b-2 border-blue-500 shadow-sm' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'}`}
            >
              <ClipboardDocumentCheckIcon className={`h-5 w-5 mr-2 transition-colors duration-300 ${getIconColor('/reception')}`} />
              Réception
            </Link>
            
          </nav>
        </div>
      </div>
    </div>
  )
} 
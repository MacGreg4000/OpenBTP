'use client'

import Link from 'next/link'
import { 
  DocumentTextIcon, 
  ClipboardDocumentListIcon,
  ArrowRightIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

const administrativeModules = [
  {
    id: 'documents',
    title: 'Documents Administratifs',
    description: 'Centralisez et gérez tous vos documents administratifs en un seul endroit pour un accès rapide et organisé',
    href: '/administratif/documents',
    icon: DocumentTextIcon,
    color: 'purple',
    features: ['Organisation centralisée', 'Recherche avancée', 'Archivage'],
    bgGradient: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    id: 'bons-regie',
    title: 'Bons de Régie',
    description: 'Créez, gérez et suivez tous vos bons de régie avec association automatique aux chantiers correspondants',
    href: '/bons-regie',
    icon: ClipboardDocumentListIcon,
    color: 'green',
    features: ['Création rapide', 'Association chantiers', 'Suivi temps réel'],
    bgGradient: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400'
  }
]

export default function AdministratifPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* En-tête avec gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <BuildingOfficeIcon className="h-8 w-8 text-white mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    Administratif
                  </h1>
                  <p className="mt-2 text-blue-100">
                    Outils et documents pour la gestion administrative
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {administrativeModules.map((module) => {
            const IconComponent = module.icon
            return (
              <Link
                key={module.id}
                href={module.href}
                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 overflow-hidden"
              >
                {/* En-tête de la carte avec gradient */}
                <div className={`bg-gradient-to-r ${module.bgGradient} p-6`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-lg font-semibold text-white">
                          {module.title}
                        </h3>
                      </div>
                    </div>
                    <ArrowRightIcon className="h-5 w-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all duration-200" />
                  </div>
                </div>

                {/* Contenu de la carte */}
                <div className="p-6">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
                    {module.description}
                  </p>

                  {/* Liste des fonctionnalités */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                      Fonctionnalités clés :
                    </h4>
                    <ul className="space-y-1">
                      {module.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <div className={`w-1.5 h-1.5 ${module.bgGradient} rounded-full mr-2`}></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Badge d'action */}
                  <div className="mt-6">
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${module.bgLight} ${module.textColor}`}>
                      <IconComponent className="h-3 w-3 mr-1" />
                      Accéder au module
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
                 </div>
      </div>
    </div>
  )
} 
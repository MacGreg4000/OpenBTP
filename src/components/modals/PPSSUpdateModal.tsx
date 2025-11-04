'use client'

import { Fragment, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface PPSSUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  success: boolean
  message: string
  warning?: string
}

export function PPSSUpdateModal({ isOpen, onClose, success, message, warning }: PPSSUpdateModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Auto-fermer après 4 secondes si succès
      if (success && !warning) {
        const timer = setTimeout(() => {
          onClose()
        }, 4000)
        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, success, warning, onClose])

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow-2xl transition-all border-2 border-gray-200/50 dark:border-gray-700/50">
                {/* Effet de brillance en arrière-plan */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10" />
                
                <div className="relative p-6">
                  {/* Bouton fermer */}
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>

                  {/* Contenu */}
                  <div className="flex flex-col items-center text-center">
                    {/* Icône */}
                    <div className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
                      success && !warning
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                        : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg shadow-orange-500/50'
                    }`}>
                      {success && !warning ? (
                        <CheckCircleIcon className="h-8 w-8 text-white" />
                      ) : (
                        <ExclamationTriangleIcon className="h-8 w-8 text-white" />
                      )}
                    </div>

                    {/* Titre */}
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-black text-gray-900 dark:text-white mb-2"
                    >
                      {success && !warning ? 'Chantier mis à jour !' : 'Mise à jour effectuée'}
                    </Dialog.Title>

                    {/* Message principal */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {message}
                      </p>
                    </div>

                    {/* Avertissement si présent */}
                    {warning && (
                      <div className="w-full mb-4 p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-2 border-orange-200 dark:border-orange-700/50 rounded-xl">
                        <div className="flex items-start gap-3">
                          <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                          <div className="text-left flex-1">
                            <p className="text-xs font-bold text-orange-900 dark:text-orange-200 uppercase tracking-wide mb-1">
                              Avertissement
                            </p>
                            <p className="text-sm text-orange-800 dark:text-orange-300">
                              {warning}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Badge PPSS si succès complet */}
                    {success && !warning && (
                      <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                          PPSS automatiquement régénéré
                        </span>
                      </div>
                    )}

                    {/* Bouton d'action */}
                    <button
                      onClick={onClose}
                      className="w-full mt-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
                    >
                      Parfait, merci !
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}



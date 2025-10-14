'use client'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import QRCodeDisplay from '../outillage/QRCodeDisplay'

interface EmplacementQRCodeModalProps {
  emplacementId: string
  rackNom: string
  position: string
  qrCodeValue: string
  onClose: () => void
}

export default function EmplacementQRCodeModal({ 
  emplacementId, 
  rackNom, 
  position, 
  qrCodeValue, 
  onClose 
}: EmplacementQRCodeModalProps) {
  // Construire l'URL complète pour l'application
  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/inventory/scanner?code=` : ''
  const fullQrCodeValue = `${baseUrl}${qrCodeValue}`
  
  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-10 overflow-y-auto"
      onClose={onClose}
      open={true}
    >
      <div className="flex min-h-screen items-center justify-center">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-lg w-full max-w-md mx-4 p-6">
          <div className="absolute top-4 right-4">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <Dialog.Title
            as="h3"
            className="text-lg font-medium leading-6 text-gray-900 mb-4"
          >
            QR Code - Emplacement {position}
          </Dialog.Title>

          <div className="mt-4 flex flex-col items-center space-y-4">
            <QRCodeDisplay value={fullQrCodeValue} size={256} />
            <div className="text-center">
              <p className="font-medium text-gray-700">{rackNom}</p>
              <p className="text-sm text-gray-500">
                Position: {position}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ID: {emplacementId}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Valeur: {qrCodeValue}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                URL: {fullQrCodeValue}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Imprimer
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  )
} 
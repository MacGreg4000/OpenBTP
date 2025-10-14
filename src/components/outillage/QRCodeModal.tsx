'use client'
import { Dialog } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import QRCodeDisplay from './QRCodeDisplay'

interface QRCodeModalProps {
  machineId: string
  machineName: string
  qrCodeValue: string
  onClose: () => void
}

export default function QRCodeModal({ machineId, machineName, qrCodeValue, onClose }: QRCodeModalProps) {
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
            QR Code - {machineName}
          </Dialog.Title>

          <div className="mt-4 flex flex-col items-center space-y-4">
            <QRCodeDisplay value={qrCodeValue} size={256} />
            <p className="text-sm text-gray-500">
              ID: {machineId}
            </p>
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
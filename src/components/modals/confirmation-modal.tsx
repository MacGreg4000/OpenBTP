'use client';

import { useEffect, useState } from "react";
import { Dialog } from '@headlessui/react';
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  showCancel?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title = "Confirmation",
  message = "Êtes-vous sûr de vouloir continuer ?",
  type = 'info',
  confirmText = "Confirmer",
  cancelText = "Annuler",
  loading = false,
  showCancel = true
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) {
    return null;
  }

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
  };

  const getButtonStyle = () => {
    switch (type) {
      case 'warning':
        return "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500";
      case 'success':
        return "bg-green-600 hover:bg-green-700 focus:ring-green-500";
      case 'error':
        return "bg-red-600 hover:bg-red-700 focus:ring-red-500";
      default:
        return "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500";
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <Dialog
      as="div"
      className="fixed inset-0 z-50 overflow-y-auto"
      onClose={onClose}
      open={isOpen}
    >
      <div className="flex min-h-screen items-center justify-center p-4">
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <Dialog.Description className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {message}
            </Dialog.Description>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            {showCancel && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors disabled:opacity-50 ${getButtonStyle()}`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  En cours...
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

// Hook pour utiliser facilement la modale de confirmation
export const useConfirmation = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'error';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    showCancel?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const showConfirmation = (options: {
    title?: string;
    message: string;
    type?: 'info' | 'warning' | 'success' | 'error';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
    showCancel?: boolean;
  }) => {
    setModalState({
      isOpen: true,
      title: options.title || 'Confirmation',
      message: options.message,
      type: options.type || 'info',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel,
      confirmText: options.confirmText,
      cancelText: options.cancelText,
      loading: options.loading,
      showCancel: options.showCancel !== false,
    });
  };

  const hideConfirmation = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const ConfirmationModalComponent = (
    <ConfirmationModal
      isOpen={modalState.isOpen}
      onClose={hideConfirmation}
      onConfirm={() => {
        modalState.onConfirm();
        hideConfirmation();
      }}
      onCancel={modalState.onCancel}
      title={modalState.title}
      message={modalState.message}
      type={modalState.type}
      confirmText={modalState.confirmText}
      cancelText={modalState.cancelText}
      loading={modalState.loading}
      showCancel={modalState.showCancel}
    />
  );

  return {
    showConfirmation,
    hideConfirmation,
    ConfirmationModalComponent,
  };
}; 
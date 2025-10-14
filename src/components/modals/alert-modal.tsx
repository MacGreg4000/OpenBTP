'use client';

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button"; // Corrigé

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  title?: string;
  description?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  title = "Êtes-vous sûr ?",
  description = "Cette action est irréversible."
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={loading}>
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );
}; 
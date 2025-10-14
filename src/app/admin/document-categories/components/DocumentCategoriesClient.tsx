'use client';

import { useState, useEffect, FormEvent, useCallback } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { DataTable } from '@/components/ui/data-table';
import { columns, type DocumentCategoryColumn } from './columns';
import { useToast } from '@/components/ui/use-toast';
import { AlertModal } from '@/components/modals/alert-modal';
import FormInput from '@/components/ui/FormInput'; // Assurez-vous que le chemin est correct

interface DocumentCategorieFromAPI {
  id: string;
  nom: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  nom: string;
}

export default function DocumentCategoriesClient() {
  const { toast } = useToast();
  
  const [categories, setCategories] = useState<DocumentCategoryColumn[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategoryColumn | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({ nom: '' });
  
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DocumentCategoryColumn | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/document-categories');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch categories');
      }
      const data: DocumentCategorieFromAPI[] = await response.json();
      setCategories(data.map(item => ({
        id: item.id,
        nom: item.nom,
        createdAt: new Date(item.createdAt).toLocaleDateString(),
      })));
    } catch (error: unknown) {
      console.error("Error fetching categories:", error);
      const message = error instanceof Error ? error.message : "Impossible de charger les catégories.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message,
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormData({ nom: '' });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (category: DocumentCategoryColumn) => {
    setEditingCategory(category);
    setFormData({ nom: category.nom });
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (category: DocumentCategoryColumn) => {
    setCategoryToDelete(category);
    setDeleteModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    const url = editingCategory ? `/api/document-categories/${editingCategory.id}` : '/api/document-categories';
    const method = editingCategory ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Erreur lors de ${editingCategory ? 'la mise à jour' : 'la création'}`);
      }

      const savedCategory: DocumentCategorieFromAPI = await response.json();
      
      toast({
        title: editingCategory ? 'Catégorie mise à jour' : 'Catégorie créée',
        description: `La catégorie "${savedCategory.nom}" a été ${editingCategory ? 'mise à jour' : 'créée'} avec succès.`,
        variant: 'success' // Assurez-vous que votre composant Toast supporte cette variante
      });
      
      fetchCategories(); // Re-fetch pour mettre à jour la liste
      setIsModalOpen(false);
      resetForm();
      setEditingCategory(null);
    } catch (error: unknown) {
      console.error("Submit error:", error);
      const message = error instanceof Error ? error.message : "Une erreur est survenue.";
      toast({
        variant: "destructive",
        title: "Erreur",
        description: message,
      });
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/document-categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Spécificité de l'API DELETE qui renvoie un message dans le corps en cas d'erreur 400
        if (response.status === 400 && errorData.message) {
          throw new Error(errorData.message);
        } else {
         throw new Error(errorData.error || 'Erreur lors de la suppression');
        }
      }
      toast({
        title: "Catégorie supprimée",
        description: `La catégorie "${categoryToDelete.nom}" a été supprimée avec succès.`,
        variant: 'success'
      });
      fetchCategories();
    } catch (error: unknown) {
      console.error("Delete error:", error);
      const message = error instanceof Error ? error.message : "Impossible de supprimer la catégorie.";
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description: message,
      });
    }
    setLoading(false);
    setDeleteModalOpen(false);
    setCategoryToDelete(null);
  };
  
  // Passer les fonctions aux colonnes
  const categoryColumns = columns(handleOpenEditModal, handleOpenDeleteModal);

  return (
    <>
      <AlertModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        loading={loading}
        title={`Supprimer la catégorie "${categoryToDelete?.nom}" ?`}
        description="Cette action est irréversible. Tous les documents associés à cette catégorie perdront leur catégorisation."
      />

      {isModalOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md">
            <form onSubmit={handleSubmit}>
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
                {editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}
              </h3>
              <FormInput
                name="nom"
                value={formData.nom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Nom de la catégorie"
                required
                className="mb-4"
                disabled={loading}
              />
              {/* Afficher les erreurs de l'API ici si nécessaire */}
              <div className="flex justify-end space-x-3">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={loading}>
                  Annuler
                </Button>
                <Button type="submit" isLoading={loading} disabled={loading || !formData.nom.trim()}>
                  {editingCategory ? 'Mettre à jour' : 'Ajouter'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end mb-4">
        <Button onClick={handleOpenAddModal}>
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" /> 
          Ajouter une catégorie
        </Button>
      </div>
      <DataTable columns={categoryColumns} data={categories} loading={loading} enableColumnFilters={true} />
    </>
  );
} 
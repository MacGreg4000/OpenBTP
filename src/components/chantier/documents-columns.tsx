'use client'

import { ColumnDef, Row, Column } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { EyeIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { Checkbox } from "@/components/ui/checkbox"

// Le type ColumnDefWithFilter vient implicitement de data-table.tsx 
// mais pour être explicite, on pourrait le définir ici aussi ou l'importer.
// Pour l'instant, on assume qu'il est correctement appliqué par DataTable.

interface FilterMeta {
  filterType?: 'input' | 'select';
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
}

// Type basé sur DocumentToDisplay de DocumentsContent.tsx
// S'assurer que les champs ici correspondent à ceux disponibles sur DocumentToDisplay
export type DocumentColumn = {
  id: string;
  nom: string;
  type: string; // Ce champ sera utilisé pour le filtre de type
  url: string;
  createdAt: string; // Sera formatée
  estPlan?: boolean;
  uploaderName?: string | null;
  // Les fonctions ne sont plus sur le type, elles sont passées à getDocumentColumns
}

// Actions de cellule spécifiques
interface CellActionsProps {
  row: Row<DocumentColumn>; // Type corrigé
  // Passer les fonctions directement si elles ne sont pas sur DocumentColumn
  onDelete: (docId: string) => void;
  onPreview: (url: string) => void;
}

const CellActions: React.FC<CellActionsProps> = ({ 
  row, 
  onDelete,
  onPreview
}) => {
  const document = row.original as DocumentColumn;

  return (
    <div className="flex items-center justify-end space-x-2">
      <Button
        variant="outline"
        className="h-8 w-8 p-0"
        onClick={() => onPreview(document.url)}
        title="Aperçu"
      >
        <EyeIcon className="h-4 w-4" style={{ color: 'green' }} />
      </Button>
      <Button
        variant="outline"
        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-600"
        onClick={() => onDelete(document.id)}
        title="Supprimer"
      >
        <TrashIcon className="h-4 w-4" style={{ color: 'red' }} />
      </Button>
    </div>
  )
}


export const getDocumentColumns = (
  onDelete: (docId: string) => void,
  onToggleEstPlan: (docId: string, currentEstPlan?: boolean) => void,
  onPreview: (url: string) => void,
  // Nouvelles options pour les filtres Select
  typeOptions: { value: string; label: string }[] 
): ColumnDef<DocumentColumn>[] => [
  {
    accessorKey: "nom",
    header: ({ column }: { column: Column<DocumentColumn, unknown> }) => (
      <Button 
        variant="outline"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Nom <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: { row: Row<DocumentColumn> }) => (
      <a href={row.original.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline" title={row.original.nom}>
        {row.original.nom}
      </a>
    ),
    meta: {
      filterType: 'input',
      filterPlaceholder: 'Filtrer par nom...'
    } as FilterMeta // Cast pour TypeScript
  },
  {
    accessorKey: "type",
     header: "Type",
     filterFn: (row: Row<DocumentColumn>, id: string, value: string[]) => value.includes(row.getValue(id) as string),
    meta: {
      filterType: 'select',
      filterOptions: typeOptions,
      filterPlaceholder: 'Filtrer par type'
    } as FilterMeta
  },
  {
    accessorKey: "uploaderName",
    header: "Ajouté par",
    cell: ({ row }: { row: Row<DocumentColumn> }) => row.original.uploaderName || "N/A",
    meta: {
      filterType: 'input',
      filterPlaceholder: 'Filtrer par uploader...'
    } as FilterMeta
  },
  {
    accessorKey: "createdAt",
    header: ({ column }: { column: Column<DocumentColumn, unknown> }) => (
      <Button 
        variant="outline"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }: { row: Row<DocumentColumn> }) => new Date(row.original.createdAt).toLocaleDateString(),
    // Pas de filtre pour la date pour l'instant, pourrait être un date picker
  },
  {
    accessorKey: "estPlan",
    header: "Plan?",
    cell: ({ row }: { row: Row<DocumentColumn> }) => {
      const doc = row.original as DocumentColumn;
      const isImage = doc.url.match(/\.(jpeg|jpg|gif|png)$/i);
      return (
        <Checkbox
          checked={!!doc.estPlan}
          onCheckedChange={(checked: boolean | 'indeterminate') => {
            onToggleEstPlan(doc.id, typeof checked === 'boolean' ? checked : undefined);
          }}
          disabled={!isImage}
          aria-label={!isImage ? "Seuls les images peuvent être des plans" : "Marquer comme plan"}
          title={!isImage ? "Seuls les fichiers JPG et PNG peuvent être des plans interactifs" : "Marquer comme plan"}
        />
      )
    },
    // Pas de filtre direct pour boolean pour l'instant, pourrait être un select (Oui/Non/Tous)
  },
  {
    id: "actions",
    header: () => <div className="text-right">Actions</div>,
    cell: ({ row }: { row: Row<DocumentColumn> }) => ( <CellActions row={row} onDelete={onDelete} onPreview={onPreview} /> ),
    meta: {
      filterType: undefined // Pas de filtre pour la colonne actions
    } as FilterMeta
  },
] 
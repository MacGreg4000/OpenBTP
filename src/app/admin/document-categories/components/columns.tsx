'use client'

import { ColumnDef, Column, Row } from '@tanstack/react-table'
import { ArrowsUpDownIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowUpDown } from 'lucide-react'

// Ce type est utilisé pour typer les données de notre table
export type DocumentCategoryColumn = {
  id: string
  nom: string
  createdAt: string // Formatée en string pour l'affichage
}

interface CellActionsProps {
  data: DocumentCategoryColumn;
  onEdit: (category: DocumentCategoryColumn) => void;
  onDelete: (category: DocumentCategoryColumn) => void;
}

const CellActions: React.FC<CellActionsProps> = ({ data, onEdit, onDelete }) => {
  

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Ouvrir le menu"
          variant="outline"
          size="sm"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onEdit(data)}>
          <PencilIcon className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(data)} className="text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-900/50">
          <TrashIcon className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns = (
    onEdit: (category: DocumentCategoryColumn) => void, 
    onDelete: (category: DocumentCategoryColumn) => void
  ): ColumnDef<DocumentCategoryColumn>[] => [
  {
    accessorKey: "nom",
    header: ({ column }: { column: Column<DocumentCategoryColumn, unknown> }) => {
      return (
        <Button
          variant="outline"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Nom
          <ArrowsUpDownIcon className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date de création",
  },
  {
    id: "actions",
    cell: ({ row }: { row: Row<DocumentCategoryColumn> }) => {
      const category = row.original
      return <CellActions data={category} onEdit={onEdit} onDelete={onDelete} />
    },
    enableSorting: false,
    enableHiding: false,
  },
] 
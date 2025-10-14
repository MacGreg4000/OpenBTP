'use client'

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnFiltersState,
  Column,
  HeaderGroup,
  Header,
  Row,
  Cell
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table" // Assurez-vous que ce chemin est correct ou créez ce composant

import Button from "@/components/ui/Button"
import FormInput from "@/components/ui/FormInput" // Assurez-vous que ce chemin est correct ou créez ce composant
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select" // Pour les filtres Select

// Étendre ColumnDef pour inclure les meta-données de filtre
interface FilterMeta {
  filterType?: 'input' | 'select';
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
}

// Utiliser une intersection de types pour ajouter `meta` à `ColumnDef`
// Cela peut être plus propre en utilisant la déclaration merging de TypeScript si c'est un module
type ColumnDefWithFilter<TData, TValue> = ColumnDef<TData, TValue> & {
  meta?: FilterMeta;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDefWithFilter<TData, TValue>[] // Utiliser le type étendu
  data: TData[]
  loading?: boolean
  enableColumnFilters?: boolean // Nouvelle prop
}

// Composant de filtre générique
function ColumnFilter<TData, TValue>({ column }: { column: Column<TData, TValue> }) {
  const filterMeta = column.columnDef.meta as FilterMeta | undefined;
  const filterValue = column.getFilterValue();

  if (!filterMeta || !filterMeta.filterType) {
    return null; // Pas de filtre défini pour cette colonne
  }

  if (filterMeta.filterType === 'input') {
    return (
      <FormInput
        type="text"
        value={(filterValue as string) ?? ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => column.setFilterValue(e.target.value)}
        placeholder={filterMeta.filterPlaceholder || `Filtrer...`}
        className="w-full h-8 text-xs"
      />
    );
  }

  if (filterMeta.filterType === 'select' && filterMeta.filterOptions) {
    return (
      <Select
        value={(filterValue as string) ?? ''}
        onValueChange={(value: string) => column.setFilterValue(value === 'all' ? '' : value)} // 'all' pour vider le filtre
      >
        <SelectTrigger className="w-full h-8 text-xs">
          <SelectValue placeholder={filterMeta.filterPlaceholder || "Tous"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          {filterMeta.filterOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return null;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  enableColumnFilters,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    // Fournir une valeur par défaut pour meta si nécessaire ou s'assurer que toutes les colonnes l'ont
    defaultColumn: {
      meta: undefined, // Ou un objet FilterMeta par défaut
    }
  })

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header: Header<TData, unknown>) => (
                  <TableHead key={header.id} style={{width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            {/* Nouvelle ligne pour les filtres de colonne */} 
            {enableColumnFilters && (
              <TableRow>
                {table.getHeaderGroups().map((headerGroup: HeaderGroup<TData>) => 
                  headerGroup.headers.map((header: Header<TData, unknown>) => (
                    <TableHead key={`${header.id}-filter`} className="p-1">
                      {header.column.getCanFilter() ? (
                        <ColumnFilter column={header.column} />
                      ) : null}
                    </TableHead>
                  ))
                )}
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row: Row<TData>) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell: Cell<TData, unknown>) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Aucun résultat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  )
} 
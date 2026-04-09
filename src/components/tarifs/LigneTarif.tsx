'use client'

import { useRef, useEffect } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { BarsArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline'
import NumericInput from '@/components/ui/NumericInput'

export interface LigneTarifData {
  id: string
  type: 'TITRE' | 'SOUS_TITRE' | 'LIGNE'
  article?: string | null
  descriptif: string
  unite?: string | null
  prixUnitaire?: number | null
  remarques?: string | null
}

interface LigneTarifProps extends LigneTarifData {
  index: number
  moveLigne: (dragIndex: number, hoverIndex: number) => void
  updateLigne: (id: string, field: string, value: string | number | null) => void
  deleteLigne: (id: string) => void
}

interface DragItem {
  index: number
  id: string
  type: string
}

export default function LigneTarif({
  id,
  index,
  type,
  article,
  descriptif,
  unite,
  prixUnitaire,
  remarques,
  moveLigne,
  updateLigne,
  deleteLigne,
}: LigneTarifProps) {
  const ref = useRef<HTMLTableRowElement>(null)
  const dragIconRef = useRef<HTMLDivElement>(null)
  const descriptifRef = useRef<HTMLTextAreaElement>(null)
  const remarquesRef = useRef<HTMLTextAreaElement>(null)
  const isSectionHeader = type === 'TITRE' || type === 'SOUS_TITRE'

  useEffect(() => {
    for (const el of [descriptifRef.current, remarquesRef.current]) {
      if (el) {
        el.style.height = 'auto'
        el.style.height = el.scrollHeight + 'px'
      }
    }
  }, [descriptif, remarques])

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: unknown }>({
    accept: 'ligne-tarif',
    collect: (monitor) => ({ handlerId: monitor.getHandlerId() }),
    hover(item, monitor) {
      if (!ref.current) return
      const dragIndex = item.index
      const hoverIndex = index
      if (dragIndex === hoverIndex) return
      const rect = ref.current.getBoundingClientRect()
      const midY = (rect.bottom - rect.top) / 2
      const clientY = monitor.getClientOffset()!.y - rect.top
      if (dragIndex < hoverIndex && clientY < midY) return
      if (dragIndex > hoverIndex && clientY > midY) return
      moveLigne(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'ligne-tarif',
    item: () => ({ id, index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  })

  drag(dragIconRef)
  drop(ref)

  const rowBg = isSectionHeader
    ? type === 'TITRE'
      ? 'bg-amber-50/70 dark:bg-amber-900/20'
      : 'bg-gray-100/60 dark:bg-gray-800/40'
    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'

  const inputClass =
    'w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-amber-500 dark:focus:border-amber-400 focus:ring-1 focus:ring-amber-200 dark:focus:ring-amber-800 transition-colors'

  return (
    <tr
      ref={ref}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      data-handler-id={handlerId}
      className={`border-b border-gray-100 dark:border-gray-700/50 ${rowBg}`}
    >
      {/* Drag handle */}
      <td className="px-2 py-2 w-8 align-top">
        <div
          ref={dragIconRef}
          className="flex items-center justify-center cursor-move hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-1 transition-colors mt-1"
          title="Réorganiser"
        >
          <BarsArrowUpIcon className={`h-4 w-4 ${isSectionHeader ? 'text-amber-500' : 'text-gray-400'}`} />
        </div>
      </td>

      {/* Article */}
      <td className="px-2 py-2 w-28 align-top">
        {isSectionHeader ? (
          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
            type === 'TITRE'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {type === 'TITRE' ? 'Titre' : 'Sous-titre'}
          </span>
        ) : (
          <input
            type="text"
            value={article ?? ''}
            onChange={(e) => updateLigne(id, 'article', e.target.value || null)}
            placeholder="REF-001"
            className={inputClass}
          />
        )}
      </td>

      {/* Descriptif */}
      <td className="px-2 py-2 align-top min-w-[200px]">
        {isSectionHeader ? (
          <input
            type="text"
            value={descriptif}
            onChange={(e) => updateLigne(id, 'descriptif', e.target.value)}
            placeholder={type === 'TITRE' ? 'Titre de section' : 'Sous-titre de section'}
            className={`w-full px-2 py-1.5 text-sm font-semibold bg-transparent border-transparent focus:outline-none ${
              type === 'TITRE' ? 'text-amber-800 dark:text-amber-300 text-base' : 'text-gray-700 dark:text-gray-300'
            }`}
          />
        ) : (
          <textarea
            ref={descriptifRef}
            rows={1}
            value={descriptif}
            onChange={(e) => {
              updateLigne(id, 'descriptif', e.target.value)
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
            placeholder="Description du travail"
            className={`${inputClass} resize-none overflow-hidden`}
            style={{ minHeight: '2.25rem' }}
          />
        )}
      </td>

      {/* Unité */}
      <td className="px-2 py-2 w-24 align-top">
        {isSectionHeader ? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ) : (
          <input
            type="text"
            value={unite ?? ''}
            onChange={(e) => updateLigne(id, 'unite', e.target.value || null)}
            placeholder="M², Ml…"
            className={inputClass}
          />
        )}
      </td>

      {/* Prix unitaire */}
      <td className="px-2 py-2 w-32 align-top">
        {isSectionHeader ? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ) : (
          <NumericInput
            value={prixUnitaire ?? 0}
            onChangeNumber={(val) => updateLigne(id, 'prixUnitaire', isNaN(val) ? null : val)}
            step="0.01"
            min="0"
            placeholder="0.00"
            className={inputClass}
          />
        )}
      </td>

      {/* Remarques */}
      <td className="px-2 py-2 align-top min-w-[150px]">
        {isSectionHeader ? (
          <span className="text-gray-300 dark:text-gray-600">—</span>
        ) : (
          <textarea
            ref={remarquesRef}
            rows={1}
            value={remarques ?? ''}
            onChange={(e) => {
              updateLigne(id, 'remarques', e.target.value || null)
              const t = e.target as HTMLTextAreaElement
              t.style.height = 'auto'
              t.style.height = t.scrollHeight + 'px'
            }}
            placeholder="Conditions, précisions…"
            className={`${inputClass} resize-none overflow-hidden`}
            style={{ minHeight: '2.25rem' }}
          />
        )}
      </td>

      {/* Supprimer */}
      <td className="px-2 py-2 w-10 align-top text-center">
        <button
          type="button"
          onClick={() => deleteLigne(id)}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-300 mt-1 transition-colors"
          title="Supprimer"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

'use client'

import { useRef, useEffect } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { BarsArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline'
import NumericInput from '@/components/ui/NumericInput'

interface LigneCommandeProps {
  id: number
  index: number
  article: string
  description: string
  type: string
  unite: string
  prixUnitaire: number
  quantite: number
  total: number
  estOption: boolean
  isLocked?: boolean
  moveLigne: (dragIndex: number, hoverIndex: number) => void
  updateLigne: (id: number, field: string, value: string | number | boolean) => void
  deleteLigne: (id: number) => void
}

interface DragItem {
  index: number
  id: number
  type: string
}

export default function LigneCommande({
  id,
  index,
  article,
  description,
  type,
  unite,
  prixUnitaire,
  quantite,
  total,
  estOption,
  isLocked = false,
  moveLigne,
  updateLigne,
  deleteLigne
}: LigneCommandeProps) {
  const ref = useRef<HTMLTableRowElement>(null)
  const dragIconRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isSectionHeader = type === 'TITRE' || type === 'SOUS_TITRE'
  const sectionLabel = type === 'TITRE' ? 'Titre' : 'Sous-titre'

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && !isSectionHeader && !isLocked) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [description, isSectionHeader, isLocked])

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: unknown }>({
    accept: 'ligne',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item, monitor) {
      if (!ref.current) {
        return
      }
      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) {
        return
      }

      const hoverBoundingRect = ref.current?.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return
      }

      moveLigne(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const [{ isDragging }, drag] = useDrag({
    type: 'ligne',
    item: () => {
      return { id, index }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const opacity = isDragging ? 0.5 : 1
  drag(dragIconRef)
  drop(ref)

  return (
    <tr
      ref={ref}
      style={{ opacity }}
      data-handler-id={handlerId}
      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isSectionHeader ? (type === 'TITRE' ? 'bg-blue-50/60 dark:bg-blue-900/30' : 'bg-gray-100/60 dark:bg-gray-800/40') : ''}`}
    >
      <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap align-top w-8">
        <div
          ref={dragIconRef}
          className="inline-flex items-center justify-center cursor-move hover:bg-gray-200 dark:hover:bg-gray-600 rounded p-1 transition-colors"
          title="Glisser pour réorganiser"
        >
          <BarsArrowUpIcon className={`h-5 w-5 ${isSectionHeader ? 'text-blue-500 dark:text-blue-300' : 'text-gray-400'}`} />
        </div>
      </td>
      <td className="hidden sm:table-cell px-3 py-2 whitespace-nowrap align-top w-32">
        {isSectionHeader ? (
          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200 bg-blue-100/70 dark:bg-blue-900/40 rounded">
            {sectionLabel}
          </span>
        ) : (
          <input
            type="text"
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
            value={article}
            onChange={(e) => updateLigne(id, 'article', e.target.value)}
            disabled={isLocked}
          />
        )}
      </td>
      <td className="px-3 py-2 align-top min-w-[200px] max-w-[300px]">
        {isLocked ? (
          <div className="w-full px-2 py-1.5 text-sm md:text-base text-gray-900 dark:text-gray-100 whitespace-normal break-words">
            {description}
          </div>
        ) : isSectionHeader ? (
          <input
            type="text"
            className="w-full px-2 py-1.5 text-sm md:text-base border-transparent bg-transparent text-blue-900 dark:text-blue-50 font-semibold text-base md:text-lg focus:outline-none"
            value={description}
            onChange={(e) => updateLigne(id, 'description', e.target.value)}
            placeholder={type === 'TITRE' ? 'Titre de section' : 'Sous-titre de section'}
          />
        ) : (
          <textarea
            ref={textareaRef}
            rows={1}
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 resize-none overflow-hidden transition-colors"
            value={description}
            onChange={(e) => {
              updateLigne(id, 'description', e.target.value);
              // Auto-resize textarea
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = target.scrollHeight + 'px';
            }}
            placeholder="Description"
            style={{ minHeight: '2.5rem' }}
          />
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap align-top w-24">
        {isSectionHeader ? (
          <span className="inline-flex px-2 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200">
            {sectionLabel}
          </span>
        ) : (
          <select
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
            value={type}
            onChange={(e) => updateLigne(id, 'type', e.target.value)}
            disabled={isLocked}
          >
            <option value="QP">QP</option>
            <option value="QF">QF</option>
            <option value="Forfait">Forfait</option>
          </select>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap align-top w-32">
        {isSectionHeader ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        ) : (
          <select
            name={`ligne-${id}-unite`}
            value={unite}
            onChange={(e) => updateLigne(id, 'unite', e.target.value)}
            disabled={isLocked}
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
          >
            <option value="Mct">Mct</option>
            <option value="M2">M²</option>
            <option value="M3">M³</option>
            <option value="Heures">Heures</option>
            <option value="Pièces">Pièces</option>
            <option value="Fft">Forfait</option>
          </select>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap align-top w-36">
        {isSectionHeader ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        ) : (
          <NumericInput
            value={isNaN(quantite) ? 0 : quantite}
            onChangeNumber={(val)=> updateLigne(id, 'quantite', isNaN(val) ? 0 : val)}
            step="0.01"
            min="0"
            disabled={isLocked}
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
          />
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap align-top w-44">
        {isSectionHeader ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        ) : (
          <NumericInput
            value={isNaN(prixUnitaire) ? 0 : prixUnitaire}
            onChangeNumber={(val)=> updateLigne(id, 'prixUnitaire', isNaN(val) ? 0 : val)}
            step="0.01"
            min="0"
            disabled={isLocked}
            className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus-border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
          />
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right align-top w-32">
        {isSectionHeader ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        ) : (
          <span className="font-semibold text-gray-900 dark:text-gray-100">{total.toFixed(2)} €</span>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-center align-top w-12">
        {isSectionHeader ? (
          <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
        ) : (
          <input
            type="checkbox"
            className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
            checked={estOption}
            onChange={(e) => updateLigne(id, 'estOption', e.target.checked)}
            disabled={isLocked}
          />
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-center align-top w-12">
        <button
          type="button"
          onClick={() => deleteLigne(id)}
          disabled={isLocked}
          className={`text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </td>
    </tr>
  )
} 
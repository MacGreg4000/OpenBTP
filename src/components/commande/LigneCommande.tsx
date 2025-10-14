'use client'

import { useRef } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { BarsArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline'
import SelectField from '@/components/ui/SelectField'
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

  const opacity = isDragging ? 0 : 1
  drag(drop(ref))

  return (
    <tr ref={ref} style={{ opacity }} data-handler-id={handlerId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
      <td className="px-3 py-2 whitespace-nowrap cursor-move">
        <BarsArrowUpIcon className="h-5 w-5 text-gray-400" />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="text"
          className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
          value={article}
          onChange={(e) => updateLigne(id, 'article', e.target.value)}
          disabled={isLocked}
          style={{ maxWidth: '100px' }}
        />
      </td>
      <td className="px-3 py-2">
        <input
          type="text"
          className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
          value={description}
          onChange={(e) => updateLigne(id, 'description', e.target.value)}
          disabled={isLocked}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
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
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <SelectField
          label=""
          name={`lignes[${index}].unite`}
          value={unite}
          onChange={(e) => updateLigne(id, 'unite', e.target.value)}
          className="w-full"
        >
          <option value="Mct">Mct</option>
          <option value="M2">M²</option>
          <option value="M3">M³</option>
          <option value="Heures">Heures</option>
          <option value="Pièces">Pièces</option>
        </SelectField>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <NumericInput
          value={isNaN(quantite) ? 0 : quantite}
          onChangeNumber={(val)=> updateLigne(id, 'quantite', isNaN(val) ? 0 : val)}
          step="0.01"
          min="0"
          disabled={isLocked}
          className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <NumericInput
          value={isNaN(prixUnitaire) ? 0 : prixUnitaire}
          onChangeNumber={(val)=> updateLigne(id, 'prixUnitaire', isNaN(val) ? 0 : val)}
          step="0.01"
          min="0"
          disabled={isLocked}
          className="w-full px-2 py-1.5 text-sm md:text-base border-2 border-gray-300 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:text-gray-700 dark:disabled:text-gray-200 disabled:border-gray-300 dark:disabled:border-gray-500 transition-colors"
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
        <span className="font-semibold text-gray-900 dark:text-gray-100">{total.toFixed(2)} €</span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <input
          type="checkbox"
          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 dark:border-gray-600 dark:bg-gray-700 disabled:opacity-50"
          checked={estOption}
          onChange={(e) => updateLigne(id, 'estOption', e.target.checked)}
          disabled={isLocked}
        />
      </td>
      <td className="px-3 py-2 whitespace-nowrap text-right">
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
import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface CollapsibleSectionProps {
  title: string
  icon?: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <div className="flex items-center">
          <span className="mr-2">{icon}</span>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
        </div>
        {isOpen ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      )}
    </div>
  )
} 
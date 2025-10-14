'use client'
import { useState } from 'react'
import SelectField from '@/components/ui/SelectField'

export type ChantierStatus = 'En préparation' | 'En cours' | 'Terminé'

const STATUS_COLORS = {
  'En préparation': 'bg-yellow-100 text-yellow-800',
  'En cours': 'bg-green-100 text-green-800',
  'Terminé': 'bg-gray-100 text-gray-800'
}

interface ChantierStatusProps {
  status: ChantierStatus
  chantierId: string
  onStatusChange?: (newStatus: ChantierStatus) => void
  className?: string
}

export default function ChantierStatus({ status, chantierId, onStatusChange, className = '' }: ChantierStatusProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: ChantierStatus) => {
    if (newStatus === status) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/chantiers/${chantierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etatChantier: newStatus })
      })

      if (!res.ok) throw new Error('Erreur lors de la mise à jour')
      
      onStatusChange?.(newStatus)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div className="flex items-center">
        <SelectField
          label=""
          value={status}
          onChange={(e) => handleStatusChange(e.target.value as ChantierStatus)}
          className="text-sm rounded-md"
        >
          <option value="En préparation">En préparation</option>
          <option value="En cours">En cours</option>
          <option value="Terminé">Terminé</option>
        </SelectField>
        
        {loading && <span className="ml-2 text-sm text-gray-500">Enregistrement...</span>}
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status]} ${className}`}
    >
      {status}
    </button>
  )
} 
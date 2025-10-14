'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Chantier {
  id: number
  chantierId: string
  nomChantier: string
}

export default function DebugPage() {
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  const [currentId, setCurrentId] = useState('38590233-cade-4e5c-8940-f16c7de33921')

  useEffect(() => {
    fetch('/api/chantiers')
      .then(res => res.json())
      .then(json => Array.isArray(json) ? json : json.data)
      .then(setChantiers)
      .catch(console.error)
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Debug Chantiers</h1>

      {/* Table des chantiers existants */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Chantiers dans la base de données</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID (numérique)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UUID (chantierId)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chantiers.map(chantier => (
              <tr key={chantier.id}>
                <td className="px-6 py-4 whitespace-nowrap">{chantier.id}</td>
                <td className="px-6 py-4">{chantier.chantierId}</td>
                <td className="px-6 py-4">{chantier.nomChantier}</td>
                <td className="px-6 py-4">
                  <Link 
                    href={`/chantiers/${chantier.chantierId}/etats`}
                    className="text-blue-600 hover:underline"
                  >
                    Accéder aux états
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Test avec ID personnalisé */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Test avec ID personnalisé</h2>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            value={currentId}
            onChange={(e) => setCurrentId(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Entrez un ID à tester..."
          />
          <Link
            href={`/chantiers/${currentId}/etats`}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Tester cet ID
          </Link>
        </div>
      </div>

      {/* ID correct à utiliser */}
      <div className="bg-green-50 border border-green-200 rounded p-4">
        <h2 className="text-lg font-bold text-green-800 mb-2">ID correct à utiliser</h2>
        <p className="font-mono bg-white p-2 rounded">
          {chantiers[0]?.chantierId || 'Chargement...'}
        </p>
      </div>
    </div>
  )
} 
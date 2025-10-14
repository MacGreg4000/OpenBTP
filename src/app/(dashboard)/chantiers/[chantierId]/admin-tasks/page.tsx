'use client'
import { use } from 'react';
import Link from 'next/link'
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { AdminTasksContent } from '@/components/chantier/AdminTasksContent'
import { DocumentExpirationAlert } from '@/components/DocumentExpirationAlert'

export default function ChantierAdminTasksPage(
  props: { 
    params: Promise<{ chantierId: string }> 
  }
) {
  const params = use(props.params);
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentExpirationAlert />
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tâches administratives</h1>
        <div className="flex space-x-3">
          <Link
            href={`/bons-regie`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
          >
            <ClipboardDocumentListIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Bons de régie
          </Link>
        </div>
      </div>
      <AdminTasksContent chantierId={params.chantierId} />
    </div>
  )
} 
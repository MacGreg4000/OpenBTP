'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { BuildingOfficeIcon, ClipboardDocumentListIcon, ChatBubbleLeftRightIcon, ShieldCheckIcon, ArrowTopRightOnSquareIcon, CheckCircleIcon, XCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import DocumentManager from '@/components/documents/DocumentManager'
import AdminTaskTypesManager from '@/components/configuration/AdminTaskTypesManager'
import { usePermission } from '@/hooks/usePermission'

interface CompanySettings {
  name: string
  address: string
  zipCode: string
  city: string
  phone: string
  email: string
  iban: string
  tva: string
  logo: string // URL du logo stocké
  emailHost: string
  emailPort: string
  emailSecure: boolean
  emailUser: string
  emailPassword: string
  emailFrom: string
  emailFromName: string
}

export default function ConfigurationPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const isRAGAdmin = usePermission('rag_admin')
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    address: '',
    zipCode: '',
    city: '',
    phone: '',
    email: '',
    iban: '',
    tva: '',
    logo: '',
    emailHost: '',
    emailPort: '',
    emailSecure: false,
    emailUser: '',
    emailPassword: '',
    emailFrom: '',
    emailFromName: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [smtpTestLoading, setSmtpTestLoading] = useState(false)
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null)

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (session && session.user && session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      router.push('/')
      return
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          // S'assurer que toutes les valeurs sont des chaînes vides au lieu de null
          const sanitizedData = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key, value === null ? '' : value])
          ) as unknown as CompanySettings
          setSettings(sanitizedData)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [router, session, status])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('logo', file)

    try {
      const res = await fetch('/api/settings/logo', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const { url } = await res.json()
        setSettings(prev => ({ ...prev, logo: url }))
      }
    } catch (error) {
      console.error('Erreur upload logo:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        setMessage('Configuration enregistrée')
        setTimeout(() => setMessage(''), 2000)
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessage('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const testSMTPConnection = async () => {
    setSmtpTestLoading(true)
    setSmtpTestResult(null)

    try {
      const response = await fetch('/api/settings/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailHost: settings.emailHost,
          emailPort: settings.emailPort,
          emailSecure: settings.emailSecure,
          emailUser: settings.emailUser,
          emailPassword: settings.emailPassword,
          emailFrom: settings.emailFrom
        })
      })

      const result = await response.json()

      if (result.success) {
        setSmtpTestResult({
          success: true,
          message: result.message,
          details: result.details
        })
      } else {
        setSmtpTestResult({
          success: false,
          message: result.error,
          details: result.details
        })
      }
    } catch {
      setSmtpTestResult({
        success: false,
        message: 'Erreur lors du test de connexion',
        details: 'Vérifiez votre connexion internet'
      })
    } finally {
      setSmtpTestLoading(false)
    }
  }

  const handleRAGAdminClick = () => {
    router.push('/rag-admin')
  }

  const handleTemplatesContratsClick = () => {
    router.push('/admin/templates-contrats')
  }

  if (status === 'loading' || (!session && status !== 'unauthenticated')) {
    return <div className="p-8">Chargement...</div>
  }

  if (session && session.user && session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
    return <div className="p-8">Accès non autorisé.</div>
  }

  if (loading && (!session || (session.user.role === 'ADMIN' || session.user.role === 'MANAGER'))) {
    return <div className="p-8">Chargement de la configuration...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2 dark:text-white">
        <BuildingOfficeIcon className="h-8 w-8" />
        Configuration de l'entreprise
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nom de l'entreprise
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={e => setSettings(prev => ({ ...prev, name: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Logo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="mt-1 block w-full"
            />
            {settings.logo && (
              <>
              <img 
                src={settings.logo} 
                alt="Logo de l'entreprise" 
                className="mt-2 h-20 object-contain"
              />
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Adresse
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={e => setSettings(prev => ({ ...prev, address: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Code postal
              </label>
              <input
                type="text"
                value={settings.zipCode}
                onChange={e => setSettings(prev => ({ ...prev, zipCode: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Ville
              </label>
              <input
                type="text"
                value={settings.city}
                onChange={e => setSettings(prev => ({ ...prev, city: e.target.value }))}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Téléphone
            </label>
            <input
              type="tel"
              value={settings.phone}
              onChange={e => setSettings(prev => ({ ...prev, phone: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 form-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              value={settings.email}
              onChange={e => setSettings(prev => ({ ...prev, email: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              IBAN
            </label>
            <input
              type="text"
              value={settings.iban}
              onChange={e => setSettings(prev => ({ ...prev, iban: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="BE00 0000 0000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              N° TVA
            </label>
            <input
              type="text"
              value={settings.tva}
              onChange={e => setSettings(prev => ({ ...prev, tva: e.target.value }))}
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        {message && (
          <div className="mt-4 p-4 rounded bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2 dark:text-white">
        Configuration des emails
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Serveur SMTP
            </label>
            <input
              type="text"
              value={settings.emailHost}
              onChange={e => setSettings(prev => ({ ...prev, emailHost: e.target.value }))}
              placeholder="smtp.example.com"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Port SMTP
            </label>
            <input
              type="text"
              value={settings.emailPort}
              onChange={e => setSettings(prev => ({ ...prev, emailPort: e.target.value }))}
              placeholder="587"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Connexion sécurisée
            </label>
            <div className="mt-2">
              <label className="inline-flex items-center dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={settings.emailSecure}
                  onChange={e => setSettings(prev => ({ ...prev, emailSecure: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="ml-2">Utiliser SSL/TLS</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Utilisateur SMTP
            </label>
            <input
              type="text"
              value={settings.emailUser}
              onChange={e => setSettings(prev => ({ ...prev, emailUser: e.target.value }))}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mot de passe SMTP
            </label>
            <input
              type="password"
              value={settings.emailPassword}
              onChange={e => setSettings(prev => ({ ...prev, emailPassword: e.target.value }))}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email expéditeur
            </label>
            <input
              type="email"
              value={settings.emailFrom}
              onChange={e => setSettings(prev => ({ ...prev, emailFrom: e.target.value }))}
              placeholder="noreply@votreentreprise.com"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nom de l'expéditeur
            </label>
            <input
              type="text"
              value={settings.emailFromName}
              onChange={e => setSettings(prev => ({ ...prev, emailFromName: e.target.value }))}
              placeholder="Secotech"
              className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Bouton de test SMTP */}
          <div className="col-span-full">
            <button
              type="button"
              onClick={testSMTPConnection}
              disabled={smtpTestLoading || !settings.emailHost || !settings.emailPort || !settings.emailUser || !settings.emailPassword || !settings.emailFrom}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {smtpTestLoading ? (
                <>
                  <div className="animate-spin -ml-1 mr-3 h-4 w-4 text-white">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  Test en cours...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  Tester la connexion SMTP
                </>
              )}
            </button>

            {/* Affichage du résultat du test */}
            {smtpTestResult && (
              <div className={`mt-3 p-3 rounded-md ${
                smtpTestResult.success 
                  ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                  : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800'
              }`}>
                <div className="flex items-start">
                  {smtpTestResult.success ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-medium ${
                      smtpTestResult.success 
                        ? 'text-green-800 dark:text-green-200' 
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {smtpTestResult.message}
                    </p>
                    {smtpTestResult.details && (
                      <p className={`text-sm mt-1 ${
                        smtpTestResult.success 
                          ? 'text-green-600 dark:text-green-300' 
                          : 'text-red-600 dark:text-red-300'
                      }`}>
                        {smtpTestResult.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>

      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2 dark:text-white">
        Gestion des fiches techniques
      </h2>
      
      <DocumentManager />

      <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2 dark:text-white">
        <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
        Tâches administratives
      </h2>
      
      <AdminTaskTypesManager />

      {/* Section Administration RAG */}
      {isRAGAdmin && (
        <>
          <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2 dark:text-white">
            <ShieldCheckIcon className="h-5 w-5 text-amber-500" />
            Administration RAG
          </h2>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Outils d'administration pour le système RAG et l'assistant IA
            </p>
            
            <button
              onClick={handleRAGAdminClick}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200 group w-full"
            >
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg mr-3">
                  <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Administration RAG
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Gérer l'indexation des données et les conversations IA
                  </p>
                </div>
              </div>
              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
          </div>
        </>
      )}

      {/* Section Templates de Contrats */}
      {session?.user?.role === 'ADMIN' && (
        <>
          <h2 className="text-xl font-bold mt-12 mb-6 flex items-center gap-2 dark:text-white">
            <DocumentTextIcon className="h-5 w-5 text-green-500" />
            Templates de Contrats
          </h2>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Gérer les modèles de contrats de sous-traitance
            </p>
            
            <button
              onClick={handleTemplatesContratsClick}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 transition-all duration-200 group w-full"
            >
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg mr-3">
                  <DocumentTextIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-medium text-gray-900 dark:text-white">
                    Gestion des Templates
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Créer et modifier les modèles de contrats
                  </p>
                </div>
              </div>
              <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors" />
            </button>
          </div>
        </>
      )}
    </div>
  )
} 
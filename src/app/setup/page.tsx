'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import FormInput from '@/components/ui/FormInput'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Building, User } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)

  // État pour les informations de la société
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    zipCode: '',
    city: '',
    phone: '',
    email: '',
    tva: '',
    iban: ''
  })

  // État pour l'utilisateur administrateur
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    prenom: '',
    nom: ''
  })

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (adminData.password !== adminData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (adminData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          company: companyData,
          admin: adminData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la configuration')
      }

      setStep(3)
      setTimeout(() => {
        router.push('/login?message=setup-complete')
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erreur inattendue')
    } finally {
      setLoading(false)
    }
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="h-20 w-20 text-green-500 mx-auto animate-in fade-in zoom-in duration-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Configuration terminée !</h1>
              <p className="text-gray-600 mb-6 text-lg">
                Votre application est maintenant configurée et prête à être utilisée.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
                <span>Redirection automatique vers la page de connexion...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-3xl">
        {/* En-tête */}
        <div className="text-center mb-10">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg">
              <Building className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Configuration initiale</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Bienvenue ! Configurez votre application en quelques étapes simples.
        </p>
      </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-10">
          <div className={`flex items-center transition-all duration-300 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold transition-all duration-300 ${
              step >= 1 ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110' : 'border-gray-300 bg-white'
            }`}>1</div>
            <span className="ml-3 font-semibold text-base">Informations société</span>
                </div>
          <div className="h-1 w-20 mx-6 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 rounded-full ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
                </div>
          <div className={`flex items-center transition-all duration-300 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-10 w-10 flex items-center justify-center border-2 font-semibold transition-all duration-300 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white shadow-md scale-110' : 'border-gray-300 bg-white'
            }`}>2</div>
            <span className="ml-3 font-semibold text-base">Compte administrateur</span>
              </div>
            </div>

        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-lg shadow-sm">
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
                </div>
        )}

        {/* Étape 1: Informations de la société */}
        {step === 1 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-2xl">
                <div className="mr-3 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                Informations de votre société
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Ces informations apparaîtront dans vos documents et factures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="Nom de la société"
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Ex: Mon Entreprise SPRL"
                  />
                  <FormInput
                    label="Numéro TVA"
                    type="text"
                    value={companyData.tva}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, tva: e.target.value }))}
                    required
                    placeholder="Ex: BE 0123.456.789"
                  />
                </div>

                <FormInput
                  label="Adresse"
                  type="text"
                  value={companyData.address}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                  required
                  placeholder="Ex: Rue de l'Industrie 123"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="Code postal"
                    type="text"
                    value={companyData.zipCode}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, zipCode: e.target.value }))}
                    required
                    placeholder="Ex: 1000"
                  />
                  <FormInput
                    label="Ville"
                    type="text"
                    value={companyData.city}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, city: e.target.value }))}
                    required
                    placeholder="Ex: Bruxelles"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="Téléphone"
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                    placeholder="Ex: +32 2 123 45 67"
                  />
                  <FormInput
                    label="Email"
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, email: e.target.value }))}
                    required
                    placeholder="Ex: contact@monentreprise.be"
                  />
                </div>

                <FormInput
                  label="IBAN (optionnel)"
                  type="text"
                  value={companyData.iban}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder="Ex: BE12 3456 7890 1234"
                />

                <div className="pt-4">
                  <Button type="submit" fullWidth className="h-12 text-base font-semibold">
                  Continuer vers l&apos;étape 2
                </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Création de l'administrateur */}
        {step === 2 && (
          <Card className="shadow-xl border-0">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-2xl">
                <div className="mr-3 p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                Créer votre compte administrateur
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Ce compte vous permettra d&apos;accéder et de gérer l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <FormInput
                    label="Prénom"
                    type="text"
                    value={adminData.prenom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, prenom: e.target.value }))}
                    required
                    placeholder="Ex: Jean"
                  />
                  <FormInput
                    label="Nom"
                    type="text"
                    value={adminData.nom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, nom: e.target.value }))}
                    required
                    placeholder="Ex: Dupont"
                  />
                </div>

                <FormInput
                  label="Email de connexion"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="Ex: admin@monentreprise.be"
                />

                <FormInput
                  label="Mot de passe"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  placeholder="Au moins 8 caractères"
                />

                <FormInput
                  label="Confirmer le mot de passe"
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  placeholder="Répétez le mot de passe"
                />

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    fullWidth
                    className="h-12 text-base font-semibold"
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={loading}
                    fullWidth
                    className="h-12 text-base font-semibold"
                  >
                    {loading ? 'Configuration en cours...' : 'Terminer la configuration'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
} 
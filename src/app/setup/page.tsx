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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Configuration terminée !</h1>
              <p className="text-gray-600 mb-4">
                Votre application SecoTech est maintenant configurée et prête à être utilisée.
              </p>
              <p className="text-sm text-gray-500">
                Redirection automatique vers la page de connexion...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuration initiale</h1>
          <p className="text-gray-600">
            Bienvenue ! Configurons votre application SecoTech en quelques étapes.
        </p>
      </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center mb-8">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${
              step >= 1 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>1</div>
            <span className="ml-2 font-medium">Société</span>
                </div>
          <div className="h-1 w-16 mx-4 bg-gray-300">
            <div className={`h-full bg-blue-600 transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`}></div>
                </div>
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 ${
              step >= 2 ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300'
            }`}>2</div>
            <span className="ml-2 font-medium">Administrateur</span>
              </div>
            </div>

        {error && (
          <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-md">
            <p className="text-red-700">{error}</p>
                </div>
        )}

        {/* Étape 1: Informations de la société */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="h-5 w-5 mr-2" />
                Informations de votre société
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront dans vos documents et factures.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCompanySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Nom de la société"
                    type="text"
                    value={companyData.name}
                    onChange={(e) => setCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Ex: SecoTech SPRL"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    placeholder="Ex: contact@secotech.be"
                  />
                </div>

                <FormInput
                  label="IBAN"
                  type="text"
                  value={companyData.iban}
                  onChange={(e) => setCompanyData(prev => ({ ...prev, iban: e.target.value }))}
                  placeholder="Ex: BE12 3456 7890 1234"
                />

                <Button type="submit" fullWidth>
                  Continuer vers l&apos;étape 2
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Étape 2: Création de l'administrateur */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Créer votre compte administrateur
              </CardTitle>
              <CardDescription>
                Ce compte vous permettra d&apos;accéder et de gérer l&apos;application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Prénom"
                    type="text"
                    value={adminData.prenom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, prenom: e.target.value }))}
                    required
                    placeholder="Ex: Grégory"
                  />
                  <FormInput
                    label="Nom"
                    type="text"
                    value={adminData.nom}
                    onChange={(e) => setAdminData(prev => ({ ...prev, nom: e.target.value }))}
                    required
                    placeholder="Ex: Dubois"
                  />
                </div>

                <FormInput
                  label="Email de connexion"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  placeholder="Ex: admin@secotech.be"
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

                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    fullWidth
                  >
                    Retour
                  </Button>
                  <Button 
                    type="submit" 
                    isLoading={loading}
                    fullWidth
                  >
                    {loading ? 'Configuration...' : 'Terminer la configuration'}
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
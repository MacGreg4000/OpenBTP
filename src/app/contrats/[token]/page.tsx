'use client'
import { useState, useRef, useEffect, use } from 'react';
import type { ComponentType, Ref, CanvasHTMLAttributes } from 'react'
// import { useRouter } from 'next/navigation'
// ce module n'a pas de types, on l'importe en any contrôlé
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import SignatureCanvas from 'react-signature-canvas'

interface SignatureCanvasRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type: string, options?: object) => string;
}

interface ContratData {
  id: string
  soustraitantId: string
  url: string
  dateGeneration: string
  estSigne: boolean
  soustraitant: {
    nom: string
    email: string
    contact: string | null
  }
}

// Composant typé pour éviter l'usage de any sur le ref
const TypedSignatureCanvas = SignatureCanvas as unknown as ComponentType<{
  ref: Ref<SignatureCanvasRef | null>
  canvasProps?: CanvasHTMLAttributes<HTMLCanvasElement>
}>

export default function SignerContratPage(props: { params: Promise<{ token: string }> }) {
  const params = use(props.params);
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contrat, setContrat] = useState<ContratData | null>(null)
  const [signing, setSigning] = useState(false)
  const [success, setSuccess] = useState(false)
  const sigCanvas = useRef<SignatureCanvasRef | null>(null)
  // const router = useRouter()

  useEffect(() => {
    const fetchContrat = async () => {
      try {
        const response = await fetch(`/api/contrats/${params.token}`)
        if (!response.ok) {
          throw new Error('Contrat non trouvé ou déjà signé')
        }
        const data = await response.json()
        setContrat(data)
      } catch (error) {
        console.error('Erreur:', error)
        setError('Ce contrat n\'est pas disponible ou a déjà été signé.')
      } finally {
        setLoading(false)
      }
    }

    fetchContrat()
  }, [params.token])

  const clearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear()
    }
  }

  const handleSubmit = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setError('Veuillez signer le contrat avant de continuer.')
      return
    }

    try {
      setSigning(true)
      const signatureData = sigCanvas.current.toDataURL('image/png')
      const signatureBase64 = signatureData.split(',')[1]

      const response = await fetch(`/api/contrats/${params.token}/signer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature: signatureBase64 }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la signature du contrat')
      }

      const data = await response.json()
      setSuccess(true)
      
      // Rediriger vers le contrat signé après 3 secondes
      setTimeout(() => {
        window.location.href = data.url
      }, 3000)
    } catch (error: unknown) {
      console.error('Erreur:', error)
      const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message) : undefined
      setError(message || 'Une erreur est survenue lors de la signature du contrat.')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700">Chargement du contrat...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">Erreur</h2>
            <p className="mt-2 text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-medium text-gray-900">Contrat signé avec succès</h2>
            <p className="mt-2 text-sm text-gray-500">Vous allez être redirigé vers le contrat signé...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-blue-600">
          <h1 className="text-xl font-semibold text-white">Signature de contrat de sous-traitance</h1>
          <p className="mt-1 text-sm text-blue-100">
            {contrat?.soustraitant.nom} - Généré le {new Date(contrat?.dateGeneration || '').toLocaleDateString('fr-FR')}
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900">Aperçu du contrat</h2>
            <p className="mt-1 text-sm text-gray-500">
              Veuillez consulter le contrat avant de le signer. Vous pouvez le télécharger pour le lire en détail.
            </p>
            <div className="mt-4">
              <a 
                href={contrat?.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Voir le contrat
              </a>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-medium text-gray-900">Votre signature</h2>
            <p className="mt-1 text-sm text-gray-500">
              Veuillez signer ci-dessous en utilisant votre souris ou votre doigt sur un écran tactile.
            </p>
            
            <div className="mt-4 border border-gray-300 rounded-md overflow-hidden">
              <TypedSignatureCanvas 
                ref={sigCanvas}
                canvasProps={{
                  width: 500,
                  height: 200,
                  className: 'w-full h-48 bg-white'
                }}
              />
            </div>
            
            <div className="mt-4 flex space-x-3">
              <button
                type="button"
                onClick={clearSignature}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={signing}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {signing ? 'Signature en cours...' : 'Signer le contrat'}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 
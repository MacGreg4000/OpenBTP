'use client'

  const compress = async (files: File[]) => {
    const m = await import('@/lib/client/image')
    const out: File[] = []
    for (const f of files) out.push(await m.compressImageFile(f))
    return out
  }

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import { 
  TypeTicketSAV, 
  PrioriteSAV,
  CreateTicketSAVData,
  LABELS_TYPE_TICKET_SAV,
  LABELS_PRIORITE_SAV
} from '@/types/sav'
import { Button } from '@/components/ui'
import { SearchableSelect, SearchableSelectOption } from '@/components/SearchableSelect'

interface Chantier {
  id: string
  chantierId: string
  nomChantier: string
  clientNom?: string
}

// interface User { id: string; name?: string; email: string }

interface SousTraitant {
  id: string
  nom: string
  email: string
}

export default function NouveauTicketSAVPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Listes de référence
  const [chantiers, setChantiers] = useState<Chantier[]>([])
  // const [techniciens, setTechniciens] = useState<User[]>([])
  const [soustraitants, setSoustraitants] = useState<SousTraitant[]>([])
  const [ouvriersInternes, setOuvriersInternes] = useState<Array<{id:string, nom:string, prenom?:string}>>([])
  const [isChantierLibre, setIsChantierLibre] = useState(false)
  const [chantierLibreNom, setChantierLibreNom] = useState('')
  
  // Données du formulaire
  const [formData, setFormData] = useState<CreateTicketSAVData>({
    chantierId: '',
    titre: '',
    description: '',
    type: TypeTicketSAV.AUTRE,
    priorite: PrioriteSAV.NORMALE,
    localisation: '',
    dateInterventionSouhaitee: '',
    ouvrierInterneAssignId: '',
    soustraitantAssignId: '',
    contactNom: '',
    contactTelephone: '',
    contactEmail: ''
  })
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  
  useEffect(() => {
    fetchReferenceData()
  }, [])
  
  const fetchReferenceData = async () => {
    try {
      // Récupération des vraies données
    const [chantiersRes, soustraitantsRes, ouvIntRes] = await Promise.all([
        fetch('/api/chantiers'),
        fetch('/api/sous-traitants'),
        fetch('/api/ouvriers-internes')
      ])
      
      if (chantiersRes.ok) {
        const chantiersJson = await chantiersRes.json()
        const chantiersData = Array.isArray(chantiersJson) ? chantiersJson : chantiersJson.data
        setChantiers(Array.isArray(chantiersData) ? chantiersData : [])
      }
      
      // Techniciens supprimé (non utilisé)
      
      if (soustraitantsRes.ok) {
        const stJson = await soustraitantsRes.json()
        const stData = Array.isArray(stJson) ? stJson : (Array.isArray(stJson?.data) ? stJson.data : [])
        setSoustraitants(Array.isArray(stData) ? stData : [])
      }
      if (ouvIntRes.ok) {
        const ouv = await ouvIntRes.json()
        setOuvriersInternes(Array.isArray(ouv) ? ouv : [])
      }
      
    } catch (error) {
      console.error('Erreur lors de la récupération des données de référence:', error)
      setError('Erreur lors du chargement des données')
    }
  }
  
  const handleInputChange = (field: keyof CreateTicketSAVData, value: string | number | boolean | null | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      // Validation côté client (chantierId facultatif)
      if (!formData.titre.trim() || !formData.description.trim()) {
        throw new Error('Veuillez remplir tous les champs obligatoires')
      }
      
      // Création du ticket via API
      const response = await fetch('/api/sav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nomLibre: isChantierLibre ? chantierLibreNom : null,
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la création du ticket')
      }
      
      const nouveauTicket = await response.json()
      // Upload des pièces jointes si présentes
      if (pendingFiles.length && nouveauTicket?.id) {
        for (const f of pendingFiles) {
          const fd = new FormData()
          fd.append('file', f)
          await fetch(`/api/sav/${nouveauTicket.id}/documents`, { method: 'POST', body: fd })
        }
      }
      
      setSuccess(true)
      
      // Redirection après succès
      setTimeout(() => {
        router.push('/sav')
      }, 1500)
      
    } catch (error: unknown) {
      console.error('Erreur lors de la création du ticket SAV:', error)
      const message = error instanceof Error ? error.message : 'Erreur lors de la création du ticket SAV'
      setError(message)
    } finally {
      setLoading(false)
    }
  }
  
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Ticket SAV créé avec succès !
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Redirection vers la liste des tickets...
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center space-x-4">
        <Button
          variant="secondary"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          <span>Retour</span>
        </Button>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nouveau ticket SAV
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Créer une nouvelle demande de service après-vente
          </p>
        </div>
      </div>
      
      {/* Affichage des erreurs */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Informations principales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chantier */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Chantier *</label>
              <SearchableSelect
                options={[
                  { value: 'LIBRE', label: '— Chantier libre —' },
                  ...chantiers.map(chantier => ({
                    value: chantier.chantierId,
                    label: chantier.nomChantier,
                    subtitle: chantier.clientNom
                  }))
                ]}
                value={isChantierLibre ? 'LIBRE' : (formData.chantierId || null)}
                onChange={(v) => {
                  if (v === 'LIBRE') {
                    setIsChantierLibre(true)
                    handleInputChange('chantierId', '')
                  } else {
                    setIsChantierLibre(false)
                    handleInputChange('chantierId', v as string)
                  }
                }}
                placeholder="Sélectionner un chantier"
                searchPlaceholder="Rechercher un chantier..."
                emptyMessage="Aucun chantier trouvé"
                allOptionLabel="Tous les chantiers"
                showAllOption={false}
              />
              {isChantierLibre && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom libre (chantier/ticket)</label>
                  <input className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white" value={chantierLibreNom} onChange={e=>setChantierLibreNom(e.target.value)} placeholder="Ex: Intervention client Dupont" />
                </div>
              )}
            </div>
            
            {/* Titre */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titre du problème *
              </label>
              <input
                type="text"
                required
                value={formData.titre}
                onChange={(e) => handleInputChange('titre', e.target.value)}
                placeholder="Ex: Fissures dans le carrelage du salon"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description détaillée *
              </label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Décrivez le problème en détail..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de problème *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as TypeTicketSAV)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {Object.values(TypeTicketSAV).map(type => (
                  <option key={type} value={type}>
                    {LABELS_TYPE_TICKET_SAV[type]}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Priorité */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priorité *
              </label>
              <select
                required
                value={formData.priorite}
                onChange={(e) => handleInputChange('priorite', e.target.value as PrioriteSAV)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {Object.values(PrioriteSAV).map(priorite => (
                  <option key={priorite} value={priorite}>
                    {LABELS_PRIORITE_SAV[priorite]}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Localisation */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Localisation précise
              </label>
              <input
                type="text"
                value={formData.localisation}
                onChange={(e) => handleInputChange('localisation', e.target.value)}
                placeholder="Ex: Salon, mur sud près de la fenêtre"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Planification */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Planification, assignation et contact
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date souhaitée */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date d&apos;intervention souhaitée
              </label>
              <input
                type="date"
                value={formData.dateInterventionSouhaitee}
                onChange={(e) => handleInputChange('dateInterventionSouhaitee', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            {/* Coût estimé supprimé */}
            
            {/* Technicien supprimé (non utilisé) */}

            {/* Ouvrier interne assigné */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ouvrier interne assigné</label>
              <select
                value={formData.ouvrierInterneAssignId}
                onChange={(e)=> handleInputChange('ouvrierInterneAssignId', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">— Aucun —</option>
                {ouvriersInternes.map(o=> (
                  <option key={o.id} value={o.id}>{(o.prenom||'')+' '+o.nom}</option>
                ))}
              </select>
            </div>
            
            {/* Sous-traitant assigné */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sous-traitant assigné
              </label>
              <select
                value={formData.soustraitantAssignId}
                onChange={(e) => handleInputChange('soustraitantAssignId', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Aucun sous-traitant assigné</option>
                {soustraitants.map(soustraitant => (
                  <option key={soustraitant.id} value={soustraitant.id}>
                    {soustraitant.nom} - {soustraitant.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Coordonnées de contact */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom du contact</label>
              <input
                type="text"
                value={formData.contactNom}
                onChange={(e) => handleInputChange('contactNom', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Téléphone</label>
              <input
                type="tel"
                value={formData.contactTelephone}
                onChange={(e) => handleInputChange('contactTelephone', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          {/* Pièces jointes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pièces jointes</label>
            <input type="file" multiple onChange={async(e)=>{ if(e.target.files){ const arr = Array.from(e.target.files); setPendingFiles(await compress(arr)) } }} className="block" />
            {pendingFiles.length>0 && (
              <p className="text-xs text-gray-500 mt-1">{pendingFiles.length} fichier(s) seront ajoutés après création.</p>
            )}
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? 'Création...' : 'Créer le ticket'}
          </Button>
        </div>
      </form>
    </div>
  )
} 
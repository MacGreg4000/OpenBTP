'use client'

// Représentant légal du sous-traitant — commun aux formulaires de création et
// d'édition. Ces champs sont exigés pour générer ou envoyer un contrat-cadre :
// le représentant en est le signataire et le destinataire des rappels
// Checkinatwork quotidiens (art. 8.6.2 du contrat-cadre v2).
//
// Validation immédiate du format ici ; la vérification du domaine email
// (DNS) se fait côté serveur à l'enregistrement.

import { FormInput } from '@/components/ui'
import { emailFormatValide, normaliserGsm, champsRepresentantManquants } from '@/lib/soustraitants/representant'

export interface RepresentantValeurs {
  representantNom: string
  representantPrenom: string
  representantFonction: string
  representantEmail: string
  representantGsm: string
}

export const REPRESENTANT_VIDE: RepresentantValeurs = {
  representantNom: '',
  representantPrenom: '',
  representantFonction: '',
  representantEmail: '',
  representantGsm: '',
}

export default function RepresentantFields({
  valeurs,
  onChange,
}: {
  valeurs: RepresentantValeurs
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  const manquants = champsRepresentantManquants(valeurs)
  const emailInvalide = !!valeurs.representantEmail && !emailFormatValide(valeurs.representantEmail)
  const gsm = valeurs.representantGsm ? normaliserGsm(valeurs.representantGsm) : null

  return (
    <fieldset className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-white">
        Représentant légal (contrat-cadre)
      </legend>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Signataire du contrat-cadre. Son email reçoit chaque matin le rappel d&apos;enregistrement
        Checkinatwork. Obligatoire pour générer ou envoyer un contrat.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormInput id="representantPrenom" name="representantPrenom" type="text" label="Prénom"
          value={valeurs.representantPrenom} onChange={onChange} />
        <FormInput id="representantNom" name="representantNom" type="text" label="Nom"
          value={valeurs.representantNom} onChange={onChange} />
        <FormInput id="representantFonction" name="representantFonction" type="text" label="Fonction"
          value={valeurs.representantFonction} onChange={onChange} placeholder="Gérant" />
        <div>
          <FormInput id="representantEmail" name="representantEmail" type="email" label="Email (rappels quotidiens)"
            value={valeurs.representantEmail} onChange={onChange} placeholder="gerant@entreprise.pt" />
          {emailInvalide && <p className="mt-1 text-xs text-red-600">Format d&apos;email invalide.</p>}
        </div>
        <div className="sm:col-span-2">
          <FormInput id="representantGsm" name="representantGsm" type="tel" label="GSM"
            value={valeurs.representantGsm} onChange={onChange} placeholder="+351 912 345 678" />
          {gsm && !gsm.ok && <p className="mt-1 text-xs text-red-600">{gsm.erreur}</p>}
          {gsm?.ok && <p className="mt-1 text-xs text-gray-500">Enregistré comme {gsm.e164}</p>}
        </div>
      </div>

      {manquants.length > 0 && (
        <p className="rounded-md bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
          Incomplet — aucun contrat ne pourra être généré tant que manquent : {manquants.join(', ')}.
        </p>
      )}
    </fieldset>
  )
}

// Catalogue des types de documents des sous-traitants. Module pur (importable
// côté client) : formulaires, MCP, tableau de conformité, miroir NAS.
//
// `unique` : un seul document en vigueur par personne / société — en ajouter
// un nouveau ARCHIVE l'ancien (preuve conservée, jamais supprimée).

export interface TypeDocument {
  code: string
  libelle: string
  /** Libellé court (en-tête de colonne du tableau) */
  court: string
  unique: boolean
}

export const TYPES_DOCUMENT_OUVRIER: TypeDocument[] = [
  { code: 'carte_identite', libelle: "Carte d'identité / titre de séjour", court: 'ID', unique: true },
  { code: 'a1', libelle: 'Certificat A1', court: 'A1', unique: true },
  { code: 'limosa', libelle: 'Déclaration Limosa (L-1)', court: 'Limosa', unique: true },
  { code: 'attestation_onss', libelle: 'Attestation ONSS / sécurité sociale', court: 'ONSS', unique: true },
  { code: 'permis_travail', libelle: 'Permis de travail', court: 'Permis', unique: true },
  // Code historique « certificat_medical » : l'interface l'a toujours présenté
  // comme « Attestation Sécurité » — les documents existants sont des formations sécurité.
  { code: 'certificat_medical', libelle: 'Formation sécurité (VCA, sécurité de base)', court: 'Sécurité', unique: true },
  { code: 'livre_parts', libelle: 'Livre des parts / statut associé', court: 'Parts', unique: true },
  { code: 'diplome', libelle: 'Diplôme / attestation de compétence', court: 'Diplôme', unique: false },
  { code: 'autre', libelle: 'Autre', court: 'Autre', unique: false },
]

export const TYPES_DOCUMENT_SOCIETE: TypeDocument[] = [
  { code: 'extrait_bce', libelle: 'Extrait BCE / registre de commerce', court: 'BCE', unique: true },
  { code: 'attestation_onss_societe', libelle: 'Attestation ONSS (absence de dettes sociales)', court: 'ONSS', unique: true },
  { code: 'attestation_fiscale', libelle: 'Attestation fiscale (absence de dettes)', court: 'Fiscal', unique: true },
  { code: 'assurance_rc', libelle: 'Assurance responsabilité civile', court: 'RC', unique: true },
  { code: 'contrat_cadre', libelle: 'Contrat-cadre signé (archive papier)', court: 'Contrat', unique: true },
  { code: 'statuts', libelle: 'Statuts / acte constitutif', court: 'Statuts', unique: true },
  { code: 'autre_societe', libelle: 'Autre document société', court: 'Autre', unique: false },
]

export const CODES_OUVRIER = TYPES_DOCUMENT_OUVRIER.map((t) => t.code)
export const CODES_SOCIETE = TYPES_DOCUMENT_SOCIETE.map((t) => t.code)

export const libelleType = (code: string) =>
  [...TYPES_DOCUMENT_OUVRIER, ...TYPES_DOCUMENT_SOCIETE].find((t) => t.code === code)?.libelle || code

/**
 * Documents exigés par défaut quand la fiche sous-traitant n'a pas de réglage :
 *  - société étrangère (TVA hors BE) : pièce d'identité + A1 + Limosa ;
 *  - société belge : pièce d'identité.
 */
export function documentsRequisParDefaut(tva: string | null | undefined): string[] {
  const pays = String(tva || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
  return pays && pays !== 'BE' ? ['carte_identite', 'a1', 'limosa'] : ['carte_identite']
}

/** Lit le réglage JSON de la fiche (liste de codes), sinon la règle par défaut. */
export function documentsRequisOuvrier(st: { documentsRequisOuvrier?: string | null; tva?: string | null }): string[] {
  try {
    const v = st.documentsRequisOuvrier ? JSON.parse(st.documentsRequisOuvrier) : null
    if (Array.isArray(v)) return v.filter((c) => CODES_OUVRIER.includes(c))
  } catch {}
  return documentsRequisParDefaut(st.tva)
}

export function documentsRequisSociete(st: { documentsRequisSociete?: string | null }): string[] {
  try {
    const v = st.documentsRequisSociete ? JSON.parse(st.documentsRequisSociete) : null
    if (Array.isArray(v)) return v.filter((c) => CODES_SOCIETE.includes(c))
  } catch {}
  return []
}

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
  { code: 'attestation_onss', libelle: 'Sécurité sociale (INASTI, Dimona, C3.2A, Construbadge)', court: 'Sécu', unique: true },
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

// ─── Situation des personnes et documents exigés ─────────────────────────────
//
// Règles tirées de l'arbre « Documents légaux à fournir au chantier »
// (ONSS / ADEB, CheckinFlow 2019-02), + formation sécurité exigée par Secotech
// pour tout le monde.

export const STATUTS_OUVRIER = [
  { code: 'INDEPENDANT', libelle: 'Indépendant' },
  { code: 'ASSOCIE_ACTIF', libelle: 'Associé actif' },
  { code: 'SALARIE', libelle: 'Salarié' },
] as const

export const NATIONALITES = [
  { code: 'BE', libelle: 'Belge' },
  { code: 'UE', libelle: 'UE / EEE / Suisse' },
  { code: 'HORS_UE', libelle: 'Hors UE' },
] as const

const libelleDe = (liste: readonly { code: string; libelle: string }[], code?: string | null) =>
  liste.find((x) => x.code === code)?.libelle

/** Pays du numéro de TVA (« BE », « PT »…), vide si inconnu. */
export function paysTva(tva: string | null | undefined): string {
  return String(tva || '').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase()
}

/** Société étrangère = personnes détachées (Limosa + A1). Sans préfixe : considérée belge. */
export const estSocieteEtrangere = (tva: string | null | undefined) => {
  const p = paysTva(tva)
  return !!p && p !== 'BE'
}

/** Résumé lisible de la situation (« Indépendant · UE · détaché »). */
export function libelleSituation(tva: string | null | undefined, statut?: string | null, nationalite?: string | null): string {
  return [
    libelleDe(STATUTS_OUVRIER, statut) || 'statut ?',
    libelleDe(NATIONALITES, nationalite) || 'nationalité ?',
    estSocieteEtrangere(tva) ? 'détaché' : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Documents exigés pour UNE personne :
 *  - tout le monde : pièce d'identité / titre de séjour + formation sécurité ;
 *  - société étrangère (détachement) : Limosa (L-1) + A1 ;
 *  - société belge : preuve de sécurité sociale (INASTI pour indépendant /
 *    associé, Dimona / C3.2A / Construbadge pour salarié) ; associé actif :
 *    registre des parts ; hors UE : permis de travail ;
 *  - + documents supplémentaires réglés sur la société.
 */
export function documentsRequisPersonne(
  st: { tva?: string | null; documentsRequisOuvrier?: string | null },
  o: { statut?: string | null; nationalite?: string | null }
): string[] {
  const requis = new Set<string>(['carte_identite', 'certificat_medical'])
  if (estSocieteEtrangere(st.tva)) {
    requis.add('limosa')
    requis.add('a1')
  } else {
    requis.add('attestation_onss')
    if (o.statut === 'ASSOCIE_ACTIF') requis.add('livre_parts')
    if (o.nationalite === 'HORS_UE') requis.add('permis_travail')
  }
  for (const c of documentsSupplementairesOuvrier(st)) requis.add(c)
  return CODES_OUVRIER.filter((c) => requis.has(c))
}

/** Documents supplémentaires exigés pour chaque personne de cette société (réglage de la fiche). */
export function documentsSupplementairesOuvrier(st: { documentsRequisOuvrier?: string | null }): string[] {
  try {
    const v = st.documentsRequisOuvrier ? JSON.parse(st.documentsRequisOuvrier) : null
    if (Array.isArray(v)) return v.filter((c) => CODES_OUVRIER.includes(c))
  } catch {}
  return []
}

export function documentsRequisSociete(st: { documentsRequisSociete?: string | null }): string[] {
  try {
    const v = st.documentsRequisSociete ? JSON.parse(st.documentsRequisSociete) : null
    if (Array.isArray(v)) return v.filter((c) => CODES_SOCIETE.includes(c))
  } catch {}
  return []
}

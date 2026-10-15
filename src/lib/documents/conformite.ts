// Conformité documentaire des sous-traitants : pour chaque personne (et la
// société), statut de chaque type de document. Partagé par la page
// « Documents des sous-traitants » et les outils MCP.

import { prisma } from '@/lib/prisma/client'
import {
  documentsRequisPersonne,
  documentsSupplementairesOuvrier,
  documentsRequisSociete,
  libelleSituation,
  TYPES_DOCUMENT_OUVRIER,
  TYPES_DOCUMENT_SOCIETE,
} from './types'

export const JOURS_ALERTE_EXPIRATION = 30

/** ok : présent et valide · bientot : expire sous 30 j · expire · manquant (exigé) · absent (non exigé) */
export type StatutDoc = 'ok' | 'bientot' | 'expire' | 'manquant' | 'absent'

export interface CelluleDoc {
  statut: StatutDoc
  requis: boolean
  documentId?: string
  url?: string
  dateExpiration?: string | null
}

export interface LigneOuvrier {
  id: string
  nom: string
  prenom: string
  poste: string
  statut: string | null
  nationalite: string | null
  /** « Indépendant · UE · détaché » */
  situation: string
  /** Situation incomplète : documents exigés calculés au mieux, à préciser */
  situationIncomplete: boolean
  requis: string[]
  documents: Record<string, CelluleDoc>
  manquants: number
  alertes: number
}

export interface SocieteConformite {
  id: string
  nom: string
  tva: string | null
  actif: boolean
  /** Documents supplémentaires exigés pour chaque personne (réglage de la fiche) */
  supplementairesOuvrier: string[]
  requisSociete: string[]
  /** Contrat-cadre signé dans OpenBTP (calculé, pas un document déposé) */
  contratSigne: { statut: StatutDoc; dateFin: string | null }
  documentsSociete: Record<string, CelluleDoc>
  ouvriers: LigneOuvrier[]
}

function cellule(
  doc: { id: string; url: string; dateExpiration: Date | null } | undefined,
  requis: boolean,
  maintenant: Date
): CelluleDoc {
  if (!doc) return { statut: requis ? 'manquant' : 'absent', requis }
  const exp = doc.dateExpiration
  let statut: StatutDoc = 'ok'
  if (exp && exp.getTime() < maintenant.getTime()) statut = 'expire'
  else if (exp && exp.getTime() - maintenant.getTime() < JOURS_ALERTE_EXPIRATION * 86400000) statut = 'bientot'
  return { statut, requis, documentId: doc.id, url: doc.url, dateExpiration: exp ? exp.toISOString().slice(0, 10) : null }
}

/** Document en vigueur le plus récent par type. */
interface DocBrut {
  id: string
  type: string
  url: string
  dateExpiration: Date | null
  createdAt: Date
}

function parType(docs: DocBrut[]): Map<string, DocBrut> {
  const m = new Map<string, DocBrut>()
  for (const d of [...docs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())) if (!m.has(d.type)) m.set(d.type, d)
  return m
}

export async function conformiteSousTraitants(opts: { soustraitantId?: string; inclureInactifs?: boolean } = {}): Promise<SocieteConformite[]> {
  const maintenant = new Date()
  const societes = await prisma.soustraitant.findMany({
    where: {
      ...(opts.soustraitantId ? { id: opts.soustraitantId } : {}),
      ...(opts.inclureInactifs || opts.soustraitantId ? {} : { actif: true }),
    },
    select: {
      id: true, nom: true, tva: true, actif: true, documentsRequisOuvrier: true, documentsRequisSociete: true,
      documentsSociete: { where: { archive: false }, select: { id: true, type: true, url: true, dateExpiration: true, createdAt: true } },
      contrats: { where: { estSigne: true }, select: { dateFin: true, dateSignature: true }, orderBy: { dateSignature: 'desc' }, take: 1 },
    },
    orderBy: { nom: 'asc' },
  })
  const ouvriers = await prisma.ouvrier.findMany({
    where: { sousTraitantId: { in: societes.map((s) => s.id) }, actif: true },
    select: {
      id: true, nom: true, prenom: true, poste: true, sousTraitantId: true, statut: true, nationalite: true,
      DocumentOuvrier: { where: { archive: false }, select: { id: true, type: true, url: true, dateExpiration: true, createdAt: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  })

  return societes.map((st) => {
    const supplementairesOuvrier = documentsSupplementairesOuvrier(st)
    const requisSociete = documentsRequisSociete(st)
    const docsSte = parType(st.documentsSociete)
    const contrat = st.contrats[0]
    const contratSigne = contrat
      ? cellule({ id: 'contrat', url: '', dateExpiration: contrat.dateFin }, true, maintenant)
      : ({ statut: 'manquant', requis: true } as CelluleDoc)
    return {
      id: st.id,
      nom: st.nom,
      tva: st.tva,
      actif: st.actif,
      supplementairesOuvrier,
      requisSociete,
      contratSigne: { statut: contratSigne.statut, dateFin: contrat?.dateFin ? contrat.dateFin.toISOString().slice(0, 10) : null },
      documentsSociete: Object.fromEntries(
        TYPES_DOCUMENT_SOCIETE.map((t) => [t.code, cellule(docsSte.get(t.code), requisSociete.includes(t.code), maintenant)])
      ),
      ouvriers: ouvriers
        .filter((o) => o.sousTraitantId === st.id)
        .map((o) => {
          const docs = parType(o.DocumentOuvrier)
          const requis = documentsRequisPersonne(st, o)
          const documents = Object.fromEntries(
            TYPES_DOCUMENT_OUVRIER.map((t) => [t.code, cellule(docs.get(t.code), requis.includes(t.code), maintenant)])
          )
          const valeurs = Object.values(documents)
          return {
            id: o.id,
            nom: o.nom,
            prenom: o.prenom,
            poste: o.poste,
            statut: o.statut,
            nationalite: o.nationalite,
            situation: libelleSituation(st.tva, o.statut, o.nationalite),
            situationIncomplete: !o.statut || !o.nationalite,
            requis,
            documents,
            manquants: valeurs.filter((c) => c.statut === 'manquant' || (c.requis && c.statut === 'expire')).length,
            alertes: valeurs.filter((c) => c.statut === 'bientot').length,
          }
        }),
    }
  })
}

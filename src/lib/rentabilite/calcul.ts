// Estimation du coût matière d'un chantier.
//
// Pourquoi ce calcul existe : le formulaire de dépenses demande six champs par
// ligne, donc en pratique les marchandises ne sont jamais encodées. Plutôt que
// de réduire la friction de saisie, on ESTIME le coût matière à partir de ce
// qui est déjà en base — les quantités réellement facturées au client.
//
// ── Sources de données (vérifiées, ≠ de celles du plan initial) ─────────────
// Le document de plan désignait `LigneMarche` / `LigneEtat` comme source. Ces
// tables sont MORTES : aucune requête Prisma dans tout src/, seules subsistent
// des déclarations de types orphelines. Bâtir dessus donnerait toujours zéro.
//
// Les vraies sources sont :
//   • `LigneCommande`            — le bordereau (article, unité, prix de vente)
//                                  et désormais categorieMateriau/coutMatiereM2
//   • `LigneEtatAvancement`      — état d'avancement CLIENT (et non
//                                  sous-traitant : c'est `EtatAvancement` qui
//                                  est le côté client, le plan les inversait).
//                                  `quantiteTotale` = cumul facturé à ce jour.
//   • lien : `LigneEtatAvancement.ligneCommandeId` (Int, sans clé étrangère)
//
// ── Principe ────────────────────────────────────────────────────────────────
// On part de l'état d'avancement le PLUS RÉCENT : ses lignes portent déjà le
// cumul (`quantiteTotale`), il est donc inutile — et faux — de sommer les états
// entre eux. Chaque ligne est rattachée à sa ligne de commande pour récupérer
// la catégorie et le prix d'achat, puis le barème de la catégorie s'applique.
//
// Le résultat est volontairement DÉTAILLÉ et porte ses avertissements : un coût
// sous-estimé parce que des lignes ne sont pas catégorisées doit se voir, pas
// se confondre avec un chantier peu coûteux.

import { prisma } from '@/lib/prisma/client'

// Vocabulaire et contrôles purs : extraits dans un module sans Prisma pour que
// la modale de saisie (composant client) applique les mêmes règles que le calcul.
// Réexportés ici afin que les appelants existants n'aient pas à changer d'import.
export {
  CATEGORIES_MATERIAU,
  CATEGORIE_AUCUNE,
  LIBELLES_CATEGORIE,
  estCategorieMateriau,
  normaliserUnite,
  verifierUniteCategorie,
} from './categories'
export type { CategorieMateriau } from './categories'

import {
  CATEGORIE_AUCUNE,
  estCategorieMateriau,
  verifierUniteCategorie,
} from './categories'
import type { CategorieMateriau } from './categories'
import { etatsSoustraitantDuChantier } from '@/lib/etats/soustraitant'

/** Arrondi monétaire, même convention que le reste de l'application. */
function arrondi2(n: number): number {
  return Math.round(Number(n) * 100) / 100
}

export interface DetailLigneCoutMatiere {
  ligneCommandeId: number
  article: string
  description: string
  unite: string
  categorie: CategorieMateriau
  /** Quantité cumulée facturée au client à ce jour. */
  quantite: number
  coutMatiereM2: number
  pourcentageChute: number
  coutCarrelage: number
  coutColle: number
  coutJoint: number
  coutSilicone: number
  /** Clips, profilés, membrane d'étanchéité… — coût fixe par unité. */
  coutFixe: number
  total: number
}

export interface ResultatCoutMatiere {
  chantierId: string
  /** Numéro de l'état d'avancement client servant de base au cumul. */
  etatNumero: number | null
  coutMatiereTotal: number
  detailParCategorie: Record<string, number>
  lignes: DetailLigneCoutMatiere[]
  /** Lignes facturées ni catégorisées ni marquées « sans matière ». */
  lignesNonCategorisees: number
  /** Chantier de pose seule : la marchandise n'est pas à notre charge. */
  poseUniquement: boolean
  /** Points qui minorent le résultat — à afficher, jamais à masquer. */
  avertissements: string[]
}

/** Champs de LigneCommande nécessaires au calcul. */
interface LigneCommandeMatiere {
  id: number
  article: string
  description: string
  unite: string
  type: string
  categorieMateriau: string | null
  coutMatiereM2: number | null
}

interface BaremeUtilisable {
  ratioColleKgM2: number
  prixColleKg: number
  ratioJointKgM2: number
  prixJointKg: number
  ratioSiliconeMl: number
  prixSiliconeMl: number
  pourcentageChute: number
  coutFixeM2: number
}

const BAREME_VIDE: BaremeUtilisable = {
  ratioColleKgM2: 0,
  prixColleKg: 0,
  ratioJointKgM2: 0,
  prixJointKg: 0,
  ratioSiliconeMl: 0,
  prixSiliconeMl: 0,
  pourcentageChute: 0,
  coutFixeM2: 0,
}

function baremeEstVide(b: BaremeUtilisable): boolean {
  return (
    b.ratioColleKgM2 === 0 &&
    b.prixColleKg === 0 &&
    b.ratioJointKgM2 === 0 &&
    b.prixJointKg === 0 &&
    b.ratioSiliconeMl === 0 &&
    b.prixSiliconeMl === 0 &&
    b.pourcentageChute === 0 &&
    b.coutFixeM2 === 0
  )
}

/**
 * Calcule le coût matière estimé d'un chantier.
 *
 * @param chantierCuid  `Chantier.id` (cuid) — c'est la clé utilisée par
 *                      EtatAvancement.chantierId, PAS le slug métier.
 *
 * Lecture seule : n'écrit jamais. Ne lève pas sur données manquantes ; renvoie
 * un total nul assorti d'avertissements explicites.
 */
export async function calculerCoutMatiereChantier(
  chantierCuid: string
): Promise<ResultatCoutMatiere> {
  const avertissements: string[] = []

  // 0. Pose seule ? Le carrelage est alors fourni par le client : son prix
  //    d'achat n'a pas à être renseigné, et son absence n'est pas un oubli.
  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierCuid },
    select: { poseUniquement: true },
  })
  const poseUniquement = !!chantier?.poseUniquement

  // 1. L'état d'avancement client le plus récent porte déjà les cumuls.
  const dernierEtat = await prisma.etatAvancement.findFirst({
    where: { chantierId: chantierCuid },
    orderBy: { numero: 'desc' },
    include: { lignes: true },
  })

  if (!dernierEtat || dernierEtat.lignes.length === 0) {
    return {
      chantierId: chantierCuid,
      etatNumero: dernierEtat?.numero ?? null,
      coutMatiereTotal: 0,
      detailParCategorie: {},
      lignes: [],
      lignesNonCategorisees: 0,
      poseUniquement,
      avertissements: [
        dernierEtat
          ? "L'état d'avancement le plus récent ne contient aucune ligne."
          : "Aucun état d'avancement client : rien n'a encore été facturé, le coût matière est donc nul.",
      ],
    }
  }

  // 2. Barème par catégorie
  const baremes = await prisma.baremeMateriau.findMany()
  const baremeParCategorie = new Map<string, BaremeUtilisable>(
    baremes.map((b) => [
      b.categorie,
      {
        ratioColleKgM2: b.ratioColleKgM2,
        prixColleKg: b.prixColleKg,
        ratioJointKgM2: b.ratioJointKgM2,
        prixJointKg: b.prixJointKg,
        ratioSiliconeMl: b.ratioSiliconeMl,
        prixSiliconeMl: b.prixSiliconeMl,
        pourcentageChute: b.pourcentageChute,
        coutFixeM2: b.coutFixeM2,
      },
    ])
  )
  if (baremes.length === 0 || baremes.every((b) => baremeEstVide(baremeParCategorie.get(b.categorie)!))) {
    avertissements.push(
      "Le barème des consommables (colle, joint, silicone, chute) n'est pas renseigné : " +
        'seul le coût du carrelage est pris en compte.'
    )
  }

  // 3. Lignes de commande correspondantes (catégorie + prix d'achat).
  //    ligneCommandeId n'a PAS de clé étrangère : on filtre les valeurs nulles
  //    ou orphelines plutôt que de supposer l'intégrité.
  const idsLignesCommande = [
    ...new Set(dernierEtat.lignes.map((l) => l.ligneCommandeId).filter((v): v is number => !!v)),
  ]
  // Pas de garde sur un tableau vide : `in: []` ne renvoie rien, et le ternaire
  // ferait perdre le type inféré par Prisma.
  const lignesCommande = await prisma.ligneCommande.findMany({
    where: { id: { in: idsLignesCommande } },
    select: {
      id: true,
      article: true,
      description: true,
      unite: true,
      type: true,
      categorieMateriau: true,
      coutMatiereM2: true,
    },
  })
  // Map typée explicitement : l'inférence sur un tuple [number, objet] retombe
  // sinon sur unknown (findMany est bien typé, c'est le Map qui élargit).
  const ligneCommandeParId = new Map<number, LigneCommandeMatiere>(
    lignesCommande.map((l) => [l.id, l])
  )

  // 4. Calcul ligne à ligne
  const lignes: DetailLigneCoutMatiere[] = []
  const detailParCategorie: Record<string, number> = {}
  let nonCategorisees = 0
  let sansPrixAchat = 0
  const unitesIncoherentes: string[] = []

  for (const ligneEtat of dernierEtat.lignes) {
    // Les sections ne portent aucune quantité
    if (ligneEtat.type === 'TITRE' || ligneEtat.type === 'SOUS_TITRE') continue

    const quantite = ligneEtat.quantiteTotale || 0
    if (quantite <= 0) continue

    const lc = ligneEtat.ligneCommandeId ? ligneCommandeParId.get(ligneEtat.ligneCommandeId) : undefined
    const categorie = lc?.categorieMateriau
    // Marquée « sans matière » : écartée volontairement, donc silencieusement.
    if (categorie === CATEGORIE_AUCUNE) continue
    if (!estCategorieMateriau(categorie)) {
      nonCategorisees++
      continue
    }
    // En pose seule le prix d'achat est ignoré, y compris s'il traîne en base
    // d'une saisie antérieure : la marchandise n'est pas notre dépense.
    //
    // Seul le CARRELAGE est neutralisé. Les coûts fixes du barème restent
    // comptés, y compris les 9,64 €/m² d'ÉTANCHÉITÉ : la membrane est toujours
    // fournie par nous, même quand le client fournit le carrelage. Idem pour
    // les clips et profilés (2 €/m² sur SOL et MUR).
    const coutMatiereM2 = poseUniquement ? 0 : (lc?.coutMatiereM2 ?? 0)
    if (!coutMatiereM2 && !poseUniquement) sansPrixAchat++

    const soucieUnite = verifierUniteCategorie(categorie, lc!.unite)
    if (soucieUnite) unitesIncoherentes.push(`${lc!.article || lc!.id} (${soucieUnite})`)

    const bareme = baremeParCategorie.get(categorie) ?? BAREME_VIDE

    const coutCarrelage = arrondi2(quantite * coutMatiereM2 * (1 + bareme.pourcentageChute / 100))
    const coutColle = arrondi2(quantite * bareme.ratioColleKgM2 * bareme.prixColleKg)
    const coutJoint = arrondi2(quantite * bareme.ratioJointKgM2 * bareme.prixJointKg)
    const coutSilicone = arrondi2(quantite * bareme.ratioSiliconeMl * bareme.prixSiliconeMl)
    const coutFixe = arrondi2(quantite * bareme.coutFixeM2)
    const total = arrondi2(coutCarrelage + coutColle + coutJoint + coutSilicone + coutFixe)

    lignes.push({
      ligneCommandeId: lc!.id,
      article: lc!.article,
      description: lc!.description,
      unite: lc!.unite,
      categorie,
      quantite,
      coutMatiereM2,
      pourcentageChute: bareme.pourcentageChute,
      coutCarrelage,
      coutColle,
      coutJoint,
      coutSilicone,
      coutFixe,
      total,
    })
    detailParCategorie[categorie] = arrondi2((detailParCategorie[categorie] || 0) + total)
  }

  if (nonCategorisees > 0) {
    avertissements.push(
      `${nonCategorisees} ligne(s) facturée(s) sans catégorie matière : elles ne sont pas comptées. ` +
        'Le coût réel est donc supérieur à cette estimation.'
    )
  }
  if (sansPrixAchat > 0) {
    avertissements.push(
      `${sansPrixAchat} ligne(s) catégorisée(s) sans prix d'achat au m² : seuls les consommables sont comptés.`
    )
  }
  if (unitesIncoherentes.length > 0) {
    avertissements.push(
      `Unité incohérente avec la catégorie sur ${unitesIncoherentes.length} ligne(s) — ` +
        `le montant calculé n'a pas de sens : ${unitesIncoherentes.join(' ; ')}.`
    )
  }

  return {
    chantierId: chantierCuid,
    etatNumero: dernierEtat.numero,
    coutMatiereTotal: arrondi2(lignes.reduce((s, l) => s + l.total, 0)),
    detailParCategorie,
    lignes,
    lignesNonCategorisees: nonCategorisees,
    poseUniquement,
    avertissements,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Détection automatique de la catégorie à partir du descriptif
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise pour comparer sans accents ni casse. */
function normaliser(texte: string): string {
  return String(texte || '')
    .normalize('NFD')
    .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .toLowerCase()
}

/**
 * Devine la catégorie d'une ligne d'après son libellé.
 * Ordre volontaire : les termes les plus spécifiques d'abord — « plinthe » et
 * « étanchéité » avant « sol »/« mur », sinon « plinthe pour carrelage de sol »
 * serait classée SOL.
 * Renvoie null en cas de doute : mieux vaut demander que se tromper.
 */
export function detecterCategorieMateriau(descriptif: string): CategorieMateriau | null {
  const t = normaliser(descriptif)
  if (!t) return null

  // Quincaillerie et accessoires : à écarter AVANT tout, sinon « siphon de sol »
  // ou « arrêt de chape » se retrouvent classés SOL et reçoivent colle et joint.
  if (
    /\b(siphon|avaloir|caniveau|grille|corniere|profil|profile|couvre-joint|entre-porte|entre-portes|tapis|arret de chape)\b/.test(
      t
    )
  ) {
    return null
  }

  if (/\b(plinthe|plinthes)\b/.test(t)) return 'PLINTHE'
  if (/etancheit|membrane|natte|sous-couche etanche|douche carrelee/.test(t)) return 'ETANCHEITE'
  // « mural » (masculin singulier) est la forme la plus fréquente des bordereaux
  if (/\b(mur|mural|murale|muraux|murales|faience|faiences)\b/.test(t)) return 'MUR'
  if (/\b(sol|sols|dalle|dalles|chape)\b/.test(t)) return 'SOL'

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Rentabilité complète d'un chantier
//
// Miroir de la formule qui fait foi dans l'interface :
// src/components/CardFinancialSummary.tsx (calculateFinancials, ~l.185-263).
//   totalRevenue         = Σ états client (lignes.montantActuel + avenants.montantActuel)
//   manualExpenses       = Σ depense.montant
//   soustraitantExpenses = Σ états ST (lignes.montantActuel + avenants.montantActuel)
//   netResult            = totalRevenue − (manual + soustraitant)
//   margin               = totalRevenue > 0 ? netResult / totalRevenue × 100 : 0
//
// Deux écarts assumés, documentés :
//  1. `Depense.chantierId` contient le SLUG métier (l'application l'écrit depuis
//     le paramètre d'URL, en SQL brut, et le modèle n'a aucune relation Prisma).
//     D'où le second paramètre `chantierSlug` — s'en passer renverrait 0.
//  2. L'interface ne compte les états sous-traitant que des commandes
//     verrouillées. Ici on prend tous les états ST du chantier : c'est
//     équivalent en pratique, la création d'un état ST étant elle-même refusée
//     tant que la commande n'est pas verrouillée.
//
// N.B. il existe une seconde formule dans src/utils/financial-calculations.ts
// (montantTotal au lieu de montantActuel, avenants ignorés) : elle est MORTE,
// son unique consommateur n'est importé nulle part. Ne pas s'en inspirer.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResultatRentabilite {
  chantierId: string
  nomChantier: string
  totalRevenue: number
  manualExpenses: number
  soustraitantExpenses: number
  /** Estimation issue de calculerCoutMatiereChantier. */
  coutMatiere: number
  totalExpenses: number
  netResult: number
  /** Marge en %, sur le chiffre d'affaires facturé. */
  margin: number
  /** Vrai si des lignes facturées n'ont pas de coût matière : la marge est
   *  alors SURÉVALUÉE. À signaler partout où le pourcentage est affiché. */
  matiereIncomplete: boolean
  /** Chantier de pose seule : marchandise à charge du client. */
  poseUniquement: boolean
  avertissements: string[]
}

export async function calculerRentabiliteChantier(
  chantierCuid: string,
  chantierSlug: string,
  nomChantier: string
): Promise<ResultatRentabilite> {
  const [etatsClient, depensesAgg, etatsST, matiere] = await Promise.all([
    prisma.etatAvancement.findMany({
      where: { chantierId: chantierCuid },
      include: { lignes: true, avenants: true },
    }),
    // SLUG, pas le cuid — voir note ci-dessus
    prisma.depense.aggregate({ where: { chantierId: chantierSlug }, _sum: { montant: true } }),
    prisma.soustraitant_etat_avancement.findMany({
      where: { ...etatsSoustraitantDuChantier(chantierCuid) },
      include: {
        ligne_soustraitant_etat_avancement: true,
        avenant_soustraitant_etat_avancement: true,
      },
    }),
    calculerCoutMatiereChantier(chantierCuid),
  ])

  const totalRevenue = arrondi2(
    etatsClient.reduce(
      (s, e) =>
        s +
        e.lignes.reduce((x, l) => x + (l.montantActuel || 0), 0) +
        e.avenants.reduce((x, a) => x + (a.montantActuel || 0), 0),
      0
    )
  )

  const manualExpenses = arrondi2(depensesAgg._sum.montant || 0)

  const soustraitantExpenses = arrondi2(
    etatsST.reduce(
      (s, e) =>
        s +
        e.ligne_soustraitant_etat_avancement.reduce((x, l) => x + (l.montantActuel || 0), 0) +
        e.avenant_soustraitant_etat_avancement.reduce((x, a) => x + (a.montantActuel || 0), 0),
      0
    )
  )

  const coutMatiere = matiere.coutMatiereTotal
  const totalExpenses = arrondi2(manualExpenses + soustraitantExpenses + coutMatiere)
  const netResult = arrondi2(totalRevenue - totalExpenses)
  const margin = totalRevenue > 0 ? arrondi2((netResult / totalRevenue) * 100) : 0

  return {
    chantierId: chantierSlug,
    nomChantier,
    totalRevenue,
    manualExpenses,
    soustraitantExpenses,
    coutMatiere,
    totalExpenses,
    netResult,
    margin,
    matiereIncomplete: matiere.lignesNonCategorisees > 0,
    poseUniquement: matiere.poseUniquement,
    avertissements: matiere.avertissements,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Liste de saisie — alimente la modale « Coût matière »
// ─────────────────────────────────────────────────────────────────────────────

export interface LigneSaisieCoutMatiere {
  ligneCommandeId: number
  article: string
  description: string
  unite: string
  /** Quantité cumulée facturée, telle que le calcul l'utilisera. */
  quantite: number
  categorieMateriau: string | null
  coutMatiereM2: number | null
  /** Proposition du détecteur, jamais écrite d'office. */
  categorieSuggeree: CategorieMateriau | null
  /** Message si la catégorie actuelle contredit l'unité de la ligne. */
  avertissementUnite: string | null
}

export interface SaisieCoutMatiere {
  etatNumero: number | null
  /** Chantier de pose seule : les champs de prix d'achat sont sans objet. */
  poseUniquement: boolean
  lignes: LigneSaisieCoutMatiere[]
  /** Lignes ni catégorisées ni marquées « sans matière ». */
  aTraiter: number
}

/**
 * Renvoie TOUTES les lignes facturables du dernier état d'avancement, y compris
 * celles que le calcul ignore faute de catégorie — ce sont précisément celles
 * qu'il faut pouvoir saisir.
 *
 * Volontairement distinct de `calculerCoutMatiereChantier`, qui ne retourne que
 * les lignes retenues : mélanger les deux ferait disparaître de l'écran de
 * saisie exactement les lignes qu'on vient y compléter.
 *
 * @param chantierCuid `Chantier.id` (cuid), pas le slug métier.
 */
export async function listerLignesSaisieCoutMatiere(
  chantierCuid: string
): Promise<SaisieCoutMatiere> {
  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierCuid },
    select: { poseUniquement: true },
  })
  const poseUniquement = !!chantier?.poseUniquement

  const dernierEtat = await prisma.etatAvancement.findFirst({
    where: { chantierId: chantierCuid },
    orderBy: { numero: 'desc' },
    include: { lignes: true },
  })

  if (!dernierEtat || dernierEtat.lignes.length === 0) {
    return { etatNumero: dernierEtat?.numero ?? null, poseUniquement, lignes: [], aTraiter: 0 }
  }

  const idsLignesCommande = [
    ...new Set(dernierEtat.lignes.map((l) => l.ligneCommandeId).filter((v): v is number => !!v)),
  ]
  const lignesCommande = await prisma.ligneCommande.findMany({
    where: { id: { in: idsLignesCommande } },
    select: {
      id: true,
      article: true,
      description: true,
      unite: true,
      type: true,
      categorieMateriau: true,
      coutMatiereM2: true,
    },
  })
  const ligneCommandeParId = new Map<number, LigneCommandeMatiere>(
    lignesCommande.map((l) => [l.id, l])
  )

  const lignes: LigneSaisieCoutMatiere[] = []
  let aTraiter = 0

  for (const ligneEtat of dernierEtat.lignes) {
    if (ligneEtat.type === 'TITRE' || ligneEtat.type === 'SOUS_TITRE') continue
    const quantite = ligneEtat.quantiteTotale || 0
    if (quantite <= 0) continue

    const lc = ligneEtat.ligneCommandeId ? ligneCommandeParId.get(ligneEtat.ligneCommandeId) : undefined
    if (!lc) continue

    const categorie = lc.categorieMateriau
    if (!estCategorieMateriau(categorie) && categorie !== CATEGORIE_AUCUNE) aTraiter++

    lignes.push({
      ligneCommandeId: lc.id,
      article: lc.article,
      description: lc.description,
      unite: lc.unite,
      quantite,
      categorieMateriau: categorie,
      coutMatiereM2: lc.coutMatiereM2,
      // La suggestion ne sert qu'aux lignes vierges : sur une ligne déjà
      // décidée, la rappeler inviterait à défaire un choix humain.
      categorieSuggeree: categorie ? null : detecterCategorieMateriau(lc.description || lc.article),
      avertissementUnite: estCategorieMateriau(categorie)
        ? verifierUniteCategorie(categorie, lc.unite)
        : null,
    })
  }

  return { etatNumero: dernierEtat.numero, poseUniquement, lignes, aTraiter }
}

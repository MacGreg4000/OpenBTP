// Outils d'ÉCRITURE — tous avec requiresConfirmation : l'agent s'arrête et
// l'utilisateur doit confirmer dans l'UI avant exécution.
// Règles : création uniquement. Aucune suppression, aucune modification,
// aucun envoi d'email, rien sur des entités verrouillées/finalisées.
import { prisma } from '@/lib/prisma/client'
import { ToolDefinition } from '../types'
import { resolveChantier, resolveSousTraitant } from './helpers'

export const creerNoteChantier: ToolDefinition = {
  name: 'creer_note_chantier',
  description: "Crée une note dans le journal d'un chantier. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      contenu: { type: 'string', description: 'Le contenu de la note' },
    },
    required: ['chantier', 'contenu'],
  },
  summarize: async (args) => {
    const res = await resolveChantier(String(args.chantier))
    const nom = res.ok ? res.value.nomChantier : String(args.chantier)
    return `Créer une note sur le chantier « ${nom} » : « ${String(args.contenu)} »`
  },
  execute: async (args, ctx) => {
    const res = await resolveChantier(String(args.chantier))
    if (!res.ok) return { erreur: res.message, candidats: res.candidats }
    const contenu = String(args.contenu || '').trim()
    if (!contenu) return { erreur: 'Le contenu de la note est vide.' }

    const note = await prisma.note.create({
      data: {
        chantierId: res.value.chantierId,
        contenu,
        createdBy: ctx.userId,
        updatedAt: new Date(),
      },
    })
    return { succes: true, chantier: res.value.nomChantier, noteId: note.id }
  },
}

export const creerTacheLogistique: ToolDefinition = {
  name: 'creer_tache_logistique',
  description:
    "Crée une tâche pour un magasinier (logistique). Si aucun magasinier n'est précisé et qu'un seul est actif, il est assigné automatiquement. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      titre: { type: 'string', description: 'Titre de la tâche' },
      description: { type: 'string', description: 'Description détaillée (optionnel)' },
      date_execution: { type: 'string', description: "Date d'exécution (YYYY-MM-DD). Défaut : aujourd'hui." },
      magasinier: { type: 'string', description: 'Nom ou id du magasinier (optionnel si un seul actif)' },
    },
    required: ['titre'],
  },
  summarize: (args) => {
    const date = args.date_execution ? ` pour le ${String(args.date_execution)}` : ''
    const mag = args.magasinier ? ` (magasinier : ${String(args.magasinier)})` : ''
    return `Créer la tâche logistique « ${String(args.titre)} »${date}${mag}`
  },
  execute: async (args, ctx) => {
    let magasinier: { id: string; nom: string } | null = null
    if (args.magasinier) {
      const ref = String(args.magasinier).trim()
      magasinier = await prisma.magasinier.findFirst({
        where: { OR: [{ id: ref }, { nom: { contains: ref } }], actif: true },
        select: { id: true, nom: true },
      })
      if (!magasinier) return { erreur: `Aucun magasinier actif trouvé pour « ${ref} ».` }
    } else {
      const actifs = await prisma.magasinier.findMany({
        where: { actif: true },
        select: { id: true, nom: true },
      })
      if (actifs.length === 0) return { erreur: 'Aucun magasinier actif.' }
      if (actifs.length > 1) {
        return {
          erreur: 'Plusieurs magasiniers actifs : précisez lequel.',
          candidats: actifs,
        }
      }
      magasinier = actifs[0]
    }

    const dateExecution = args.date_execution ? new Date(String(args.date_execution)) : new Date()
    if (Number.isNaN(dateExecution.getTime())) return { erreur: 'Date d\'exécution invalide (format attendu YYYY-MM-DD).' }

    const tache = await prisma.tacheMagasinier.create({
      data: {
        titre: String(args.titre),
        description: args.description ? String(args.description) : null,
        dateExecution,
        magasinierId: magasinier.id,
        creePar: ctx.userId,
      },
    })
    return { succes: true, tacheId: tache.id, magasinier: magasinier.nom, dateExecution }
  },
}

interface LigneCommandeInput {
  article?: string
  description: string
  type?: string
  unite?: string
  prixUnitaire: number
  quantite: number
}

export const creerCommandeST: ToolDefinition = {
  name: 'creer_commande_st',
  description:
    "Crée une commande sous-traitant en BROUILLON (non verrouillée) avec ses lignes. L'utilisateur la validera ensuite dans l'application. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      sous_traitant: { type: 'string', description: 'Identifiant ou nom du sous-traitant' },
      taux_tva: { type: 'number', description: 'Taux de TVA en % (défaut 0 — autoliquidation)' },
      lignes: {
        type: 'array',
        description: 'Les lignes de la commande',
        items: {
          type: 'object',
          properties: {
            article: { type: 'string', description: "Code article (optionnel)" },
            description: { type: 'string', description: 'Description du poste' },
            type: { type: 'string', enum: ['QP', 'FF'], description: 'QP (quantité présumée) ou FF (forfait). Défaut QP.' },
            unite: { type: 'string', description: 'Unité (m², h, pce…)' },
            prixUnitaire: { type: 'number', description: 'Prix unitaire HT' },
            quantite: { type: 'number', description: 'Quantité' },
          },
          required: ['description', 'prixUnitaire', 'quantite'],
        },
      },
    },
    required: ['chantier', 'sous_traitant', 'lignes'],
  },
  summarize: async (args) => {
    const [ch, st] = await Promise.all([
      resolveChantier(String(args.chantier)),
      resolveSousTraitant(String(args.sous_traitant)),
    ])
    const lignes = Array.isArray(args.lignes) ? (args.lignes as LigneCommandeInput[]) : []
    const total = lignes.reduce((s, l) => s + (Number(l.prixUnitaire) || 0) * (Number(l.quantite) || 0), 0)
    return `Créer une commande BROUILLON pour ${st.ok ? st.value.nom : String(args.sous_traitant)} sur le chantier « ${
      ch.ok ? ch.value.nomChantier : String(args.chantier)
    } » — ${lignes.length} ligne(s), total HT ${total.toLocaleString('fr-FR')} €`
  },
  execute: async (args) => {
    const ch = await resolveChantier(String(args.chantier))
    if (!ch.ok) return { erreur: ch.message, candidats: ch.candidats }
    const st = await resolveSousTraitant(String(args.sous_traitant))
    if (!st.ok) return { erreur: st.message, candidats: st.candidats }

    const lignesInput = Array.isArray(args.lignes) ? (args.lignes as LigneCommandeInput[]) : []
    if (lignesInput.length === 0) return { erreur: 'Aucune ligne fournie.' }
    for (const l of lignesInput) {
      if (!l.description || !Number.isFinite(Number(l.prixUnitaire)) || !Number.isFinite(Number(l.quantite))) {
        return { erreur: 'Chaque ligne doit avoir description, prixUnitaire et quantite numériques.' }
      }
    }

    const tauxTVA = Number.isFinite(Number(args.taux_tva)) ? Number(args.taux_tva) : 0
    const sousTotal = lignesInput.reduce((s, l) => s + Number(l.prixUnitaire) * Number(l.quantite), 0)
    const tva = (sousTotal * tauxTVA) / 100

    const commande = await prisma.commandeSousTraitant.create({
      data: {
        chantierId: ch.value.id, // CommandeSousTraitant → Chantier.id
        soustraitantId: st.value.id,
        statut: 'BROUILLON',
        estVerrouillee: false,
        tauxTVA,
        sousTotal,
        tva,
        total: sousTotal + tva,
        lignes: {
          create: lignesInput.map((l, i) => ({
            ordre: i + 1,
            article: l.article ? String(l.article) : String(i + 1),
            description: String(l.description),
            type: l.type === 'FF' ? 'FF' : 'QP',
            unite: l.unite ? String(l.unite) : 'fft',
            prixUnitaire: Number(l.prixUnitaire),
            quantite: Number(l.quantite),
            total: Number(l.prixUnitaire) * Number(l.quantite),
          })),
        },
      },
      select: { id: true, total: true },
    })
    return {
      succes: true,
      commandeId: commande.id,
      chantier: ch.value.nomChantier,
      sousTraitant: st.value.nom,
      totalTTC: commande.total,
      info: 'Commande créée en BROUILLON, à vérifier et verrouiller dans l\'application.',
    }
  },
}

export const ajouterAvenantEtat: ToolDefinition = {
  name: 'ajouter_avenant_etat',
  description:
    "Ajoute un avenant (travaux supplémentaires) à un état d'avancement client NON finalisé d'un chantier. Nécessite la confirmation de l'utilisateur.",
  requiresConfirmation: true,
  parameters: {
    type: 'object',
    properties: {
      chantier: { type: 'string', description: 'Identifiant ou nom du chantier' },
      etat: { type: 'number', description: "Numéro de l'état d'avancement. Défaut : le dernier état non finalisé." },
      description: { type: 'string', description: "Description de l'avenant" },
      prix_unitaire: { type: 'number', description: 'Prix unitaire HT' },
      quantite: { type: 'number', description: 'Quantité (défaut 1)' },
      unite: { type: 'string', description: 'Unité (défaut fft)' },
    },
    required: ['chantier', 'description', 'prix_unitaire'],
  },
  summarize: async (args) => {
    const ch = await resolveChantier(String(args.chantier))
    const quantite = Number.isFinite(Number(args.quantite)) ? Number(args.quantite) : 1
    const montant = Number(args.prix_unitaire) * quantite
    return `Ajouter un avenant de ${montant.toLocaleString('fr-FR')} € HT sur le chantier « ${
      ch.ok ? ch.value.nomChantier : String(args.chantier)
    } » : « ${String(args.description)} »`
  },
  execute: async (args) => {
    const ch = await resolveChantier(String(args.chantier))
    if (!ch.ok) return { erreur: ch.message, candidats: ch.candidats }

    const etatWhere: Record<string, unknown> = { chantierId: ch.value.id, estFinalise: false }
    if (args.etat !== undefined && args.etat !== null) etatWhere.numero = Number(args.etat)
    const etat = await prisma.etatAvancement.findFirst({
      where: etatWhere,
      orderBy: { numero: 'desc' },
      select: { id: true, numero: true, avenants: { select: { id: true } } },
    })
    if (!etat) {
      return {
        erreur: args.etat
          ? `Aucun état d'avancement n°${Number(args.etat)} non finalisé sur ce chantier.`
          : "Aucun état d'avancement non finalisé sur ce chantier.",
      }
    }

    const prixUnitaire = Number(args.prix_unitaire)
    const quantite = Number.isFinite(Number(args.quantite)) ? Number(args.quantite) : 1
    if (!Number.isFinite(prixUnitaire)) return { erreur: 'Prix unitaire invalide.' }
    const montant = prixUnitaire * quantite

    const avenant = await prisma.avenantEtatAvancement.create({
      data: {
        etatAvancementId: etat.id,
        article: `AV-${etat.avenants.length + 1}`,
        description: String(args.description),
        type: 'QP',
        unite: args.unite ? String(args.unite) : 'fft',
        prixUnitaire,
        quantite,
        quantiteActuelle: quantite,
        quantiteTotale: quantite,
        montantActuel: montant,
        montantTotal: montant,
      },
      select: { id: true, article: true },
    })
    return {
      succes: true,
      chantier: ch.value.nomChantier,
      etatNumero: etat.numero,
      avenant: avenant.article,
      montantHT: montant,
    }
  },
}

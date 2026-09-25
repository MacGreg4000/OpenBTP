// Génération (si nécessaire) et envoi d'un contrat-cadre en signature.
//
// Partagé par le bouton « Envoyer / Renouveler » (POST envoyer-contrat) et
// par le renouvellement automatique quotidien : même règles, même email.

import { prisma } from '@/lib/prisma/client'
import { sendContractSignatureEmail } from '@/lib/email-sender'
import { generateContratSoustraitance } from '@/lib/contrat-generator'
import { ContratIncompletError } from '@/lib/contract-generator-puppeteer'
import { champsRepresentantManquants } from '@/lib/soustraitants/representant'
import { notifier } from '@/lib/services/notificationService'

export interface ResultatEnvoiContrat {
  ok: boolean
  erreur?: string
  /** Code HTTP à renvoyer par la route en cas d'erreur */
  status?: number
  destinataire?: string
}

export async function envoyerContratEnSignature(soustraitantId: string, userId: string): Promise<ResultatEnvoiContrat> {
  try {
    const soustraitant = await prisma.soustraitant.findUnique({ where: { id: soustraitantId } })
    if (!soustraitant) return { ok: false, erreur: 'Sous-traitant non trouvé', status: 404 }
    if (!soustraitant.email) {
      return { ok: false, erreur: 'Le sous-traitant n\'a pas d\'adresse email', status: 400 }
    }

    // Contrat-cadre v2 : pas d'envoi en signature sans représentant complet —
    // y compris quand un ancien contrat non signé serait simplement renvoyé.
    const manquants = champsRepresentantManquants(soustraitant)
    if (manquants.length > 0) {
      return {
        ok: false,
        erreur: `Contrat non envoyé — à compléter sur la fiche du sous-traitant : ${manquants.join(', ')}.`,
        status: 400,
      }
    }

    // Réutiliser un contrat non signé existant — mais seulement s'il a été
    // généré avec le template actuellement actif. Un ancien contrat (v1, sans
    // représentant ni nouvelles clauses) ne doit pas repartir en signature
    // après l'activation d'un nouveau template : on en génère un neuf.
    const templateActif = await prisma.contractTemplate.findFirst({
      where: { isActive: true, category: 'CONTRAT' },
      select: { name: true },
    })
    const existingContract = await prisma.contrat.findFirst({
      where: {
        soustraitantId,
        estSigne: false,
        templateVersion: templateActif?.name ?? '__aucun__',
      },
      orderBy: { dateGeneration: 'desc' },
    })

    let token: string
    if (existingContract && existingContract.token) {
      token = existingContract.token
    } else {
      await generateContratSoustraitance(soustraitantId, userId)
      const newContract = await prisma.contrat.findFirst({
        where: { soustraitantId, estSigne: false },
        orderBy: { dateGeneration: 'desc' },
      })
      if (!newContract || !newContract.token) {
        return { ok: false, erreur: 'Erreur lors de la génération du contrat', status: 500 }
      }
      token = newContract.token
    }

    const companySettings = await prisma.companysettings.findFirst()
    const companyName = companySettings?.name || 'Secotech'
    // Toujours une copie à l'adresse principale de l'entreprise
    // (emailCc configuré dans les paramètres sera aussi ajouté automatiquement)
    const companyEmail = companySettings?.email || undefined

    // Le lien de signature va au représentant — c'est lui qui signe.
    const destinataire = soustraitant.representantEmail || soustraitant.email
    const emailSent = await sendContractSignatureEmail(destinataire, soustraitant.nom, companyName, token, companyEmail)
    if (!emailSent) return { ok: false, erreur: 'Erreur lors de l\'envoi de l\'email', status: 500 }
    await prisma.contrat.update({ where: { token }, data: { dateEnvoi: new Date() } })

    // 🔔 NOTIFICATION : Contrat généré et envoyé
    await notifier({
      code: 'CONTRAT_GENERE',
      rolesDestinataires: ['ADMIN'],
      metadata: { soustraitantId: soustraitant.id, soustraitantNom: soustraitant.nom },
    })

    return { ok: true, destinataire }
  } catch (error: unknown) {
    if (error instanceof ContratIncompletError) return { ok: false, erreur: error.message, status: 400 }
    console.error('Erreur lors de l\'envoi du contrat:', error)
    return { ok: false, erreur: 'Erreur lors de l\'envoi du contrat', status: 500 }
  }
}

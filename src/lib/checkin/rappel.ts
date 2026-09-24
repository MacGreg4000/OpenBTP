// Contenu de l'email de rappel Checkinatwork quotidien (FR + PT).
//
// Module pur (sans Prisma) : le texte exact produit ici est envoyé ET copié
// tel quel dans le journal des rappels, qui sert de preuve à l'inspection.
//
// Le texte est volontairement dans le code et non éditable dans les réglages :
// c'est un texte juridique, relu une fois ; une modification doit laisser une
// trace dans l'historique git.

export interface DonneesRappel {
  /** Date du rappel AAAA-MM-JJ (Europe/Brussels) */
  dateRappel: string
  soustraitantNom: string
  /** Référence CT-… du contrat-cadre signé */
  contratReference: string | null
  /** true si le contrat signé contient les clauses v2 (art. 8.6.3, 8.8) */
  contratV2: boolean
  lien: string
  societe: { nom: string; adresse: string; tva: string }
}

export interface ContenuRappel {
  objet: string
  texte: string
  html: string
}

function dateFr(iso: string): string {
  const [a, m, j] = iso.split('-')
  return `${j}/${m}/${a}`
}

function echapper(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function construireRappel(d: DonneesRappel): ContenuRappel {
  const date = dateFr(d.dateRappel)
  const ref = d.contratReference ? ` ${d.contratReference}` : ''
  const objet = `Check-in Checkinatwork obligatoire – ${date} – ${d.societe.nom}`

  // Contrat v1 : pas d'art. 8.6.3 / 8.8 → mention générique (spec 3.2).
  const exclusionFr = d.contratV2
    ? 'Elle sera exclue immédiatement, sans indemnité ni prolongation de délai\n(article 8.6.3 du contrat-cadre).'
    : 'Elle sera exclue immédiatement, sans indemnité ni prolongation de délai,\nconformément au contrat-cadre et à la législation applicable.'
  const refacturationFr = d.contratV2
    ? 'Toute amende, sanction ou frais résultant d\'un manquement vous sera intégralement\nrefacturé (articles 8.7 et 8.8 du contrat-cadre).'
    : 'Toute amende, sanction ou frais résultant d\'un manquement vous sera intégralement\nrefacturé, conformément au contrat-cadre et à la législation applicable.'
  const refacturationPt = d.contratV2
    ? 'Qualquer multa será integralmente refaturada (artigos 8.7 e 8.8).'
    : 'Qualquer multa será integralmente refaturada, nos termos do contrato-quadro e da legislação aplicável.'
  const pied = `${d.societe.nom} – ${d.societe.adresse} – ${d.societe.tva}`

  const texte = [
    `Madame, Monsieur,`,
    ``,
    `Destinataire : ${d.soustraitantNom}`,
    ``,
    `RAPPEL QUOTIDIEN – ENREGISTREMENT DES PRÉSENCES (CHECKINATWORK) ET LIMOSA`,
    ``,
    `1. OBLIGATION LÉGALE`,
    `Conformément à l'article 31quinquies de la loi du 4 août 1996 relative au bien-être`,
    `des travailleurs, chaque personne qui pénètre sur un chantier pour votre compte`,
    `(salarié, associé, gérant, indépendant, intérimaire) doit être enregistrée dans`,
    `Checkinatwork AVANT d'entrer sur le chantier.`,
    `Pour les personnes détachées, la déclaration LIMOSA doit être faite AVANT le début`,
    `du travail et l'accusé de réception L-1 doit pouvoir être présenté sur chantier`,
    `(article 155 de la loi-programme du 27 décembre 2006).`,
    ``,
    `2. VOS OBLIGATIONS CONTRACTUELLES`,
    `Ces obligations vous incombent en vertu des articles 8.5 et 8.6 du contrat-cadre`,
    `de sous-traitance${ref} signé avec ${d.societe.nom}.`,
    ``,
    `3. ACCÈS AU CHANTIER`,
    `TOUTE PERSONNE NON ENREGISTRÉE N'EST PAS AUTORISÉE SUR LE CHANTIER.`,
    exclusionFr,
    refacturationFr,
    ``,
    `4. NUMÉROS D'ENREGISTREMENT DES CHANTIERS`,
    `Retrouvez les numéros Checkinatwork, clients et adresses de tous les chantiers`,
    `${d.societe.nom} en préparation et en cours ici :`,
    d.lien,
    ``,
    `Merci de transmettre ce rappel à chaque personne que vous envoyez sur nos chantiers.`,
    ``,
    pied,
    ``,
    `-------------------------------------------------------------------------------`,
    ``,
    `LEMBRETE DIÁRIO – REGISTO DE PRESENÇAS (CHECKINATWORK) E LIMOSA`,
    ``,
    `1. OBRIGAÇÃO LEGAL: cada pessoa que entra numa obra por vossa conta (trabalhador,`,
    `sócio, gerente, independente) deve estar registada no Checkinatwork ANTES de entrar`,
    `na obra. Para pessoas destacadas, a declaração LIMOSA deve ser feita ANTES do início`,
    `do trabalho e o comprovativo L-1 deve poder ser apresentado na obra.`,
    `2. Estas obrigações resultam dos artigos 8.5 e 8.6 do contrato-quadro${ref}.`,
    `3. QUALQUER PESSOA NÃO REGISTADA NÃO ESTÁ AUTORIZADA NA OBRA e será retirada`,
    `imediatamente. ${refacturationPt}`,
    `4. Números Checkinatwork e moradas das obras: ${d.lien}`,
  ].join('\n')

  // HTML : même texte, mise en forme minimale (meilleure délivrabilité, lisible
  // sur mobile). Le lien est cliquable ; les lignes gardent leurs retours.
  const lienHtml = `<a href="${echapper(d.lien)}">${echapper(d.lien)}</a>`
  const corps = echapper(texte)
    .split(echapper(d.lien))
    .join(lienHtml)
    .replace(/\n/g, '<br>\n')
  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>${echapper(objet)}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#111">
<div style="max-width:680px;margin:0 auto;padding:16px">
<p style="background:#b91c1c;color:#fff;font-weight:bold;padding:10px 12px;margin:0 0 16px">
TOUTE PERSONNE NON ENREGISTRÉE N'EST PAS AUTORISÉE SUR LE CHANTIER.<br>
QUALQUER PESSOA NÃO REGISTADA NÃO ESTÁ AUTORIZADA NA OBRA.
</p>
<div>${corps}</div>
</div>
</body></html>`

  return { objet, texte, html }
}

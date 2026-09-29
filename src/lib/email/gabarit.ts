// Gabarit commun des emails envoyés par OpenBTP.
//
// Couleurs de l'identité OpenBTP : bleu nuit #05122B, orange #FF6B00.
// Mise en page en TABLEAUX et styles EN LIGNE uniquement : Outlook, Gmail et
// d'autres ignorent les <style> et les dégradés CSS — c'est ce qui donnait
// des en-têtes vides et des boutons illisibles. Pas d'image : un logo distant
// est bloqué par défaut dans la plupart des messageries.
//
// Module pur : les textes sont échappés par l'appelant (echapperHtml) —
// contenuHtml est inséré tel quel.

export const COULEURS_EMAIL = {
  nuit: '#05122B',
  orange: '#FF6B00',
  texte: '#1F2937',
  texteDoux: '#6B7280',
  fond: '#F3F4F6',
  bordure: '#E5E7EB',
  encadre: '#FFF7ED',
} as const

export function echapperHtml(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Texte brut → paragraphes HTML (retours à la ligne conservés). */
export function texteEnHtml(texte: string): string {
  return echapperHtml(texte).replace(/\r?\n/g, '<br>')
}

export interface GabaritEmail {
  /** Titre affiché en haut du contenu */
  titre: string
  /** Aperçu affiché par la messagerie à côté de l'objet (caché dans l'email) */
  apercu?: string
  /** Contenu principal, en HTML déjà échappé */
  contenuHtml: string
  bouton?: { libelle: string; url: string }
  /** Affiche aussi l'adresse du bouton en clair (lien de secours) */
  lienEnClair?: boolean
  /** Petite mention sous le contenu (ex. « Cet email a été envoyé automatiquement ») */
  mention?: string
  /** Bandeau d'alerte en tête (texte brut, peut contenir des retours à la ligne) */
  bandeau?: { texte: string; couleur?: string }
  societe: { nom: string; adresse?: string; tva?: string }
}

/** Paragraphe standard. */
export function paragraphe(html: string): string {
  return `<p style="margin:0 0 16px 0;font-size:15px;line-height:24px;color:${COULEURS_EMAIL.texte};">${html}</p>`
}

/** Encadré mis en avant (bord gauche orange). */
export function encadre(html: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">
<tr><td style="background:${COULEURS_EMAIL.encadre};border-left:4px solid ${COULEURS_EMAIL.orange};border-radius:6px;padding:14px 16px;font-size:15px;line-height:23px;color:${COULEURS_EMAIL.texte};">${html}</td></tr>
</table>`
}

/** Liste à puces simple. */
export function liste(elements: string[]): string {
  return `<ul style="margin:0 0 16px 0;padding-left:20px;font-size:15px;line-height:24px;color:${COULEURS_EMAIL.texte};">${elements
    .map((e) => `<li style="margin:0 0 4px 0;">${e}</li>`)
    .join('')}</ul>`
}

/** Fiche libellé / valeur (valeurs en HTML déjà échappé). */
export function ficheInfos(lignes: [string, string][]): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;border:1px solid ${COULEURS_EMAIL.bordure};border-radius:8px;">
${lignes
  .map(
    ([libelle, valeur], i) => `<tr>
<td valign="top" style="width:140px;padding:10px 14px;${i ? `border-top:1px solid ${COULEURS_EMAIL.bordure};` : ''}font-size:12px;line-height:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:${COULEURS_EMAIL.texteDoux};">${echapperHtml(libelle)}</td>
<td style="padding:10px 14px;${i ? `border-top:1px solid ${COULEURS_EMAIL.bordure};` : ''}font-size:15px;line-height:22px;color:${COULEURS_EMAIL.texte};">${valeur}</td>
</tr>`
  )
  .join('')}
</table>`
}

/** Sous-titre de section. */
export function sousTitre(texte: string): string {
  return `<h2 style="margin:24px 0 8px 0;font-size:16px;line-height:22px;font-weight:700;color:${COULEURS_EMAIL.nuit};">${texte}</h2>`
}

export function gabaritEmail(o: GabaritEmail): string {
  const c = COULEURS_EMAIL
  const nom = echapperHtml(o.societe.nom || 'OpenBTP')
  const pied = [o.societe.nom, o.societe.adresse, o.societe.tva].filter(Boolean).map((x) => echapperHtml(x)).join(' · ')

  const bouton = o.bouton
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;">
<tr><td style="border-radius:8px;background:${c.orange};">
<a href="${echapperHtml(o.bouton.url)}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${echapperHtml(o.bouton.libelle)}</a>
</td></tr></table>${
        o.lienEnClair
          ? `<p style="margin:0 0 20px 0;font-size:13px;line-height:20px;color:${c.texteDoux};">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><a href="${echapperHtml(o.bouton.url)}" style="color:${c.orange};word-break:break-all;">${echapperHtml(o.bouton.url)}</a></p>`
          : ''
      }`
    : ''

  const bandeau = o.bandeau
    ? `<tr><td style="background:${o.bandeau.couleur || '#B91C1C'};padding:12px 32px;font-size:13px;line-height:20px;font-weight:700;color:#ffffff;">${texteEnHtml(o.bandeau.texte)}</td></tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${echapperHtml(o.titre)}</title>
</head>
<body style="margin:0;padding:0;background:${c.fond};font-family:Arial,Helvetica,sans-serif;">
${o.apercu ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${echapperHtml(o.apercu)}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.fond};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${c.bordure};">
<tr><td style="background:${c.nuit};padding:20px 32px;">
<span style="font-size:18px;line-height:24px;font-weight:700;color:#ffffff;letter-spacing:0.2px;">${nom}</span>
</td></tr>
<tr><td style="background:${c.orange};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
${bandeau}
<tr><td style="padding:32px 32px 12px 32px;">
<h1 style="margin:0 0 20px 0;font-size:22px;line-height:30px;font-weight:700;color:${c.nuit};">${echapperHtml(o.titre)}</h1>
${o.contenuHtml}
${bouton}
</td></tr>
${o.mention ? `<tr><td style="padding:0 32px 24px 32px;"><p style="margin:0;padding-top:16px;border-top:1px solid ${c.bordure};font-size:12px;line-height:18px;color:${c.texteDoux};">${echapperHtml(o.mention)}</p></td></tr>` : ''}
</table>
${pied ? `<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:${c.texteDoux};text-align:center;">${pied}</p>` : ''}
</td></tr>
</table>
</body>
</html>`
}

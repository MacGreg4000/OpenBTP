import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'

const formatPrix = (val: number | null | undefined) =>
  val != null ? val.toFixed(2).replace('.', ',') + ' €' : '—'

export async function generateListePrixPDF(soustraitantId: string): Promise<Buffer | null> {
  const st = await prisma.soustraitant.findUnique({
    where: { id: soustraitantId },
    select: {
      nom: true,
      email: true,
      telephone: true,
      adresse: true,
      tva: true,
      conditionsGenerales: true,
      conditionsParticulieres: true,
      tarifs: {
        orderBy: { ordre: 'asc' },
      },
    },
  })

  if (!st) return null

  const company = await PDFGenerator.getCompanySettings()
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

  const logoImg = company?.logo
    ? `<img src="${company.logo}" alt="Logo" class="logo" />`
    : ''

  // ── Lignes du tableau ──────────────────────────────────────────────────────
  const lignesHtml = st.tarifs.map((l) => {
    if (l.type === 'TITRE') {
      return `
        <tr class="row-titre">
          <td colspan="5" class="cell titre-cell">${escHtml(l.descriptif)}</td>
        </tr>`
    }
    if (l.type === 'SOUS_TITRE') {
      return `
        <tr class="row-sous-titre">
          <td colspan="5" class="cell sous-titre-cell">${escHtml(l.descriptif)}</td>
        </tr>`
    }
    return `
      <tr class="row-ligne">
        <td class="cell article">${escHtml(l.article ?? '')}</td>
        <td class="cell descriptif">${escHtml(l.descriptif)}</td>
        <td class="cell center">${escHtml(l.unite ?? '')}</td>
        <td class="cell right prix">${formatPrix(l.prixUnitaire)}</td>
        <td class="cell remarques">${escHtml(l.remarques ?? '')}</td>
      </tr>`
  }).join('')

  // ── Sections conditions ────────────────────────────────────────────────────
  const condGenHtml = st.conditionsGenerales
    ? `<section class="conditions">
        <h2 class="cond-title">Conditions Générales</h2>
        <div class="cond-body">${nlToBr(escHtml(st.conditionsGenerales))}</div>
       </section>`
    : ''

  const condPartHtml = st.conditionsParticulieres
    ? `<section class="conditions">
        <h2 class="cond-title">Conditions Particulières</h2>
        <div class="cond-body">${nlToBr(escHtml(st.conditionsParticulieres))}</div>
       </section>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Liste de prix — ${escHtml(st.nom)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 11px;
      color: #111827;
      padding: 20px 24px;
    }

    /* ── En-tête ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
      padding-bottom: 14px;
      border-bottom: 2px solid #d97706;
    }
    .logo { max-height: 64px; max-width: 180px; object-fit: contain; }
    .company { text-align: right; font-size: 10px; line-height: 1.5; color: #374151; }
    .company strong { font-size: 12px; color: #111827; }

    /* ── Titre document ── */
    .doc-title {
      text-align: center;
      margin-bottom: 14px;
    }
    .doc-title h1 {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #92400e;
    }
    .doc-title .sous-titre {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }

    /* ── Bloc sous-traitant ── */
    .st-bloc {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 10.5px;
    }
    .st-bloc strong { font-size: 13px; color: #92400e; }
    .st-meta { display: flex; gap: 24px; margin-top: 4px; color: #6b7280; }

    /* ── Tableau ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    thead tr {
      background: #92400e;
      color: #fff;
    }
    thead th {
      padding: 6px 8px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    thead th.center { text-align: center; }
    thead th.right  { text-align: right; }

    .cell {
      border-bottom: 1px solid #e5e7eb;
      padding: 5px 8px;
      vertical-align: top;
    }
    .article   { width: 10%; color: #6b7280; font-size: 10px; }
    .descriptif{ width: 38%; }
    .center    { width: 8%;  text-align: center; }
    .prix      { width: 12%; font-weight: 600; color: #92400e; }
    .remarques { width: 32%; color: #6b7280; font-size: 10px; font-style: italic; }

    .row-titre td.titre-cell {
      background: #fef3c7;
      font-weight: 700;
      font-size: 12px;
      color: #78350f;
      padding: 6px 10px;
      border-bottom: 1px solid #fcd34d;
      border-left: 3px solid #d97706;
    }
    .row-sous-titre td.sous-titre-cell {
      background: #f9fafb;
      font-weight: 600;
      font-size: 11px;
      color: #374151;
      padding: 5px 10px;
      border-bottom: 1px solid #e5e7eb;
      border-left: 3px solid #9ca3af;
    }
    .row-ligne:hover td { background: #fafaf9; }

    /* ── Conditions ── */
    .conditions {
      margin-bottom: 14px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .cond-title {
      background: #f3f4f6;
      padding: 6px 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    .cond-body {
      padding: 10px 12px;
      font-size: 10.5px;
      line-height: 1.6;
      color: #374151;
      white-space: pre-wrap;
    }

    /* ── Signature ── */
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      gap: 24px;
      page-break-inside: avoid;
    }
    .sig-bloc {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 12px;
    }
    .sig-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 6px;
    }
    .sig-line {
      margin-top: 48px;
      border-top: 1px solid #9ca3af;
      font-size: 9px;
      color: #9ca3af;
      padding-top: 3px;
    }

    /* ── Pied de page ── */
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #9ca3af;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- En-tête -->
  <header class="header">
    <div>${logoImg}</div>
    <div class="company">
      <strong>${escHtml(company?.nomEntreprise ?? '')}</strong><br/>
      ${company?.adresse ? escHtml(company.adresse) + '<br/>' : ''}
      ${company?.telephone ? 'Tél : ' + escHtml(company.telephone) + '<br/>' : ''}
      ${company?.email ? escHtml(company.email) + '<br/>' : ''}
      ${company?.siret ? 'TVA : ' + escHtml(company.siret) : ''}
    </div>
  </header>

  <!-- Titre -->
  <div class="doc-title">
    <h1>Liste de Prix</h1>
    <div class="sous-titre">Tarifs contractuels — ${dateStr}</div>
  </div>

  <!-- Bloc sous-traitant -->
  <div class="st-bloc">
    <strong>${escHtml(st.nom)}</strong>
    <div class="st-meta">
      ${st.email ? `<span>✉ ${escHtml(st.email)}</span>` : ''}
      ${st.telephone ? `<span>✆ ${escHtml(st.telephone)}</span>` : ''}
      ${st.tva ? `<span>TVA : ${escHtml(st.tva)}</span>` : ''}
      ${st.adresse ? `<span>${escHtml(st.adresse)}</span>` : ''}
    </div>
  </div>

  <!-- Tableau des prix -->
  <table>
    <thead>
      <tr>
        <th>Article</th>
        <th>Descriptif</th>
        <th class="center">Unité</th>
        <th class="right">Prix HT</th>
        <th>Remarques</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHtml || '<tr><td colspan="5" style="text-align:center;padding:16px;color:#9ca3af;">Aucune ligne de prix</td></tr>'}
    </tbody>
  </table>

  <!-- Conditions -->
  ${condGenHtml}
  ${condPartHtml}

  <!-- Zone signature -->
  <div class="signatures">
    <div class="sig-bloc">
      <div class="sig-label">Pour ${escHtml(company?.nomEntreprise ?? 'Notre société')}</div>
      <div class="sig-line">Signature et cachet</div>
    </div>
    <div class="sig-bloc">
      <div class="sig-label">Pour ${escHtml(st.nom)}</div>
      <div class="sig-line">Signature et cachet</div>
    </div>
  </div>

  <!-- Pied de page -->
  <div class="footer">
    <span>Document généré le ${new Date().toLocaleString('fr-FR')}</span>
    <span>Tarifs HT — TVA non incluse</span>
  </div>

</body>
</html>`

  return PDFGenerator.generatePDF(html, {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '12mm', right: '14mm', bottom: '14mm', left: '14mm' },
  })
}

function escHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function nlToBr(str: string): string {
  return str.replace(/\n/g, '<br/>')
}

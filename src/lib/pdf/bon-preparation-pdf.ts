import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'

type LigneBonPrep = {
  description: string
  quantite: number | string
  unite: string
}

export async function generateBonPreparationPDF(bonId: string): Promise<Buffer | null> {
  const bon = await prisma.bonPreparation.findUnique({
    where: { id: bonId },
    include: {
      magasinier: { select: { nom: true } },
    },
  })

  if (!bon) return null

  const company = await PDFGenerator.getCompanySettings()

  const dateStr = bon.createdAt
    ? bon.createdAt.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  const lignes = (bon.lignes as unknown as LigneBonPrep[]) || []

  const lignesRows = lignes
    .map(
      (l, idx) => `
      <tr>
        <td class="cell index">${idx + 1}</td>
        <td class="cell desc">${l.description || ''}</td>
        <td class="cell qty">${l.quantite ?? ''}</td>
        <td class="cell unit">${l.unite || ''}</td>
      </tr>`
    )
    .join('')

  const logoImg = company?.logo
    ? `<img src="${company.logo}" alt="Logo" class="logo" />`
    : ''

  const html = `<!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charSet="utf-8" />
    <title>Bon de préparation</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 12px;
        color: #111827;
        padding: 20px;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .logo {
        max-height: 60px;
        max-width: 180px;
        object-fit: contain;
      }
      .company {
        text-align: right;
        font-size: 11px;
        line-height: 1.4;
      }
      .title {
        text-align: center;
        margin-bottom: 16px;
      }
      .title h1 {
        font-size: 20px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        margin-bottom: 16px;
        font-size: 11px;
      }
      .meta-block {
        border: 1px solid #9ca3af;
        border-radius: 8px;
        padding: 8px 10px;
        min-width: 45%;
      }
      .meta-label {
        text-transform: uppercase;
        font-size: 9px;
        color: #6b7280;
        margin-bottom: 2px;
      }
      .meta-value {
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 8px;
      }
      th {
        background: #f3f4f6;
        border: 1px solid #9ca3af;
        padding: 4px 6px;
        font-size: 10px;
        text-transform: uppercase;
        text-align: left;
      }
      .cell {
        border: 1px solid #d1d5db;
        padding: 4px 6px;
        font-size: 11px;
        vertical-align: top;
      }
      .cell.index { width: 6%; text-align: center; color: #6b7280; }
      .cell.desc { width: 64%; }
      .cell.qty  { width: 15%; text-align: center; font-weight: 600; }
      .cell.unit { width: 15%; text-align: center; color: #4b5563; }
      .footer {
        margin-top: 18px;
        font-size: 9px;
        color: #6b7280;
        text-align: right;
      }
    </style>
  </head>
  <body>
    <header class="header">
      <div>${logoImg}</div>
      <div class="company">
        <div style="font-weight: 700;">${company?.nomEntreprise || ''}</div>
        ${company?.adresse ? `<div>${company.adresse}</div>` : ''}
        ${company?.telephone ? `<div>Tél : ${company.telephone}</div>` : ''}
        ${company?.email ? `<div>${company.email}</div>` : ''}
        ${company?.siret ? `<div>TVA : ${company.siret}</div>` : ''}
      </div>
    </header>

    <div class="title">
      <h1>BON DE PRÉPARATION</h1>
    </div>

    <section class="meta">
      <div class="meta-block">
        <div class="meta-label">Client / Chantier</div>
        <div class="meta-value">${bon.client}</div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Localisation palette</div>
        <div class="meta-value">${bon.localisation || '—'}</div>
      </div>
    </section>

    <section class="meta">
      <div class="meta-block">
        <div class="meta-label">Magasinier</div>
        <div class="meta-value">${bon.magasinier?.nom || '—'}</div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Date</div>
        <div class="meta-value">${dateStr}</div>
      </div>
    </section>

    <table>
      <thead>
        <tr>
          <th>N°</th>
          <th>Description</th>
          <th>Qté</th>
          <th>Unité</th>
        </tr>
      </thead>
      <tbody>
        ${lignesRows}
      </tbody>
    </table>

    <div class="footer">
      Généré le ${new Date().toLocaleString('fr-FR')}
    </div>
  </body>
  </html>`

  return PDFGenerator.generatePDF(html, {
    format: 'A4',
    orientation: 'portrait',
    margins: {
      top: '10mm',
      right: '10mm',
      bottom: '12mm',
      left: '10mm',
    },
  })
}


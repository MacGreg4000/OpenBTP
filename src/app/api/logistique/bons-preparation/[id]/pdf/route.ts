import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import { PDFGenerator } from '@/lib/pdf/pdf-generator'

interface LigneBon {
  description: string
  quantite: number | string
  unite: string
}

function buildBonHtml(bon: {
  client: string
  localisation?: string | null
  lignes: LigneBon[]
  magasinier: { nom: string }
  createdAt: Date
  id: string
}, company: { nomEntreprise?: string; adresse?: string; telephone?: string; email?: string; logo?: string | null } | null): string {
  const dateStr = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date())

  const logoHtml = company?.logo
    ? `<img src="${company.logo}" alt="Logo" style="max-height:60px;max-width:180px;object-fit:contain;" />`
    : ''

  const lignesHtml = bon.lignes.map((l, i) => `
    <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8f8f8'}">
      <td style="padding:10px 8px;text-align:center;border:1px solid #ccc;font-weight:bold;color:#555;">${i + 1}</td>
      <td style="padding:10px 8px;border:1px solid #ccc;font-size:14px;">${l.description}</td>
      <td style="padding:10px 8px;text-align:center;border:1px solid #ccc;font-size:15px;font-weight:bold;">${l.quantite}</td>
      <td style="padding:10px 8px;text-align:center;border:1px solid #ccc;font-size:13px;color:#444;">${l.unite}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; padding: 0 0 16px 0; border-bottom: 3px solid #1a1a2e; margin-bottom: 20px; }
    .company-info { font-size: 12px; color: #555; line-height: 1.6; }
    .company-name { font-size: 16px; font-weight: bold; color: #1a1a2e; margin-bottom: 4px; }
    .title-block { text-align: center; margin-bottom: 24px; }
    .title { font-size: 26px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: #1a1a2e; }
    .subtitle { font-size: 12px; color: #888; margin-top: 4px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
    .info-box { border: 2px solid #1a1a2e; border-radius: 6px; padding: 12px 16px; }
    .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
    .info-value { font-size: 16px; font-weight: bold; color: #1a1a2e; }
    .magasinier-line { font-size: 12px; color: #555; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead tr { background: #1a1a2e; color: #fff; }
    thead th { padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #1a1a2e; }
    thead th:first-child { text-align: center; width: 40px; }
    thead th:nth-child(3) { text-align: center; width: 100px; }
    thead th:nth-child(4) { text-align: center; width: 80px; }
    .remarks-box { border: 1px solid #ccc; border-radius: 4px; padding: 12px; height: 80px; margin-bottom: 20px; }
    .remarks-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .footer { border-top: 1px solid #ccc; padding-top: 10px; font-size: 11px; color: #aaa; display: flex; justify-content: space-between; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body style="padding:20px;">
  <div class="header">
    <div>
      ${logoHtml}
      ${company?.nomEntreprise ? `<div class="company-name" style="margin-top:${company.logo ? '8px' : '0'}">${company.nomEntreprise}</div>` : ''}
      ${company?.adresse ? `<div class="company-info">${company.adresse}</div>` : ''}
      ${company?.telephone ? `<div class="company-info">Tél : ${company.telephone}</div>` : ''}
      ${company?.email ? `<div class="company-info">${company.email}</div>` : ''}
    </div>
    <div style="text-align:right;font-size:12px;color:#555;">
      <div>Date : <strong>${dateStr}</strong></div>
    </div>
  </div>

  <div class="title-block">
    <div class="title">BON DE PRÉPARATION</div>
    <div class="subtitle">À coller sur la palette avant expédition</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-label">Client / Chantier</div>
      <div class="info-value">${bon.client}</div>
    </div>
    <div class="info-box">
      <div class="info-label">Localisation palette</div>
      <div class="info-value">${bon.localisation || '—'}</div>
    </div>
  </div>

  <div class="magasinier-line">Assigné à : <strong>${bon.magasinier.nom}</strong></div>

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
      ${lignesHtml}
    </tbody>
  </table>

  <div class="remarks-label">Remarques</div>
  <div class="remarks-box"></div>

  <div class="footer">
    <span>Document généré par OpenBTP</span>
    <span>${dateStr}</span>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { id } = await params

    const bon = await prisma.bonPreparation.findUnique({
      where: { id },
      include: { magasinier: { select: { nom: true } } },
    })

    if (!bon) {
      return NextResponse.json({ error: 'Bon non trouvé' }, { status: 404 })
    }

    const company = await PDFGenerator.getCompanySettings()
    const lignes = bon.lignes as LigneBon[]

    const html = buildBonHtml({ ...bon, lignes }, company)
    const pdfBuffer = await PDFGenerator.generatePDF(html, { format: 'A4' })

    const nomFichier = `bon-preparation-${bon.client.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomFichier}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Erreur PDF bon-preparation:', error)
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 })
  }
}

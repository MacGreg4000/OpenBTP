import type { CompanySettings } from '@/lib/pdf/pdf-generator'

export interface BonRegieData {
  id: string | number
  dates?: string | null
  client?: string | null
  nomChantier?: string | null
  description?: string | null
  tempsChantier?: number | null
  nombreTechniciens?: number | null
  materiaux?: string | null
  nomSignataire?: string | null
  signature?: string | null
  dateSignature?: string | null
  chantierId?: string | null
}

function formatDecimal(val: number | null | undefined): string {
  if (val === null || val === undefined) return '0'
  return val % 1 === 0 ? String(val) : val.toFixed(2)
}

export function generateBonRegieHTML(data: BonRegieData, companySettings: CompanySettings | null): string {
  const logoBase64 = companySettings?.logo || null
  const nomEntreprise = companySettings?.nomEntreprise || ''
  const adresse = companySettings?.adresse || ''
  const telephone = companySettings?.telephone || ''
  const email = companySettings?.email || ''
  const tva = companySettings?.siret || ''

  const tempsChantier = data.tempsChantier || 0
  const nombreOuvriers = data.nombreTechniciens || 1
  const totalHeures = tempsChantier * nombreOuvriers

  const dateSignatureFormatee = data.dateSignature
    ? new Date(data.dateSignature).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  const dateGeneration = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de Régie — ${data.client || ''} — ${data.dates || ''}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 11pt;
      color: #1a1a2e;
      background: #fff;
    }

    /* ── PAGE ── */
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 14mm 16mm 14mm 16mm;
      position: relative;
    }

    /* ── HEADER ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8mm;
      padding-bottom: 6mm;
      border-bottom: 3px solid #1e40af;
    }

    .header-left { display: flex; align-items: center; gap: 12px; }

    .logo {
      max-height: 60px;
      max-width: 160px;
      object-fit: contain;
    }

    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 18pt;
      letter-spacing: 1px;
    }

    .company-info {
      font-size: 8.5pt;
      color: #4b5563;
      line-height: 1.55;
    }
    .company-info strong {
      font-size: 10pt;
      color: #111827;
      display: block;
      margin-bottom: 2px;
    }

    .header-right { text-align: right; }

    .doc-badge {
      background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
      color: white;
      padding: 8px 18px;
      border-radius: 8px;
      display: inline-block;
      margin-bottom: 8px;
    }
    .doc-badge-title {
      font-size: 15pt;
      font-weight: 800;
      letter-spacing: 0.5px;
      line-height: 1.2;
    }
    .doc-badge-sub {
      font-size: 8pt;
      font-weight: 400;
      opacity: 0.85;
      margin-top: 2px;
    }

    .doc-ref {
      font-size: 8.5pt;
      color: #6b7280;
    }

    /* ── INFO BLOC ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      margin-bottom: 6mm;
    }

    .info-card {
      background: #f8faff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 10px 14px;
    }

    .info-card-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }

    .info-card-value {
      font-size: 11pt;
      font-weight: 600;
      color: #111827;
    }

    /* ── TRAVAIL RÉALISÉ ── */
    .section-title {
      font-size: 9pt;
      font-weight: 700;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin-bottom: 3mm;
      padding-bottom: 2mm;
      border-bottom: 1.5px solid #bfdbfe;
    }

    .work-box {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 12px 16px;
      min-height: 32mm;
      font-size: 11pt;
      color: #1f2937;
      line-height: 1.6;
      white-space: pre-wrap;
      margin-bottom: 6mm;
      background: #fafafa;
    }

    /* ── TEMPS ── */
    .time-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 4mm;
      margin-bottom: 6mm;
    }

    .time-card {
      background: linear-gradient(135deg, #eff6ff, #dbeafe);
      border: 1px solid #bfdbfe;
      border-radius: 10px;
      padding: 12px 10px;
      text-align: center;
    }

    .time-card.total {
      background: linear-gradient(135deg, #1e40af, #2563eb);
      border-color: #1e40af;
    }

    .time-label {
      font-size: 7.5pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #1e40af;
      margin-bottom: 5px;
    }
    .time-card.total .time-label { color: rgba(255,255,255,0.8); }

    .time-value {
      font-size: 22pt;
      font-weight: 800;
      color: #1e3a8a;
      line-height: 1;
    }
    .time-card.total .time-value { color: #ffffff; }

    .time-unit {
      font-size: 9pt;
      color: #3b82f6;
      margin-top: 3px;
    }
    .time-card.total .time-unit { color: rgba(255,255,255,0.7); }

    /* ── MATÉRIAUX ── */
    .materials-box {
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 10px 16px;
      min-height: 18mm;
      font-size: 10.5pt;
      color: #374151;
      line-height: 1.6;
      background: #fafafa;
      white-space: pre-wrap;
      margin-bottom: 6mm;
    }

    .materials-empty {
      color: #9ca3af;
      font-style: italic;
    }

    /* ── SIGNATURE ── */
    .signature-row {
      display: flex;
      justify-content: flex-end;
      margin-top: 6mm;
    }

    .signature-block {
      text-align: center;
      min-width: 180px;
      max-width: 240px;
    }

    .signature-label {
      font-size: 8pt;
      font-weight: 700;
      color: #1e40af;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .signature-img-wrap {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      background: #fff;
      padding: 4px;
      margin-bottom: 6px;
      height: 55px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .signature-img {
      max-height: 50px;
      max-width: 220px;
      object-fit: contain;
    }

    .signature-name {
      font-size: 10pt;
      font-weight: 700;
      color: #111827;
      margin-bottom: 2px;
    }

    .signature-date {
      font-size: 8.5pt;
      color: #6b7280;
    }

    /* ── FOOTER ── */
    .footer {
      position: fixed;
      bottom: 8mm;
      left: 16mm;
      right: 16mm;
      border-top: 1px solid #e5e7eb;
      padding-top: 4px;
      display: flex;
      justify-content: space-between;
      font-size: 7.5pt;
      color: #9ca3af;
    }

    /* ── SECTION SPACER ── */
    .section { margin-bottom: 5mm; }
  </style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${logoBase64 && logoBase64.trim() !== ''
        ? `<img src="${logoBase64}" alt="Logo" class="logo">`
        : `<div class="logo-placeholder">${nomEntreprise.substring(0, 2).toUpperCase() || 'BT'}</div>`
      }
      ${nomEntreprise ? `
      <div class="company-info">
        <strong>${nomEntreprise}</strong>
        ${adresse ? `${adresse}<br>` : ''}
        ${telephone ? `Tél : ${telephone}<br>` : ''}
        ${email ? `${email}<br>` : ''}
        ${tva ? `TVA : ${tva}` : ''}
      </div>` : ''}
    </div>

    <div class="header-right">
      <div class="doc-badge">
        <div class="doc-badge-title">BON DE RÉGIE</div>
        <div class="doc-badge-sub">Document de suivi des travaux</div>
      </div>
      <div class="doc-ref">
        Réf. n° ${data.id} &nbsp;·&nbsp; Généré le ${dateGeneration}
      </div>
    </div>
  </div>

  <!-- INFOS GÉNÉRALES -->
  <div class="section">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-card-label">Date d'intervention</div>
        <div class="info-card-value">${data.dates || '—'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Client</div>
        <div class="info-card-value">${data.client || '—'}</div>
      </div>
      <div class="info-card">
        <div class="info-card-label">Chantier</div>
        <div class="info-card-value">${data.nomChantier || '—'}</div>
      </div>
      ${data.chantierId ? `
      <div class="info-card">
        <div class="info-card-label">Référence chantier</div>
        <div class="info-card-value" style="font-size:10pt;font-weight:500;color:#374151;">${data.chantierId}</div>
      </div>` : '<div></div>'}
    </div>
  </div>

  <!-- TRAVAIL RÉALISÉ -->
  <div class="section">
    <div class="section-title">Travail réalisé</div>
    <div class="work-box">${data.description || 'Aucune description fournie.'}</div>
  </div>

  <!-- RÉCAPITULATIF DES HEURES -->
  <div class="section">
    <div class="section-title">Récapitulatif des heures</div>
    <div class="time-grid">
      <div class="time-card">
        <div class="time-label">Temps / ouvrier</div>
        <div class="time-value">${formatDecimal(tempsChantier)}</div>
        <div class="time-unit">heure(s)</div>
      </div>
      <div class="time-card">
        <div class="time-label">Nombre d'ouvriers</div>
        <div class="time-value">${nombreOuvriers}</div>
        <div class="time-unit">ouvrier(s)</div>
      </div>
      <div class="time-card total">
        <div class="time-label">Total des heures</div>
        <div class="time-value">${formatDecimal(totalHeures)}</div>
        <div class="time-unit">heure(s)</div>
      </div>
    </div>
  </div>

  <!-- MATÉRIAUX -->
  <div class="section">
    <div class="section-title">Matériaux utilisés</div>
    <div class="materials-box">
      ${data.materiaux && data.materiaux.trim()
        ? data.materiaux
        : '<span class="materials-empty">Aucun matériau spécifié</span>'
      }
    </div>
  </div>

  <!-- SIGNATURE -->
  ${data.signature ? `
  <div class="signature-row">
    <div class="signature-block">
      <div class="signature-label">Signature du responsable</div>
      <div class="signature-img-wrap">
        <img src="${data.signature}" alt="Signature" class="signature-img">
      </div>
      <div class="signature-name">${data.nomSignataire || ''}</div>
      ${dateSignatureFormatee ? `<div class="signature-date">Le ${dateSignatureFormatee}</div>` : ''}
    </div>
  </div>
  ` : ''}

</div>

<!-- FOOTER -->
<div class="footer">
  <span>${nomEntreprise ? `${nomEntreprise} — ` : ''}Bon de régie n° ${data.id}</span>
  <span>Document généré le ${dateGeneration}</span>
</div>

</body>
</html>`
}

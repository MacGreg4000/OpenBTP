import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

const HEADER_BG = 'FF1F2937'
const HEADER_FG = 'FFFFFFFF'

function applyHeaderStyle(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: HEADER_FG } }
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: HEADER_BG },
  }
  row.alignment = { vertical: 'middle' }
}

// GET /api/crm/export - Export Excel de tous les prospects
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer toutes les entreprises avec leurs contacts
    const entreprises = await prisma.prospectEntreprise.findMany({
      orderBy: { nom: 'asc' },
      include: { contacts: true },
    })

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'OpenBTP'
    workbook.created = new Date()

    // ── Sheet 1 : Entreprises ────────────────────────────────────────────────
    const wsEntreprises = workbook.addWorksheet('Entreprises')

    wsEntreprises.columns = [
      { header: 'id',         key: 'id',         width: 20 },
      { header: 'nom',        key: 'nom',         width: 30 },
      { header: 'type',       key: 'type',        width: 20 },
      { header: 'adresse',    key: 'adresse',     width: 40 },
      { header: 'codePostal', key: 'codePostal',  width: 12 },
      { header: 'ville',      key: 'ville',       width: 20 },
      { header: 'pays',       key: 'pays',        width: 20 },
      { header: 'telephone',  key: 'telephone',   width: 20 },
      { header: 'email',      key: 'email',       width: 30 },
      { header: 'siteWeb',    key: 'siteWeb',     width: 30 },
      { header: 'notes',      key: 'notes',       width: 50 },
    ]

    applyHeaderStyle(wsEntreprises.getRow(1))
    wsEntreprises.views = [{ state: 'frozen', ySplit: 1 }]
    wsEntreprises.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: wsEntreprises.columns.length },
    }

    for (const e of entreprises) {
      wsEntreprises.addRow({
        id:         e.id,
        nom:        e.nom,
        type:       e.type ?? '',
        adresse:    e.adresse ?? '',
        codePostal: e.codePostal ?? '',
        ville:      e.ville ?? '',
        pays:       e.pays ?? '',
        telephone:  e.telephone ?? '',
        email:      e.email ?? '',
        siteWeb:    e.siteWeb ?? '',
        notes:      e.notes ?? '',
      })
    }

    // ── Sheet 2 : Contacts ───────────────────────────────────────────────────
    const wsContacts = workbook.addWorksheet('Contacts')

    wsContacts.columns = [
      { header: 'id',            key: 'id',            width: 20 },
      { header: 'entrepriseId',  key: 'entrepriseId',  width: 20 },
      { header: 'entrepriseNom', key: 'entrepriseNom', width: 30 },
      { header: 'prenom',        key: 'prenom',        width: 20 },
      { header: 'nom',           key: 'nom',           width: 20 },
      { header: 'role',          key: 'role',          width: 20 },
      { header: 'telephone',     key: 'telephone',     width: 20 },
      { header: 'mobile',        key: 'mobile',        width: 20 },
      { header: 'email',         key: 'email',         width: 30 },
      { header: 'notes',         key: 'notes',         width: 50 },
    ]

    applyHeaderStyle(wsContacts.getRow(1))
    wsContacts.views = [{ state: 'frozen', ySplit: 1 }]
    wsContacts.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: wsContacts.columns.length },
    }

    for (const e of entreprises) {
      for (const c of e.contacts) {
        wsContacts.addRow({
          id:            c.id,
          entrepriseId:  c.entrepriseId,
          entrepriseNom: e.nom,
          prenom:        c.prenom ?? '',
          nom:           c.nom,
          role:          c.role ?? '',
          telephone:     c.telephone ?? '',
          mobile:        c.mobile ?? '',
          email:         c.email ?? '',
          notes:         c.notes ?? '',
        })
      }
    }

    // ── Génération du buffer et réponse ─────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer()
    const uint8Array = new Uint8Array(buffer)

    const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const filename = `CRM-Prospects-${dateStr}.xlsx`

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Erreur GET /api/crm/export:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'export Excel" },
      { status: 500 }
    )
  }
}

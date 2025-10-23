import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import ExcelJS from 'exceljs'

// GET - Export Excel du journal
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est manager ou admin
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const ouvrierId = searchParams.get('ouvrierId')
    const mois = searchParams.get('mois') // Format YYYY-MM

    const whereClause: any = {}

    if (ouvrierId) {
      whereClause.ouvrierId = ouvrierId
    }

    if (mois) {
      const startDate = new Date(mois + '-01')
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)
      whereClause.date = {
        gte: startDate,
        lte: endDate
      }
    }

    const journalEntries = await prisma.journalOuvrier.findMany({
      where: whereClause,
      include: {
        chantier: {
          select: {
            chantierId: true,
            nomChantier: true
          }
        },
        ouvrier: {
          select: {
            nom: true,
            prenom: true
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { heureDebut: 'asc' }
      ]
    })

    // Créer le fichier Excel
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Journal Ouvrier')

    // En-têtes
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Ouvrier', key: 'ouvrier', width: 20 },
      { header: 'Heure Début', key: 'heureDebut', width: 12 },
      { header: 'Heure Fin', key: 'heureFin', width: 12 },
      { header: 'Chantier', key: 'chantier', width: 25 },
      { header: 'Lieu Libre', key: 'lieuLibre', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Photos', key: 'photos', width: 10 },
      { header: 'Validé', key: 'estValide', width: 10 }
    ]

    // Style des en-têtes
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    }

    // Données
    journalEntries.forEach(entry => {
      const photos = entry.photos ? JSON.parse(entry.photos as string) : []
      worksheet.addRow({
        date: entry.date.toLocaleDateString('fr-FR'),
        ouvrier: `${entry.ouvrier.prenom} ${entry.ouvrier.nom}`,
        heureDebut: entry.heureDebut,
        heureFin: entry.heureFin,
        chantier: entry.chantier ? `${entry.chantier.nomChantier} (${entry.chantier.chantierId})` : '',
        lieuLibre: entry.lieuLibre || '',
        description: entry.description,
        photos: photos.length,
        estValide: entry.estValide ? 'Oui' : 'Non'
      })
    })

    // Auto-fit des colonnes
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15)
    })

    // Générer le buffer
    const buffer = await workbook.xlsx.writeBuffer()
    
    // Nom du fichier
    const dateStr = mois || new Date().toISOString().slice(0, 7)
    const filename = `Journal_Ouvrier_${dateStr}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Erreur lors de l\'export Excel:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export Excel' },
      { status: 500 }
    )
  }
}

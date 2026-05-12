import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

// POST /api/crm/import - Import/fusion de prospects depuis un fichier Excel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Lire le fichier uploadé
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = new ExcelJS.Workbook()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(Buffer.from(arrayBuffer) as any)

    const entreprisesStats = { created: 0, updated: 0, errors: 0 }
    const contactsStats    = { created: 0, updated: 0, errors: 0 }

    // Helper – valeur de cellule sûre
    const cellStr = (row: ExcelJS.Row, n: number): string =>
      (row.getCell(n).value ?? '').toString().trim()

    // Inclure un champ dans le payload seulement s'il n'est pas vide
    function nonEmpty(val: string): string | undefined {
      return val.length > 0 ? val : undefined
    }

    // ── Traitement sheet "Entreprises" ───────────────────────────────────────
    const wsEntreprises = workbook.getWorksheet('Entreprises')
    if (wsEntreprises) {
      // Construire un Map nom → id pour la résolution par nom
      const existing = await prisma.prospectEntreprise.findMany({
        select: { id: true, nom: true },
      })
      const byNom = new Map(existing.map((e) => [e.nom.toLowerCase(), e.id]))

      wsEntreprises.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return // Ignorer l'en-tête
        ;(async () => {
          try {
            const id         = cellStr(row, 1)
            const nom        = cellStr(row, 2)
            const type       = cellStr(row, 3)
            const adresse    = cellStr(row, 4)
            const codePostal = cellStr(row, 5)
            const ville      = cellStr(row, 6)
            const pays       = cellStr(row, 7)
            const telephone  = cellStr(row, 8)
            const email      = cellStr(row, 9)
            const siteWeb    = cellStr(row, 10)
            const notes      = cellStr(row, 11)

            // Construire le payload avec uniquement les champs non vides
            const updateData: Record<string, string> = {}
            if (nonEmpty(nom))        updateData.nom        = nom
            if (nonEmpty(type))       updateData.type       = type
            if (nonEmpty(adresse))    updateData.adresse    = adresse
            if (nonEmpty(codePostal)) updateData.codePostal = codePostal
            if (nonEmpty(ville))      updateData.ville      = ville
            if (nonEmpty(pays))       updateData.pays       = pays
            if (nonEmpty(telephone))  updateData.telephone  = telephone
            if (nonEmpty(email))      updateData.email      = email
            if (nonEmpty(siteWeb))    updateData.siteWeb    = siteWeb
            if (nonEmpty(notes))      updateData.notes      = notes

            // Cas 1 : id connu → mise à jour
            if (id) {
              const exists = await prisma.prospectEntreprise.findUnique({
                where: { id },
                select: { id: true },
              })
              if (exists) {
                await prisma.prospectEntreprise.update({
                  where: { id },
                  data: updateData,
                })
                entreprisesStats.updated++
                byNom.set((updateData.nom ?? nom).toLowerCase(), id)
                return
              }
            }

            // Cas 2 : correspondance par nom (insensible à la casse)
            if (nom) {
              const matchId = byNom.get(nom.toLowerCase())
              if (matchId) {
                await prisma.prospectEntreprise.update({
                  where: { id: matchId },
                  data: updateData,
                })
                entreprisesStats.updated++
                return
              }
            }

            // Cas 3 : création
            if (!nom) {
              entreprisesStats.errors++
              return
            }
            const created = await prisma.prospectEntreprise.create({
              data: {
                nom,
                type:       nonEmpty(type)       ?? 'AUTRE',
                adresse:    nonEmpty(adresse)     ?? null,
                codePostal: nonEmpty(codePostal)  ?? null,
                ville:      nonEmpty(ville)       ?? null,
                pays:       nonEmpty(pays)        ?? 'Belgique',
                telephone:  nonEmpty(telephone)   ?? null,
                email:      nonEmpty(email)       ?? null,
                siteWeb:    nonEmpty(siteWeb)     ?? null,
                notes:      nonEmpty(notes)       ?? null,
              },
            })
            byNom.set(nom.toLowerCase(), created.id)
            entreprisesStats.created++
          } catch {
            entreprisesStats.errors++
          }
        })()
      })
    }

    // ── Traitement sheet "Contacts" ──────────────────────────────────────────
    const wsContacts = workbook.getWorksheet('Contacts')
    if (wsContacts) {
      const rows: ExcelJS.Row[] = []
      wsContacts.eachRow((row, rowNumber) => {
        if (rowNumber > 1) rows.push(row)
      })

      for (const row of rows) {
        try {
          const id           = cellStr(row, 1)
          const entrepriseId = cellStr(row, 2)
          // colonne 3 = entrepriseNom (ignorée à l'import)
          const prenom    = cellStr(row, 4)
          const nom       = cellStr(row, 5)
          const role      = cellStr(row, 6)
          const telephone = cellStr(row, 7)
          const mobile    = cellStr(row, 8)
          const email     = cellStr(row, 9)
          const notes     = cellStr(row, 10)

          // Résoudre entrepriseId
          if (!entrepriseId) {
            contactsStats.errors++
            continue
          }
          const entrepriseExists = await prisma.prospectEntreprise.findUnique({
            where: { id: entrepriseId },
            select: { id: true },
          })
          if (!entrepriseExists) {
            contactsStats.errors++
            continue
          }

          // Payload mise à jour (champs non vides seulement)
          const updateData: Record<string, string> = {}
          if (nonEmpty(prenom))    updateData.prenom    = prenom
          if (nonEmpty(nom))       updateData.nom       = nom
          if (nonEmpty(role))      updateData.role      = role
          if (nonEmpty(telephone)) updateData.telephone = telephone
          if (nonEmpty(mobile))    updateData.mobile    = mobile
          if (nonEmpty(email))     updateData.email     = email
          if (nonEmpty(notes))     updateData.notes     = notes

          // Cas 1 : id fourni et existant → mise à jour
          if (id) {
            const exists = await prisma.prospectContact.findUnique({
              where: { id },
              select: { id: true },
            })
            if (exists) {
              await prisma.prospectContact.update({
                where: { id },
                data: updateData,
              })
              contactsStats.updated++
              continue
            }
          }

          // Cas 2 : entrepriseId + email correspondant → mise à jour
          if (email) {
            const match = await prisma.prospectContact.findFirst({
              where: { entrepriseId, email },
              select: { id: true },
            })
            if (match) {
              await prisma.prospectContact.update({
                where: { id: match.id },
                data: updateData,
              })
              contactsStats.updated++
              continue
            }
          }

          // Cas 3 : création
          if (!nom) {
            contactsStats.errors++
            continue
          }
          await prisma.prospectContact.create({
            data: {
              entrepriseId,
              prenom:    nonEmpty(prenom)    ?? null,
              nom,
              role:      nonEmpty(role)      ?? null,
              telephone: nonEmpty(telephone) ?? null,
              mobile:    nonEmpty(mobile)    ?? null,
              email:     nonEmpty(email)     ?? null,
              notes:     nonEmpty(notes)     ?? null,
            },
          })
          contactsStats.created++
        } catch {
          contactsStats.errors++
        }
      }
    }

    return NextResponse.json({
      success: true,
      entreprises: entreprisesStats,
      contacts: contactsStats,
    })
  } catch (error) {
    console.error('Erreur POST /api/crm/import:', error)
    return NextResponse.json(
      { error: "Erreur lors de l'import Excel" },
      { status: 500 }
    )
  }
}

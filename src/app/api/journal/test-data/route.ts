import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma/client'

// POST - Créer des données de test pour le journal
export async function POST(_request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Récupérer un ouvrier existant
    const ouvrier = await prisma.ouvrierInterne.findFirst()
    if (!ouvrier) {
      return NextResponse.json({ error: 'Aucun ouvrier trouvé' }, { status: 404 })
    }

    // Récupérer un chantier existant
    const chantier = await prisma.chantier.findFirst({
      where: {
        statut: {
          in: ['EN_PREPARATION', 'EN_COURS']
        }
      }
    })

    // Créer des entrées de test pour les 3 derniers mois
    const testEntries = []
    const now = new Date()
    
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const testMonth = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
      const monthName = testMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      
      console.log(`📅 Création données pour: ${monthName}`)
      
      // Créer 3-5 entrées par mois sur des jours différents
      const entriesPerMonth = Math.floor(Math.random() * 3) + 3
      const usedDays = new Set()
      
      for (let i = 0; i < entriesPerMonth; i++) {
        let day
        do {
          day = Math.floor(Math.random() * 28) + 1 // Jours 1-28 pour éviter les problèmes de fin de mois
        } while (usedDays.has(day))
        usedDays.add(day)
        
        const entryDate = new Date(testMonth.getFullYear(), testMonth.getMonth(), day)
        
        // Éviter les weekends
        if (entryDate.getDay() === 0 || entryDate.getDay() === 6) continue
        
        const modifiableJusquA = new Date()
        modifiableJusquA.setHours(modifiableJusquA.getHours() + 48)

        testEntries.push({
          ouvrierId: ouvrier.id,
          date: entryDate,
          heureDebut: '08:00',
          heureFin: '17:00',
          chantierId: chantier?.chantierId || null,
          lieuLibre: chantier ? null : 'Formation sécurité',
          description: `Activité test du ${entryDate.toLocaleDateString('fr-FR')} (${monthName}) - ${Math.random() > 0.5 ? 'Travail sur chantier' : 'Formation'}`,
          estValide: Math.random() > 0.3, // 70% validées
          modifiableJusquA
        })
      }
    }

    // Afficher un résumé des mois créés
    const monthsCreated = [...new Set(testEntries.map(entry => 
      entry.date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    ))]
    console.log(`📊 Mois créés: ${monthsCreated.join(', ')}`)

    // Insérer toutes les entrées
    const createdEntries = await prisma.journalOuvrier.createMany({
      data: testEntries,
      skipDuplicates: true
    })

    console.log(`✅ ${createdEntries.count} entrées de test créées`)

    return NextResponse.json({ 
      message: `${createdEntries.count} entrées de test créées sur ${monthsCreated.length} mois`,
      count: createdEntries.count,
      months: monthsCreated
    })
  } catch (error) {
    console.error('Erreur lors de la création des données de test:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création des données de test' },
      { status: 500 }
    )
  }
}

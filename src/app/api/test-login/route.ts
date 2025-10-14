import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Utilise le client Prisma centralisé

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔑 Test de connexion pour:', email)
    
    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        password: true, 
        role: true 
      }
    })
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé')
      return NextResponse.json({ 
        success: false, 
        error: 'Utilisateur non trouvé' 
      }, { status: 401 })
    }
    
    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password)
    
    if (!isValid) {
      console.log('❌ Mot de passe incorrect')
      return NextResponse.json({ 
        success: false, 
        error: 'Mot de passe incorrect' 
      }, { status: 401 })
    }
    
    console.log('✅ Authentification réussie pour:', user.email)
    
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
    
  } catch (error) {
    console.error('Erreur test-login:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur serveur' 
    }, { status: 500 })
  }
} 
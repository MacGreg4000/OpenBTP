import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const res = NextResponse.json({ success: true })
    
    // Supprimer le cookie portalSession
    res.cookies.set('portalSession', '', {
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0, // Expire immédiatement
    })
    
    return res
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error)
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 })
  }
}

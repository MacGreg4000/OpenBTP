import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

const handler = NextAuth(authOptions)

// Wrapper pour gérer les erreurs et logger les problèmes
export async function GET(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  try {
    return await handler(req, context)
  } catch (error) {
    console.error('❌ [NextAuth] Erreur GET /api/auth:', error)
    // Ne pas rediriger ici, laisser NextAuth gérer
    return handler(req, context)
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  try {
    return await handler(req, context)
  } catch (error) {
    console.error('❌ [NextAuth] Erreur POST /api/auth:', error)
    // Ne pas rediriger ici, laisser NextAuth gérer
    return handler(req, context)
  }
} 
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma/client'
import bcrypt from 'bcryptjs'
// Remplacement de l'enum Prisma par une union locale pour éviter les erreurs d'export
type User_role = 'ADMIN' | 'MANAGER' | 'USER' | 'OUVRIER' | 'SOUSTRAITANT'

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
       async authorize(credentials) {
         if (!credentials?.email || !credentials?.password) {
           return null
         }
         const user = await prisma.user.findUnique({ where: { email: credentials.email } })
         if (!user) return null
         const isValid = await bcrypt.compare(credentials.password, user.password)
         if (!isValid) return null
         return { id: user.id, email: user.email, name: user.name, role: user.role }
       }
    })
  ],
  pages: {
    signIn: '/login',
    error: '/login' // Rediriger les erreurs vers la page de login
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 heures au lieu de 30 jours
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 heures
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { id: string; role?: User_role | string }
        ;(token as Record<string, unknown>).id = u.id
        ;(token as Record<string, unknown>).role = (u.role as User_role) ?? undefined
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = (token as Record<string, unknown>).id as string
        session.user.role = (token as Record<string, unknown>).role as User_role
      }
      return session
    },
    redirect: async ({ url, baseUrl }) => {
      // Utiliser NEXTAUTH_URL si disponible, sinon baseUrl
      const finalBaseUrl = process.env.NEXTAUTH_URL || baseUrl
      
      if (url.includes('callbackUrl=')) {
        const callbackUrl = new URL(url).searchParams.get('callbackUrl')
        if (callbackUrl && callbackUrl.startsWith('/')) {
          return `${finalBaseUrl}${callbackUrl}`
        }
      }
      if (url.startsWith(finalBaseUrl)) return url
      if (url.startsWith(baseUrl)) return url.replace(baseUrl, finalBaseUrl)
      if (url.startsWith('/')) return `${finalBaseUrl}${url}`
      return `${finalBaseUrl}/dashboard`
    }
  },
  // Events silencieux pour éviter le spam terminal en dev
  events: {
    signIn: async () => {},
    signOut: async () => {},
    session: async () => {},
  },
  debug: false,
  secret: process.env.NEXTAUTH_SECRET
} 
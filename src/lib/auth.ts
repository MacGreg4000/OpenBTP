import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma/client'
import bcrypt from 'bcryptjs'
// Remplacement de l'enum Prisma par une union locale pour éviter les erreurs d'export
type User_role = 'ADMIN' | 'MANAGER' | 'USER' | 'OUVRIER' | 'SOUSTRAITANT'

export const authOptions: AuthOptions = {
  // Forcer l'utilisation de NEXTAUTH_URL en production
  // Note: trustHost n'est pas disponible dans NextAuth 4.24.11, mais le callback redirect gère cela
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
    error: '/login', // Rediriger les erreurs vers la page de login (pas reset-password)
    signOut: '/login' // Rediriger après déconnexion vers login
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
      // TOUJOURS utiliser NEXTAUTH_URL en priorité, surtout en production
      // Ignorer baseUrl qui peut être détecté incorrectement par les headers du reverse proxy
      let finalBaseUrl = process.env.NEXTAUTH_URL
      
      // Si NEXTAUTH_URL n'est pas défini, utiliser baseUrl mais le nettoyer
      if (!finalBaseUrl) {
        finalBaseUrl = baseUrl
        // En production, forcer HTTPS
        if (process.env.NODE_ENV === 'production' && finalBaseUrl.startsWith('http://')) {
          finalBaseUrl = finalBaseUrl.replace('http://', 'https://')
        }
      }
      
      // Forcer HTTPS en production si l'URL commence par http://
      if (process.env.NODE_ENV === 'production' && finalBaseUrl.startsWith('http://')) {
        finalBaseUrl = finalBaseUrl.replace('http://', 'https://')
      }
      
      // S'assurer que finalBaseUrl utilise HTTPS en production
      if (process.env.NODE_ENV === 'production' && !finalBaseUrl.startsWith('https://')) {
        // Si on est en production mais que l'URL n'est pas HTTPS, essayer de la convertir
        if (finalBaseUrl.includes('secotech.synology.me') || finalBaseUrl.includes('openbtp')) {
          finalBaseUrl = finalBaseUrl.replace(/^http:\/\//, 'https://')
        }
      }
      
      // EMPÊCHER toute redirection vers /reset-password
      if (url.includes('/reset-password') || url.includes('reset-password')) {
        console.warn('⚠️ [NextAuth] Tentative de redirection vers /reset-password bloquée, redirection vers /login')
        return `${finalBaseUrl}/login`
      }
      
      // Nettoyer l'URL d'entrée pour s'assurer qu'elle utilise le bon protocole
      if (url.startsWith('http://') && process.env.NODE_ENV === 'production') {
        url = url.replace('http://', 'https://')
      }
      
      // Nettoyer baseUrl s'il contient http:// en production
      if (baseUrl.startsWith('http://') && process.env.NODE_ENV === 'production') {
        baseUrl = baseUrl.replace('http://', 'https://')
      }
      
      if (url.includes('callbackUrl=')) {
        try {
          const urlObj = new URL(url, finalBaseUrl)
          const callbackUrl = urlObj.searchParams.get('callbackUrl')
          // EMPÊCHER callbackUrl vers /reset-password
          if (callbackUrl && callbackUrl.includes('/reset-password')) {
            console.warn('⚠️ [NextAuth] CallbackUrl vers /reset-password bloqué, redirection vers /login')
            return `${finalBaseUrl}/login`
          }
          if (callbackUrl && callbackUrl.startsWith('/')) {
            return `${finalBaseUrl}${callbackUrl}`
          }
        } catch {
          // Si l'URL est relative, extraire le callbackUrl manuellement
          const match = url.match(/callbackUrl=([^&]+)/)
          if (match && match[1]) {
            const decoded = decodeURIComponent(match[1])
            // EMPÊCHER callbackUrl vers /reset-password
            if (decoded.includes('/reset-password')) {
              console.warn('⚠️ [NextAuth] CallbackUrl décodé vers /reset-password bloqué, redirection vers /login')
              return `${finalBaseUrl}/login`
            }
            if (decoded.startsWith('/')) {
              return `${finalBaseUrl}${decoded}`
            }
          }
        }
      }
      
      if (url.startsWith(finalBaseUrl)) return url
      if (url.startsWith(baseUrl)) {
        // Remplacer baseUrl par finalBaseUrl en forçant HTTPS si nécessaire
        let cleanedUrl = url.replace(baseUrl, finalBaseUrl)
        if (process.env.NODE_ENV === 'production' && cleanedUrl.startsWith('http://')) {
          cleanedUrl = cleanedUrl.replace('http://', 'https://')
        }
        return cleanedUrl
      }
      if (url.startsWith('/')) {
        // EMPÊCHER redirection directe vers /reset-password
        if (url === '/reset-password' || url.startsWith('/reset-password')) {
          console.warn('⚠️ [NextAuth] Redirection vers /reset-password bloquée, redirection vers /login')
          return `${finalBaseUrl}/login`
        }
        return `${finalBaseUrl}${url}`
      }
      return `${finalBaseUrl}/dashboard`
    }
  },
  // Events silencieux pour éviter le spam terminal en dev
  events: {
    signIn: async () => {},
    signOut: async () => {},
    session: async ({ session }) => {
      // Vérifier que la session est valide
      if (!session?.user?.id || !session?.user?.email) {
        console.warn('⚠️ [NextAuth] Session invalide détectée')
      }
    },
  },
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  // Gestion des erreurs
  logger: {
    error(code, metadata) {
      // Logger toutes les erreurs pour diagnostiquer le problème
      if (code === 'CLIENT_FETCH_ERROR') {
        console.error('❌ [NextAuth] Erreur de récupération de session - redirection vers login')
        // Vérifier si metadata est un objet avec des propriétés ou une Error
        const errorData = metadata && typeof metadata === 'object' && 'error' in metadata 
          ? (metadata as { error?: unknown; url?: string; message?: string; client?: string })
          : null
        console.error('❌ [NextAuth] Erreur:', code, {
          error: errorData?.error || metadata,
          url: errorData?.url || '/api/auth/session',
          message: errorData?.message || 'Load failed',
          client: errorData?.client || 'true'
        })
        // Ne pas propager l'erreur pour éviter la redirection vers reset-password
        return
      }
      console.error('❌ [NextAuth] Erreur:', code, metadata)
    },
    warn(code) {
      console.warn('⚠️ [NextAuth] Avertissement:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('🔍 [NextAuth] Debug:', code, metadata)
      }
    }
  }
} 
import { AuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma/client'
import bcrypt from 'bcryptjs'
// Remplacement de l'enum Prisma par une union locale pour éviter les erreurs d'export
type User_role = 'ADMIN' | 'MANAGER' | 'USER' | 'OUVRIER' | 'SOUSTRAITANT'

// Fonction pour déterminer si on doit utiliser secure pour les cookies
// Basé sur NEXTAUTH_URL ou détection automatique
function shouldUseSecureCookies(): boolean {
  const nextAuthUrl = process.env.NEXTAUTH_URL
  if (nextAuthUrl) {
    return nextAuthUrl.startsWith('https://')
  }
  // Par défaut, si NEXTAUTH_URL n'est pas défini, on assume HTTP (développement)
  return false
}

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
         try {
           console.log('🔐 [NextAuth] Tentative d\'autorisation pour:', credentials?.email ? `${credentials.email.substring(0, 3)}***` : 'email manquant')
           
           if (!credentials?.email || !credentials?.password) {
             console.log('❌ [NextAuth] Credentials manquants')
             return null
           }
           
           const user = await prisma.user.findUnique({ where: { email: credentials.email } })
           if (!user) {
             console.log('❌ [NextAuth] Utilisateur non trouvé:', credentials.email)
             return null
           }
           
           console.log('✅ [NextAuth] Utilisateur trouvé:', user.email, 'ID:', user.id)
           
           const isValid = await bcrypt.compare(credentials.password, user.password)
           if (!isValid) {
             console.log('❌ [NextAuth] Mot de passe invalide pour:', credentials.email)
             return null
           }
           
           console.log('✅ [NextAuth] Authentification réussie pour:', user.email, 'Role:', user.role)
           return { id: user.id, email: user.email, name: user.name, role: user.role }
         } catch (error) {
           console.error('❌ [NextAuth] Erreur lors de l\'autorisation:', error)
           return null
         }
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
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // secure doit être true uniquement si on est vraiment en HTTPS
        secure: shouldUseSecureCookies(),
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.callback-url'
        : 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Host-next-auth.csrf-token'
        : 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NEXTAUTH_URL?.startsWith('https://') ?? false,
      },
    },
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        const u = user as { id: string; email?: string; role?: User_role | string }
        console.log('🔑 [NextAuth] Création du token JWT pour:', u.email || 'N/A', 'ID:', u.id, 'Role:', u.role)
        ;(token as Record<string, unknown>).id = u.id
        ;(token as Record<string, unknown>).role = (u.role as User_role) ?? undefined
        if (u.email) {
          ;(token as Record<string, unknown>).email = u.email
        }
        console.log('✅ [NextAuth] Token JWT créé avec:', { id: token.id, email: (token as Record<string, unknown>).email, role: token.role })
      } else {
        console.log('🔄 [NextAuth] Rafraîchissement du token JWT existant')
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session?.user) {
        session.user.id = (token as Record<string, unknown>).id as string
        session.user.role = (token as Record<string, unknown>).role as User_role
        console.log('📋 [NextAuth] Session créée pour:', session.user.email, 'ID:', session.user.id, 'Role:', session.user.role)
      }
      return session
    },
    redirect: async ({ url, baseUrl }) => {
      // TOUJOURS utiliser NEXTAUTH_URL en priorité, surtout en production
      // Ignorer baseUrl qui peut être détecté incorrectement par les headers du reverse proxy
      let finalBaseUrl = process.env.NEXTAUTH_URL
      
      console.log('🔄 [NextAuth Redirect] URL demandée:', url)
      console.log('🔄 [NextAuth Redirect] baseUrl détecté:', baseUrl)
      console.log('🔄 [NextAuth Redirect] NEXTAUTH_URL configuré:', finalBaseUrl)
      
      // Si NEXTAUTH_URL n'est pas défini, utiliser baseUrl mais le nettoyer
      if (!finalBaseUrl) {
        console.warn('⚠️ [NextAuth Redirect] NEXTAUTH_URL non défini, utilisation de baseUrl:', baseUrl)
        finalBaseUrl = baseUrl
      }
      
      // Nettoyer finalBaseUrl pour éviter les problèmes avec www. ou autres variations
      if (finalBaseUrl) {
        try {
          const urlObj = new URL(finalBaseUrl)
          // Reconstruire l'URL sans www. si présent
          if (urlObj.hostname.startsWith('www.')) {
            urlObj.hostname = urlObj.hostname.replace(/^www\./, '')
            finalBaseUrl = urlObj.toString()
            console.log('🔧 [NextAuth Redirect] www. supprimé de NEXTAUTH_URL:', finalBaseUrl)
          }
        } catch (e) {
          console.error('❌ [NextAuth Redirect] Erreur lors du parsing de NEXTAUTH_URL:', e)
        }
      }
      
      // Ne PAS forcer HTTPS automatiquement - respecter NEXTAUTH_URL tel quel
      // Si NEXTAUTH_URL est en HTTP (IP locale), on reste en HTTP
      // Si NEXTAUTH_URL est en HTTPS (reverse proxy), on reste en HTTPS
      
      // EMPÊCHER toute redirection vers /reset-password
      if (url.includes('/reset-password') || url.includes('reset-password')) {
        console.warn('⚠️ [NextAuth] Tentative de redirection vers /reset-password bloquée, redirection vers /login')
        return `${finalBaseUrl}/login`
      }
      
      // Ne pas forcer HTTPS - respecter le protocole de NEXTAUTH_URL
      // Si on accède via IP locale (HTTP), on reste en HTTP
      // Si on accède via reverse proxy (HTTPS), on reste en HTTPS
      
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
      
      // Nettoyer l'URL d'entrée pour éviter les problèmes avec www.
      let cleanedInputUrl = url
      try {
        const inputUrlObj = new URL(url, baseUrl)
        if (inputUrlObj.hostname.startsWith('www.')) {
          inputUrlObj.hostname = inputUrlObj.hostname.replace(/^www\./, '')
          cleanedInputUrl = inputUrlObj.toString()
          console.log('🔧 [NextAuth Redirect] www. supprimé de l\'URL d\'entrée:', cleanedInputUrl)
        }
      } catch {
        // Si l'URL est relative, on la garde telle quelle
      }
      
      if (cleanedInputUrl.startsWith(finalBaseUrl)) {
        console.log('✅ [NextAuth Redirect] URL déjà correcte:', cleanedInputUrl)
        return cleanedInputUrl
      }
      
      // Nettoyer baseUrl pour éviter les problèmes avec www.
      let cleanedBaseUrl = baseUrl
      try {
        const baseUrlObj = new URL(baseUrl)
        if (baseUrlObj.hostname.startsWith('www.')) {
          baseUrlObj.hostname = baseUrlObj.hostname.replace(/^www\./, '')
          cleanedBaseUrl = baseUrlObj.toString()
          console.log('🔧 [NextAuth Redirect] www. supprimé de baseUrl:', cleanedBaseUrl)
        }
      } catch {
        // Si baseUrl est invalide, on le garde tel quel
      }
      
      if (cleanedInputUrl.startsWith(cleanedBaseUrl)) {
        // Remplacer baseUrl par finalBaseUrl sans forcer HTTPS
        let cleanedUrl = cleanedInputUrl.replace(cleanedBaseUrl, finalBaseUrl)
        console.log('✅ [NextAuth Redirect] URL nettoyée:', cleanedUrl)
        return cleanedUrl
      }
      
      if (cleanedInputUrl.startsWith('/')) {
        // EMPÊCHER redirection directe vers /reset-password
        if (cleanedInputUrl === '/reset-password' || cleanedInputUrl.startsWith('/reset-password')) {
          console.warn('⚠️ [NextAuth Redirect] Redirection vers /reset-password bloquée, redirection vers /login')
          return `${finalBaseUrl}/login`
        }
        const finalUrl = `${finalBaseUrl}${cleanedInputUrl}`
        console.log('✅ [NextAuth Redirect] URL relative construite:', finalUrl)
        return finalUrl
      }
      
      const defaultUrl = `${finalBaseUrl}/dashboard`
      console.log('✅ [NextAuth Redirect] Redirection par défaut vers:', defaultUrl)
      return defaultUrl
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
  secret: process.env.NEXTAUTH_SECRET || (() => {
    console.error('❌ [NextAuth] NEXTAUTH_SECRET n\'est pas défini! L\'authentification ne fonctionnera pas correctement.')
    return 'fallback-secret-change-in-production'
  })(),
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
      // Ignorer l'avertissement DEBUG_ENABLED qui est trop verbeux
      if (code === 'DEBUG_ENABLED') {
        return
      }
      console.warn('⚠️ [NextAuth] Avertissement:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('🔍 [NextAuth] Debug:', code, metadata)
      }
    }
  }
} 